"use client";

import { useRef, useState, useCallback } from "react";

export const WHISPER_MODELS = [
    { id: "onnx-community/whisper-tiny", label: "Tiny (~75MB)", description: "Fastest, basic accuracy" },
    { id: "onnx-community/whisper-base", label: "Base (~150MB)", description: "Good balance" },
    { id: "onnx-community/whisper-small", label: "Small (~500MB)", description: "Great accuracy" },
] as const;

export const DEFAULT_WHISPER_MODEL = "onnx-community/whisper-base";

interface UseLocalWhisperOptions {
    /** Called each time a chunk is transcribed */
    onTranscript: (text: string) => void;
    /** Whisper model to use (default: whisper-base) */
    whisperModel?: string;
    /** Audio chunk duration in seconds (default: 4) */
    chunkDurationSec?: number;
}

/**
 * Hook that manages:
 * 1. Whisper model loading via Web Worker
 * 2. Capturing PCM audio from a MediaStream (display audio)
 * 3. Feeding audio chunks to Whisper for local transcription
 */
export function useLocalWhisper({ onTranscript, whisperModel = DEFAULT_WHISPER_MODEL, chunkDurationSec = 4 }: UseLocalWhisperOptions) {
    const [isModelLoading, setIsModelLoading] = useState(false);
    const [isModelReady, setIsModelReady] = useState(false);
    const [modelProgress, setModelProgress] = useState(0);
    const [modelMessage, setModelMessage] = useState("");

    const workerRef = useRef<Worker | null>(null);
    const audioContextRef = useRef<AudioContext | null>(null);
    const processorRef = useRef<ScriptProcessorNode | null>(null);
    const sourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
    const audioBufferRef = useRef<Float32Array[]>([]);
    const isCapturingRef = useRef(false);
    const chunkTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
    const onTranscriptRef = useRef(onTranscript);
    onTranscriptRef.current = onTranscript;

    /** Initialize the Whisper worker and load the model */
    const initWhisper = useCallback((): Promise<void> => {
        return new Promise((resolve, reject) => {
            if (workerRef.current) {
                resolve();
                return;
            }

            setIsModelLoading(true);
            setModelProgress(0);
            setModelMessage("Initializing...");

            const worker = new Worker(
                new URL("@/lib/ai/whisper-worker.ts", import.meta.url),
                { type: "module" }
            );

            worker.onmessage = (event: MessageEvent) => {
                const { type } = event.data;

                if (type === "init-progress") {
                    setModelProgress(event.data.progress);
                    setModelMessage(event.data.message);
                }

                if (type === "ready") {
                    setIsModelLoading(false);
                    setIsModelReady(true);
                    setModelMessage("Ready");
                    workerRef.current = worker;
                    resolve();
                }

                if (type === "result") {
                    const text = event.data.text?.trim();
                    if (text && text !== "" && !text.match(/^\(.*\)$/) && !text.match(/^\[.*\]$/)) {
                        // Filter out Whisper hallucinations like "(silence)", "[BLANK_AUDIO]", etc.
                        onTranscriptRef.current(text);
                    }
                }

                if (type === "error") {
                    console.error("[Whisper] Error:", event.data.message);
                    setIsModelLoading(false);
                    setModelMessage(`Error: ${event.data.message}`);
                    reject(new Error(event.data.message));
                }
            };

            worker.onerror = (err) => {
                console.error("[Whisper] Worker error:", err);
                setIsModelLoading(false);
                reject(err);
            };

            worker.postMessage({ type: "init", model: whisperModel });
        });
    }, [whisperModel]);

    /**
     * Start capturing audio from a MediaStream and transcribing it locally.
     * Uses voice-activity detection on the display audio to flush chunks
     * immediately when the interviewer stops speaking (low latency).
     */
    const startCapturing = useCallback((stream: MediaStream) => {
        if (!workerRef.current || isCapturingRef.current) return;

        const audioContext = new AudioContext({ sampleRate: 16000 });
        const source = audioContext.createMediaStreamSource(stream);

        // Use ScriptProcessorNode to capture raw PCM
        // Buffer size of 4096 at 16kHz = ~256ms per callback
        const processor = audioContext.createScriptProcessor(4096, 1, 1);

        const SPEECH_THRESHOLD = 0.008; // RMS threshold to detect speech
        const SILENCE_FLUSH_MS = 500;   // Flush after 500ms of silence
        const MAX_CHUNK_SEC = 6;        // Safety: flush after 6s even if still speaking
        const MIN_AUDIO_SEC = 0.8;      // Don't send chunks shorter than 0.8s

        let wasSpeaking = false;
        let silenceStartTime: number | null = null;
        let chunkStartTime = performance.now();

        const flushBuffer = () => {
            if (audioBufferRef.current.length === 0 || !workerRef.current) return;

            const totalLength = audioBufferRef.current.reduce((acc, buf) => acc + buf.length, 0);

            // Don't send very short chunks (less than MIN_AUDIO_SEC)
            if (totalLength < 16000 * MIN_AUDIO_SEC) return;

            const merged = new Float32Array(totalLength);
            let offset = 0;
            for (const buf of audioBufferRef.current) {
                merged.set(buf, offset);
                offset += buf.length;
            }
            audioBufferRef.current = [];
            chunkStartTime = performance.now();

            // Final silence check on the whole chunk
            const rms = Math.sqrt(merged.reduce((sum, s) => sum + s * s, 0) / merged.length);
            if (rms < 0.003) return; // Pure silence, skip

            workerRef.current.postMessage(
                { type: "transcribe", audio: merged },
                [merged.buffer]
            );
        };

        processor.onaudioprocess = (e: AudioProcessingEvent) => {
            if (!isCapturingRef.current) return;
            const inputData = e.inputBuffer.getChannelData(0);
            audioBufferRef.current.push(new Float32Array(inputData));

            // Calculate RMS of this frame
            let sum = 0;
            for (let i = 0; i < inputData.length; i++) {
                sum += inputData[i] * inputData[i];
            }
            const rms = Math.sqrt(sum / inputData.length);
            const isSpeaking = rms > SPEECH_THRESHOLD;
            const now = performance.now();

            if (isSpeaking) {
                wasSpeaking = true;
                silenceStartTime = null;
            } else if (wasSpeaking) {
                // Transition from speech to silence
                if (silenceStartTime === null) {
                    silenceStartTime = now;
                } else if (now - silenceStartTime > SILENCE_FLUSH_MS) {
                    // Interviewer stopped talking — flush immediately!
                    flushBuffer();
                    wasSpeaking = false;
                    silenceStartTime = null;
                }
            }

            // Safety: flush if chunk is getting too long (continuous speech)
            if (now - chunkStartTime > MAX_CHUNK_SEC * 1000 && audioBufferRef.current.length > 0) {
                flushBuffer();
                wasSpeaking = true; // Still might be speaking
                silenceStartTime = null;
            }
        };

        source.connect(processor);
        processor.connect(audioContext.destination);

        audioContextRef.current = audioContext;
        sourceRef.current = source;
        processorRef.current = processor;
        isCapturingRef.current = true;

        console.log("[Whisper] ✅ Audio capture started (voice-activity flush)");
    }, []);

    /** Stop capturing audio */
    const stopCapturing = useCallback(() => {
        isCapturingRef.current = false;

        if (chunkTimerRef.current) {
            clearInterval(chunkTimerRef.current);
            chunkTimerRef.current = null;
        }

        processorRef.current?.disconnect();
        sourceRef.current?.disconnect();
        audioContextRef.current?.close();

        processorRef.current = null;
        sourceRef.current = null;
        audioContextRef.current = null;
        audioBufferRef.current = [];

        console.log("[Whisper] Audio capture stopped");
    }, []);

    /** Terminate the worker entirely */
    const terminate = useCallback(() => {
        stopCapturing();
        workerRef.current?.terminate();
        workerRef.current = null;
        setIsModelReady(false);
        setModelProgress(0);
        setModelMessage("");
    }, [stopCapturing]);

    return {
        initWhisper,
        startCapturing,
        stopCapturing,
        terminate,
        isModelLoading,
        isModelReady,
        modelProgress,
        modelMessage,
    };
}
