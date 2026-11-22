// Quiet Hours — sound, all procedural. No audio files ship with the game:
// every effect is a short WebAudio oscillator or filtered-noise burst made at
// run time, so the game stays silent files and zero network requests.
export class SoundFX {
  constructor() {
    this.ctx = null;
    this.master = null;
    this.muted = false;
  }

  // Created on the first user gesture; browsers refuse audio before that.
  ensure() {
    if (this.ctx) return;
    try {
      const AC = window.AudioContext || window.webkitAudioContext;
      this.ctx = new AC();
      this.master = this.ctx.createGain();
      this.master.gain.value = 0.25;
      this.master.connect(this.ctx.destination);
    } catch {
      this.ctx = null;
    }
  }

  tone(freq, dur, type = 'sine', vol = 0.5, when = 0) {
    if (!this.ctx || this.muted) return;
    const t0 = this.ctx.currentTime + when;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = type;
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(0.0001, t0);
    gain.gain.exponentialRampToValueAtTime(vol, t0 + 0.012);
    gain.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    osc.connect(gain);
    gain.connect(this.master);
    osc.start(t0);
    osc.stop(t0 + dur + 0.05);
  }

  // A soft carpeted footstep: a low, short thump, quieter while sneaking.
  footstep(sneaking) {
    this.tone(sneaking ? 90 : 120, 0.07, 'triangle', sneaking ? 0.12 : 0.22);
  }

  // Picking up an artifact: two bright notes, a little major third.
  pickup() {
    this.tone(660, 0.14, 'sine', 0.5);
    this.tone(880, 0.22, 'sine', 0.5, 0.09);
  }

  // A guard spots you: a rising sawtooth sting.
  alarm() {
    this.tone(220, 0.5, 'sawtooth', 0.3);
    this.tone(330, 0.5, 'sawtooth', 0.25, 0.08);
  }

  // Caught: a dull descending thud.
  caught() {
    this.tone(160, 0.4, 'square', 0.3);
    this.tone(110, 0.5, 'square', 0.3, 0.12);
  }

  // Reaching the exit with all three artifacts: a short rising arpeggio.
  win() {
    [523, 659, 784, 1047].forEach((f, i) => this.tone(f, 0.22, 'sine', 0.45, i * 0.11));
  }

  click() {
    this.tone(440, 0.06, 'sine', 0.3);
  }
}
