/**
 * FitMitra Platform Speech Synthesis Provider Interface
 * 
 * Abstract contract implemented by Web (window.speechSynthesis) and Android (TextToSpeech).
 */

export interface ISpeechProvider {
  /**
   * Enqueues or immediately speaks verbal feedback.
   */
  speak(text: string, priority?: boolean): Promise<void>;

  /**
   * Cancels in-progress or queued speech utterances.
   */
  cancel(): void;

  /**
   * Toggles speech coach enabled state.
   */
  setEnabled(enabled: boolean): void;

  /**
   * Returns current speech coach enabled state.
   */
  isEnabled(): boolean;
}
