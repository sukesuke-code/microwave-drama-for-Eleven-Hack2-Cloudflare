export class AudioPlayer {
  private audioContext: AudioContext | null = null;
  private audioQueue: AudioBuffer[] = [];
  private isPlaying = false;
  private sourceNode: AudioBufferSourceNode | null = null;

  async initialize(): Promise<void> {
    if (!this.audioContext) {
      const AudioContextImpl = window.AudioContext || (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!AudioContextImpl) {
        throw new Error('Web Audio API is not supported in this browser.');
      }
      this.audioContext = new AudioContextImpl();
    }
  }

  private async decodeAudioData(base64Data: string): Promise<AudioBuffer> {
    if (!this.audioContext) {
      throw new Error('AudioContext not initialized');
    }

    const binaryString = atob(base64Data);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }

    return new Promise((resolve, reject) => {
      this.audioContext!.decodeAudioData(
        bytes.buffer,
        (audioBuffer) => {
          resolve(audioBuffer);
        },
        (error) => {
          console.error('Failed to decode audio data:', error);
          reject(error);
        }
      );
    });
  }

  queueAudio(base64Chunk: string): void {
    this.decodeAudioData(base64Chunk)
      .then((audioBuffer) => {
        this.audioQueue.push(audioBuffer);
        if (!this.isPlaying) {
          this.playNextChunk();
        }
      })
      .catch((error) => {
        console.error('Error queuing audio:', error);
      });
  }

  private async playNextChunk(): Promise<void> {
    if (this.audioQueue.length === 0) {
      this.isPlaying = false;
      return;
    }

    if (!this.audioContext) {
      await this.initialize();
    }

    this.isPlaying = true;
    const audioData = this.audioQueue.shift();

    if (!audioData || !this.audioContext) {
      this.isPlaying = false;
      return;
    }

    try {
      this.sourceNode = this.audioContext.createBufferSource();
      this.sourceNode.buffer = audioData;
      this.sourceNode.connect(this.audioContext.destination);

      this.sourceNode.onended = () => {
        this.playNextChunk();
      };

      this.sourceNode.start(0);
    } catch (error) {
      console.error('Error playing audio chunk:', error);
      this.isPlaying = false;
    }
  }

  stop(): void {
    if (this.sourceNode) {
      this.sourceNode.stop();
      this.sourceNode = null;
    }
    this.audioQueue = [];
    this.isPlaying = false;
  }

  destroy(): void {
    this.stop();
    if (this.audioContext && this.audioContext.state !== 'closed') {
      this.audioContext.close();
    }
    this.audioContext = null;
  }
}
