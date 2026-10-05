/**
 * FitMitra Platform Audio Player Interface
 * 
 * Abstract contract implemented by Web (Web Audio API) and Android (SoundPool / AudioTrack).
 */

export type AudioCue =
  | 'rep_success'
  | 'countdown_tick'
  | 'workout_complete'
  | 'form_warning'
  | 'break_bell';

export interface IAudioPlayer {
  /**
   * Plays a designated fitness sound cue.
   */
  playCue(cue: AudioCue): Promise<void>;

  /**
   * Toggles audio mute state.
   */
  setMuted(muted: boolean): void;

  /**
   * Returns current mute status.
   */
  isMuted(): boolean;
}
