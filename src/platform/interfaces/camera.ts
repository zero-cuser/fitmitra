/**
 * FitMitra Platform Camera Interface
 * 
 * Abstract contract implemented by Web (getUserMedia) and Android (CameraX).
 */

export interface CameraConfig {
  facingMode?: 'user' | 'environment';
  width?: number;
  height?: number;
  fps?: number;
}

export interface ICameraProvider {
  /**
   * Initializes and starts the camera stream.
   */
  start(config?: CameraConfig): Promise<void>;

  /**
   * Stops the active camera stream and releases hardware resources.
   */
  stop(): Promise<void>;

  /**
   * Checks whether camera hardware and permissions are available.
   */
  isAvailable(): Promise<boolean>;

  /**
   * Returns current active stream or native camera handle.
   */
  getMediaStream(): unknown | null;
}
