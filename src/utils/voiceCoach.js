// Web Speech Synthesis API Coach
class VoiceCoach {
  constructor() {
    this.enabled = true;
    this.lastSpoken = 0;
    this.throttleMs = 2500; // avoid spamming voice cues
  }

  toggle(enabled) {
    this.enabled = enabled;
    if (!enabled && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
  }

  speak(text, priority = false) {
    if (!this.enabled || !('speechSynthesis' in window)) return;

    const now = Date.now();
    if (!priority && now - this.lastSpoken < this.throttleMs) {
      return;
    }

    try {
      window.speechSynthesis.cancel(); // clear previous speech
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = 1.05; // natural brisk athletic coach pace
      utterance.pitch = 1.0;
      utterance.volume = 0.9;

      this.lastSpoken = now;
      window.speechSynthesis.speak(utterance);
    } catch (e) {
      console.warn("Speech synthesis error", e);
    }
  }

  speakRep(count) {
    this.speak(`${count}!`, true);
  }

  speakEncouragement() {
    const encouragements = [
      "Great depth!",
      "Chest up, perfect form!",
      "You got this, keep moving!",
      "Power through!",
      "Looking strong!",
      "Stay tight, great pace!"
    ];
    const pick = encouragements[Math.floor(Math.random() * encouragements.length)];
    this.speak(pick, false);
  }

  speakCorrection(cue) {
    this.speak(cue, true);
  }
}

export const coachVoice = new VoiceCoach();
