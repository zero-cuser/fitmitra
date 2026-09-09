// Web Speech Synthesis API Coach
class VoiceCoach {
  constructor() {
    this.enabled = true;
    this.lastSpoken = 0;
    this.throttleMs = 4000; // brief throttling (max once per 4 seconds)
  }

  toggle(enabled) {
    this.enabled = enabled;
    if (!enabled && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
  }

  speak(text, priority = false) {
    if (!this.enabled || !('speechSynthesis' in window) || !text) return;

    const now = Date.now();
    if (!priority && now - this.lastSpoken < this.throttleMs) {
      return;
    }

    try {
      window.speechSynthesis.cancel(); // cancel previous queued utterance
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = 1.05; // brisk athletic coach pace
      utterance.pitch = 1.0;
      utterance.volume = 0.95;

      this.lastSpoken = now;
      window.speechSynthesis.speak(utterance);
    } catch (e) {
      console.warn("Speech synthesis error", e);
    }
  }

  speakRep(count, unit = 'rep') {
    if (unit === 'seconds') {
      this.speak(`${count} seconds!`, true);
    } else {
      this.speak(`${count}!`, true);
    }
  }

  speakFormCue(cue) {
    // Throttled form cue
    this.speak(cue, false);
  }

  speakEncouragement() {
    const encouragements = [
      "Good depth!",
      "Chest up, perfect form!",
      "Looking strong, keep moving!",
      "Keep your back straight!",
      "Stay tight, great pace!",
      "Power through!"
    ];
    const pick = encouragements[Math.floor(Math.random() * encouragements.length)];
    this.speak(pick, false);
  }
}

export const coachVoice = new VoiceCoach();
