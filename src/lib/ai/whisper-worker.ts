/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * Whisper Web Worker — runs local speech-to-text inference off the main thread.
 *
 * Messages IN:
 *   { type: "init" }                         → Load the Whisper model
 *   { type: "transcribe", audio: Float32Array } → Transcribe a chunk of 16kHz mono PCM
 *
 * Messages OUT:
 *   { type: "init-progress", progress: number, message: string }
 *   { type: "ready" }
 *   { type: "result", text: string }
 *   { type: "error", message: string }
 */

import { pipeline, type AutomaticSpeechRecognitionPipeline } from "@huggingface/transformers";

let transcriber: AutomaticSpeechRecognitionPipeline | null = null;

self.addEventListener("message", async (event: MessageEvent) => {
    const { type } = event.data;

    if (type === "init") {
        const modelId = event.data.model || "onnx-community/whisper-base";
        try {
            self.postMessage({
                type: "init-progress",
                progress: 0,
                message: "Loading Whisper model...",
            });

            transcriber = await pipeline(
                "automatic-speech-recognition",
                modelId,
                {
                    device: "webgpu",
                    dtype: "fp32",
                    progress_callback: (progress: any) => {
                        if (progress.status === "progress" && progress.progress != null) {
                            self.postMessage({
                                type: "init-progress",
                                progress: Math.round(progress.progress),
                                message: `Downloading model: ${Math.round(progress.progress)}%`,
                            });
                        } else if (progress.status === "ready") {
                            self.postMessage({
                                type: "init-progress",
                                progress: 100,
                                message: "Model loaded!",
                            });
                        }
                    },
                }
            );

            self.postMessage({ type: "ready" });
        } catch (err: any) {
            // Fallback to WASM/CPU if WebGPU isn't available
            try {
                console.warn("[Whisper Worker] WebGPU failed, falling back to WASM:", err.message);
                self.postMessage({
                    type: "init-progress",
                    progress: 50,
                    message: "WebGPU unavailable, using CPU...",
                });

                transcriber = await pipeline(
                    "automatic-speech-recognition",
                    modelId,
                    {
                        dtype: "q8",
                        progress_callback: (progress: any) => {
                            if (progress.status === "progress" && progress.progress != null) {
                                self.postMessage({
                                    type: "init-progress",
                                    progress: Math.round(progress.progress),
                                    message: `Downloading model: ${Math.round(progress.progress)}%`,
                                });
                            }
                        },
                    }
                );

                self.postMessage({ type: "ready" });
            } catch (fallbackErr: any) {
                self.postMessage({
                    type: "error",
                    message: fallbackErr.message || "Failed to load Whisper model",
                });
            }
        }
    }

    if (type === "transcribe") {
        if (!transcriber) {
            self.postMessage({ type: "error", message: "Model not loaded yet" });
            return;
        }

        try {
            const audio = event.data.audio as Float32Array;
            const result = await transcriber(audio);

            const text = Array.isArray(result) ? result[0]?.text : result.text;
            self.postMessage({ type: "result", text: text?.trim() || "" });
        } catch (err: any) {
            self.postMessage({
                type: "error",
                message: err.message || "Transcription failed",
            });
        }
    }
});
