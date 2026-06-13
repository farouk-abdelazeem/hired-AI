// PCM16 AudioWorklet Processor
// Converts Float32 audio from the browser's audio pipeline to 16-bit PCM at 16kHz
// Posts raw Int16Array buffers to the main thread (base64 encoding happens there)

class PCM16Processor extends AudioWorkletProcessor {
    constructor() {
        super();
        this._buffer = [];
        // ~100ms of audio at 16kHz = 1600 samples
        this._bufferSize = 1600;
    }

    process(inputs) {
        const input = inputs[0];
        if (!input || !input[0]) return true;

        const channelData = input[0]; // mono channel

        // Downsample from sampleRate to 16kHz
        const ratio = sampleRate / 16000;

        for (let i = 0; i < channelData.length; i += ratio) {
            const idx = Math.floor(i);
            if (idx < channelData.length) {
                // Clamp and convert Float32 [-1, 1] to Int16 [-32768, 32767]
                const sample = Math.max(-1, Math.min(1, channelData[idx]));
                const int16 = sample < 0 ? sample * 0x8000 : sample * 0x7FFF;
                this._buffer.push(int16);
            }
        }

        // When we have enough samples, send them as raw Int16Array
        if (this._buffer.length >= this._bufferSize) {
            const chunk = this._buffer.splice(0, this._bufferSize);
            const int16Array = new Int16Array(chunk);

            // Transfer the underlying ArrayBuffer to the main thread (zero-copy)
            this.port.postMessage(
                { type: 'audio', buffer: int16Array.buffer },
                [int16Array.buffer]
            );
        }

        return true;
    }
}

registerProcessor('pcm16-processor', PCM16Processor);
