/**
 * FitMitra Platform Pose Detection Interface
 * 
 * Abstract contract implemented by Web (MediaPipe WASM) and Android (Google ML Kit Pose).
 */

import type { PoseFrame } from '../../domain/pose/poseContracts.ts';

export interface PoseDetectorOptions {
  modelComplexity?: 0 | 1 | 2;
  smoothLandmarks?: boolean;
  minDetectionConfidence?: number;
  minTrackingConfidence?: number;
}

export interface IPoseDetector {
  /**
   * Initializes the pose detection engine and loads model weights.
   */
  initialize(options?: PoseDetectorOptions): Promise<void>;

  /**
   * Processes a video frame or image buffer and returns normalized skeletal landmarks.
   */
  detect(frame: unknown): Promise<PoseFrame | null>;

  /**
   * Closes and releases model tensors and memory.
   */
  close(): Promise<void>;
}
