/**
 * Web Speech API Voice Coach
 * Provides real-time spoken cues with strict throttling to prevent stuttering/overlap.
 */

class VoiceCoach {
  private lastSpokenTime = 0;
  private readonly throttleMs = 4000; // Strictly >= 4.0 seconds lockout between form warnings
  private enabled = true;

  setEnabled(enabled: boolean) {
    this.enabled = enabled;
  }

  speak(text: string, force = false) {
    if (!this.enabled || typeof window === 'undefined' || !('speechSynthesis' in window)) {
      return;
    }

    const now = Date.now();
    if (!force && now - this.lastSpokenTime < this.throttleMs) {
      return;
    }

    try {
      window.speechSynthesis.cancel(); // Cancel any lingering utterance
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = 1.05; // Slightly athletic cadence
      utterance.pitch = 1.0;
      utterance.lang = 'en-US';

      this.lastSpokenTime = now;
      window.speechSynthesis.speak(utterance);
    } catch {
      // Speech synthesis error caught safely
    }
  }

  speakRep(repCount: number, unit = 'reps') {
    if (unit === 'seconds') {
      if (repCount % 5 === 0) {
        this.speak(`${repCount} seconds`, true);
      }
    } else {
      this.speak(`${repCount}`, true);
    }
  }

  speakFormCue(cue: string | null) {
    if (cue) {
      this.speak(cue, false);
    }
  }

  speakEncouragement() {
    const encouragements = [
      'Awesome pace, keep going!',
      'Solid form, stay locked in!',
      'Great focus, keep breathing!',
      'Excellent depth, maintain alignment!'
    ];
    const pick = encouragements[Math.floor(Math.random() * encouragements.length)];
    this.speak(pick, true);
  }
}

export const coachVoice = new VoiceCoach();
