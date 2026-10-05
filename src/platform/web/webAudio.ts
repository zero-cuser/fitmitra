/**
 * Web Implementation of IAudioPlayer
 * 
 * Backed by Web Audio API synthesizers in soundEffects.ts.
 */

import type { AudioCue, IAudioPlayer } from '../interfaces/audio.ts';
import { sounds } from '../../utils/soundEffects.ts';

export class WebAudioPlayer implements IAudioPlayer {
  async playCue(cue: AudioCue): Promise<void> {
    switch (cue) {
      case 'rep_success':
        sounds.playRepSuccess();
        break;
      case 'countdown_tick':
        sounds.playTick();
        break;
      case 'workout_complete':
        sounds.playWorkoutComplete();
        break;
      case 'form_warning':
        sounds.playTick();
        break;
      case 'break_bell':
        sounds.playBreakBell();
        break;
    }
  }

  setMuted(muted: boolean): void {
    sounds.setMuted(muted);
  }

  isMuted(): boolean {
    return sounds.isMuted();
  }
}
