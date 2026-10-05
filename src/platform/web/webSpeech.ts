/**
 * Web Implementation of ISpeechProvider
 * 
 * Backed by Web Speech API synthesis in voiceCoach.ts.
 */

import type { ISpeechProvider } from '../interfaces/speech.ts';
import { coachVoice } from '../../utils/voiceCoach.ts';

export class WebSpeechProvider implements ISpeechProvider {
  async speak(text: string, priority = false): Promise<void> {
    coachVoice.speak(text, priority);
  }

  cancel(): void {
    coachVoice.cancel();
  }

  setEnabled(enabled: boolean): void {
    coachVoice.setEnabled(enabled);
  }

  isEnabled(): boolean {
    return coachVoice.isEnabled();
  }
}
