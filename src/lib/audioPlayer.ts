/**
 * Seamless Web Audio API streaming player for PCM16 24kHz deltas
 * from xAI Grok Voice Realtime API.
 */

export class AudioPlayer {
  private audioContext: AudioContext | null = null;
  private analyser: AnalyserNode | null = null;
  private nextPlayTime = 0;
  private isPlaying = false;
  private activeSources: AudioBufferSourceNode[] = [];
  private onRmsCallback: ((rms: number) => void) | null = null;
  private animFrameId: number | null = null;

  constructor(onRms?: (rms: number) => void) {
    this.onRmsCallback = onRms || null;
  }

  private initContext(): AudioContext {
    if (!this.audioContext || this.audioContext.state === 'closed') {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      this.audioContext = new AudioCtx({ sampleRate: 24000 });
      this.analyser = this.audioContext.createAnalyser();
      this.analyser.fftSize = 256;
      this.analyser.connect(this.audioContext.destination);
      this.startRmsMonitoring();
    }
    if (this.audioContext.state === 'suspended') {
      this.audioContext.resume();
    }
    return this.audioContext;
  }

  playChunk(base64Pcm: string): void {
    try {
      const ctx = this.initContext();
      const pcmData = this.base64ToInt16Array(base64Pcm);
      if (pcmData.length === 0) return;

      const float32 = new Float32Array(pcmData.length);
      for (let i = 0; i < pcmData.length; i++) {
        float32[i] = pcmData[i] / 32768.0;
      }

      const audioBuffer = ctx.createBuffer(1, float32.length, 24000);
      audioBuffer.getChannelData(0).set(float32);

      const source = ctx.createBufferSource();
      source.buffer = audioBuffer;

      if (this.analyser) {
        source.connect(this.analyser);
      } else {
        source.connect(ctx.destination);
      }

      const now = ctx.currentTime;
      // Slight buffer cushion to prevent gaps between chunks
      const startTime = Math.max(now, this.nextPlayTime);
      source.start(startTime);

      this.nextPlayTime = startTime + audioBuffer.duration;
      this.isPlaying = true;
      this.activeSources.push(source);

      source.onended = () => {
        const idx = this.activeSources.indexOf(source);
        if (idx !== -1) {
          this.activeSources.splice(idx, 1);
        }
        if (this.activeSources.length === 0 && ctx.currentTime >= this.nextPlayTime - 0.05) {
          this.isPlaying = false;
        }
      };
    } catch (err) {
      console.error('[AudioPlayer] Error playing chunk:', err);
    }
  }

  private startRmsMonitoring(): void {
    if (!this.analyser) return;
    const dataArray = new Uint8Array(this.analyser.frequencyBinCount);

    const update = () => {
      if (this.analyser && (this.isPlaying || this.activeSources.length > 0)) {
        this.analyser.getByteFrequencyData(dataArray);
        let sum = 0;
        for (let i = 0; i < dataArray.length; i++) {
          sum += dataArray[i];
        }
        const avg = sum / dataArray.length;
        const normalized = Math.min(1, avg / 128);
        if (this.onRmsCallback) {
          this.onRmsCallback(normalized);
        }
      } else if (this.onRmsCallback) {
        this.onRmsCallback(0);
      }
      this.animFrameId = requestAnimationFrame(update);
    };

    this.animFrameId = requestAnimationFrame(update);
  }

  interrupt(): void {
    // Stop all playing and scheduled chunks immediately
    for (const source of this.activeSources) {
      try {
        source.stop();
        source.disconnect();
      } catch {
        // already stopped
      }
    }
    this.activeSources = [];
    if (this.audioContext) {
      this.nextPlayTime = this.audioContext.currentTime;
    }
    this.isPlaying = false;
    if (this.onRmsCallback) {
      this.onRmsCallback(0);
    }
  }

  close(): void {
    this.interrupt();
    if (this.animFrameId !== null) {
      cancelAnimationFrame(this.animFrameId);
      this.animFrameId = null;
    }
    if (this.audioContext && this.audioContext.state !== 'closed') {
      this.audioContext.close().catch(() => {});
      this.audioContext = null;
    }
  }

  get playing(): boolean {
    return this.isPlaying;
  }

  private base64ToInt16Array(base64: string): Int16Array {
    const binary = window.atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    return new Int16Array(bytes.buffer);
  }
}
