/**
 * Web Implementation of ICameraProvider
 * 
 * Backed by browser navigator.mediaDevices.getUserMedia.
 */

import type { CameraConfig, ICameraProvider } from '../interfaces/camera.ts';

export class WebCameraProvider implements ICameraProvider {
  private activeStream: MediaStream | null = null;

  async isAvailable(): Promise<boolean> {
    if (typeof window === 'undefined' || typeof navigator === 'undefined') {
      return false;
    }
    return Boolean(navigator.mediaDevices && navigator.mediaDevices.getUserMedia);
  }

  async start(config: CameraConfig = {}): Promise<void> {
    if (typeof window === 'undefined' || typeof navigator === 'undefined') {
      throw new Error('Camera unavailable: non-browser environment.');
    }

    const constraints: MediaStreamConstraints = {
      video: {
        facingMode: config.facingMode || 'user',
        width: { ideal: config.width || 640 },
        height: { ideal: config.height || 480 },
        frameRate: { ideal: config.fps || 30 }
      },
      audio: false
    };

    this.activeStream = await navigator.mediaDevices.getUserMedia(constraints);
  }

  async stop(): Promise<void> {
    if (this.activeStream) {
      this.activeStream.getTracks().forEach((track) => track.stop());
      this.activeStream = null;
    }
  }

  getMediaStream(): MediaStream | null {
    return this.activeStream;
  }
}
