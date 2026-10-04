/**
 * Audio recorder for browser microphone to 24kHz 16-bit linear PCM base64
 * Compatible with xAI Grok Voice & OpenAI Realtime protocols
 */

export class AudioRecorder {
  private audioContext: AudioContext | null = null;
  private mediaStream: MediaStream | null = null;
  private processor: ScriptProcessorNode | null = null;
  private sourceNode: MediaStreamAudioSourceNode | null = null;
  private isRecording = false;

  private onChunkCallback: ((base64Pcm: string) => void) | null = null;
  private onRmsCallback: ((rms: number) => void) | null = null;

  async start(
    onChunk: (base64Pcm: string) => void,
    onRms?: (rms: number) => void
  ): Promise<void> {
    if (this.isRecording) return;

    this.onChunkCallback = onChunk;
    this.onRmsCallback = onRms || null;

    try {
      this.mediaStream = await navigator.mediaDevices.getUserMedia({
        audio: {
          channelCount: 1,
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });

      // Prefer 24000Hz if supported by browser context, or default sample rate with resampler
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      this.audioContext = new AudioCtx({ sampleRate: 24000 });

      // If browser couldn't lock to 24000, audioContext.sampleRate will reflect the actual hardware rate
      const actualSampleRate = this.audioContext.sampleRate;

      this.sourceNode = this.audioContext.createMediaStreamSource(this.mediaStream);

      // ScriptProcessor with buffer size 4096 (~85ms chunks at 48k or ~170ms at 24k)
      this.processor = this.audioContext.createScriptProcessor(4096, 1, 1);

      this.processor.onaudioprocess = (e) => {
        if (!this.isRecording) return;
        const inputData = e.inputBuffer.getChannelData(0);

        // Calculate RMS for visualizer
        let sum = 0;
        for (let i = 0; i < inputData.length; i++) {
          sum += inputData[i] * inputData[i];
        }
        const rms = Math.min(1, Math.sqrt(sum / inputData.length) * 3.5);
        if (this.onRmsCallback) {
          this.onRmsCallback(rms);
        }

        // Resample to 24000Hz if needed
        const resampled = this.resampleAudio(inputData, actualSampleRate, 24000);

        // Convert Float32Array to 16-bit linear PCM
        const pcm16 = new Int16Array(resampled.length);
        for (let i = 0; i < resampled.length; i++) {
          const s = Math.max(-1, Math.min(1, resampled[i]));
          pcm16[i] = s < 0 ? s * 0x8000 : s * 0x7fff;
        }

        // Convert Int16Array to base64
        const base64 = this.arrayBufferToBase64(pcm16.buffer);
        if (this.onChunkCallback) {
          this.onChunkCallback(base64);
        }
      };

      this.sourceNode.connect(this.processor);
      this.processor.connect(this.audioContext.destination);

      this.isRecording = true;
    } catch (err) {
      this.stop();
      throw err;
    }
  }

  stop(): void {
    this.isRecording = false;

    if (this.processor) {
      this.processor.disconnect();
      this.processor = null;
    }

    if (this.sourceNode) {
      this.sourceNode.disconnect();
      this.sourceNode = null;
    }

    if (this.mediaStream) {
      this.mediaStream.getTracks().forEach((track) => track.stop());
      this.mediaStream = null;
    }

    if (this.audioContext && this.audioContext.state !== 'closed') {
      this.audioContext.close().catch(() => {});
      this.audioContext = null;
    }

    if (this.onRmsCallback) {
      this.onRmsCallback(0);
    }
  }

  get active(): boolean {
    return this.isRecording;
  }

  private resampleAudio(
    input: Float32Array,
    fromRate: number,
    toRate: number
  ): Float32Array {
    if (fromRate === toRate) return input;
    const ratio = fromRate / toRate;
    const newLength = Math.round(input.length / ratio);
    const result = new Float32Array(newLength);
    for (let i = 0; i < newLength; i++) {
      const originalIndex = i * ratio;
      const indexFloor = Math.floor(originalIndex);
      const indexCeil = Math.min(input.length - 1, Math.ceil(originalIndex));
      const fraction = originalIndex - indexFloor;
      result[i] = input[indexFloor] * (1 - fraction) + input[indexCeil] * fraction;
    }
    return result;
  }

  private arrayBufferToBase64(buffer: ArrayBuffer): string {
    let binary = '';
    const bytes = new Uint8Array(buffer);
    const len = bytes.byteLength;
    for (let i = 0; i < len; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return window.btoa(binary);
  }
}
