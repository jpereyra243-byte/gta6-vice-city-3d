// Audio synthesizer using Web Audio API for open-world crime game
// Generates engine rev, sirens, gunshots, tire squeals, radio beats, explosions, horn

class SoundController {
  constructor() {
    this.ctx = null;
    this.isMuted = false;
    this.engineGain = null;
    this.engineOsc = null;
    this.engineRunning = false;
    this.sirenGain = null;
    this.sirenOsc = null;
    this.sirenActive = false;
    this.radioPlaying = false;
    this.radioInterval = null;
    this.currentStation = 0;
    this.stations = ['VICE WAVE 98.5', 'NEON NIGHTS FM', 'SUNSET HIP-HOP', 'OFF'];
  }

  init() {
    if (this.ctx) return;
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) return;
    this.ctx = new AudioCtx();
  }

  resume() {
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  playGunshot(silenced = false) {
    if (!this.ctx || this.isMuted) return;
    this.resume();

    const t = this.ctx.currentTime;
    const bufferSize = this.ctx.sampleRate * (silenced ? 0.08 : 0.25);
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (silenced ? 800 : 2500));
    }

    const noise = this.ctx.createBufferSource();
    noise.buffer = buffer;

    const filter = this.ctx.createBiquadFilter();
    filter.type = silenced ? 'lowpass' : 'bandpass';
    filter.frequency.setValueAtTime(silenced ? 800 : 1800, t);
    filter.Q.setValueAtTime(silenced ? 3 : 1.5, t);

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(silenced ? 0.2 : 0.6, t);
    gain.gain.exponentialRampToValueAtTime(0.01, t + (silenced ? 0.08 : 0.25));

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(this.ctx.destination);

    noise.start(t);
  }

  playImpact() {
    if (!this.ctx || this.isMuted) return;
    this.resume();
    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(240, t);
    osc.frequency.exponentialRampToValueAtTime(40, t + 0.1);

    gain.gain.setValueAtTime(0.3, t);
    gain.gain.exponentialRampToValueAtTime(0.01, t + 0.1);

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start(t);
    osc.stop(t + 0.1);
  }

  playTireSqueal() {
    if (!this.ctx || this.isMuted) return;
    this.resume();
    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    const filter = this.ctx.createBiquadFilter();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(750 + Math.random() * 200, t);
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(800, t);
    filter.Q.setValueAtTime(6, t);

    gain.gain.setValueAtTime(0.15, t);
    gain.gain.exponentialRampToValueAtTime(0.01, t + 0.25);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start(t);
    osc.stop(t + 0.25);
  }

  playCarCrash() {
    if (!this.ctx || this.isMuted) return;
    this.resume();
    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'square';
    osc.frequency.setValueAtTime(120, t);
    osc.frequency.exponentialRampToValueAtTime(25, t + 0.35);

    gain.gain.setValueAtTime(0.6, t);
    gain.gain.exponentialRampToValueAtTime(0.01, t + 0.35);

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start(t);
    osc.stop(t + 0.35);
  }

  playHorn() {
    if (!this.ctx || this.isMuted) return;
    this.resume();
    const t = this.ctx.currentTime;
    const osc1 = this.ctx.createOscillator();
    const osc2 = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc1.type = 'sawtooth';
    osc2.type = 'sawtooth';
    osc1.frequency.setValueAtTime(420, t);
    osc2.frequency.setValueAtTime(530, t);

    gain.gain.setValueAtTime(0.2, t);
    gain.gain.linearRampToValueAtTime(0.2, t + 0.3);
    gain.gain.exponentialRampToValueAtTime(0.01, t + 0.35);

    osc1.connect(gain);
    osc2.connect(gain);
    gain.connect(this.ctx.destination);

    osc1.start(t);
    osc2.start(t);
    osc1.stop(t + 0.35);
    osc2.stop(t + 0.35);
  }

  startEngine() {
    if (!this.ctx || this.engineRunning || this.isMuted) return;
    this.resume();
    const t = this.ctx.currentTime;

    this.engineOsc = this.ctx.createOscillator();
    this.engineGain = this.ctx.createGain();

    this.engineOsc.type = 'sawtooth';
    this.engineOsc.frequency.setValueAtTime(60, t);

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(400, t);

    this.engineGain.gain.setValueAtTime(0.08, t);

    this.engineOsc.connect(filter);
    filter.connect(this.engineGain);
    this.engineGain.connect(this.ctx.destination);

    this.engineOsc.start(t);
    this.engineRunning = true;
  }

  updateEngine(speedNormalized, accelerating) {
    if (!this.engineOsc || !this.engineRunning) return;
    const targetFreq = 50 + speedNormalized * 180 + (accelerating ? 40 : 0);
    this.engineOsc.frequency.setTargetAtTime(targetFreq, this.ctx.currentTime, 0.1);
  }

  stopEngine() {
    if (!this.engineRunning || !this.engineOsc) return;
    try {
      this.engineOsc.stop();
      this.engineOsc.disconnect();
    } catch (_) {}
    this.engineRunning = false;
  }

  setSiren(active) {
    if (active === this.sirenActive) return;
    this.sirenActive = active;

    if (!active) {
      if (this.sirenOsc) {
        try {
          this.sirenOsc.stop();
          this.sirenOsc.disconnect();
        } catch (_) {}
        this.sirenOsc = null;
      }
      return;
    }

    if (!this.ctx || this.isMuted) return;
    this.resume();
    const t = this.ctx.currentTime;

    this.sirenOsc = this.ctx.createOscillator();
    this.sirenGain = this.ctx.createGain();
    this.sirenOsc.type = 'sine';

    // Yelp modulation LFO
    const lfo = this.ctx.createOscillator();
    lfo.type = 'triangle';
    lfo.frequency.setValueAtTime(1.5, t); // 1.5 Hz cycle

    const lfoGain = this.ctx.createGain();
    lfoGain.gain.setValueAtTime(260, t);

    this.sirenOsc.frequency.setValueAtTime(700, t);
    lfo.connect(this.sirenOsc.frequency);

    this.sirenGain.gain.setValueAtTime(0.09, t);
    this.sirenOsc.connect(this.sirenGain);
    this.sirenGain.connect(this.ctx.destination);

    lfo.start(t);
    this.sirenOsc.start(t);
  }

  cycleRadio() {
    this.currentStation = (this.currentStation + 1) % this.stations.length;
    if (this.stations[this.currentStation] === 'OFF') {
      this.stopRadio();
    } else {
      this.startRadio();
    }
    return this.stations[this.currentStation];
  }

  startRadio() {
    if (this.radioPlaying || !this.ctx || this.isMuted) return;
    this.resume();
    this.radioPlaying = true;
    let step = 0;
    const chords = [
      [220, 261.63, 329.63], // Am
      [174.61, 220, 261.63], // F
      [196, 246.94, 293.66], // G
      [164.81, 196, 246.94]  // Em
    ];

    this.radioInterval = setInterval(() => {
      if (!this.radioPlaying || !this.ctx) return;
      const t = this.ctx.currentTime;
      const chordIndex = Math.floor(step / 8) % chords.length;
      const note = chords[chordIndex][step % 3];

      // Synth bass/lead stab
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(note, t);

      gain.gain.setValueAtTime(0.04, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.18);

      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(t);
      osc.stop(t + 0.18);

      // Synth kick every 2 steps
      if (step % 2 === 0) {
        const kick = this.ctx.createOscillator();
        const kickGain = this.ctx.createGain();
        kick.type = 'sine';
        kick.frequency.setValueAtTime(110, t);
        kick.frequency.exponentialRampToValueAtTime(30, t + 0.12);
        kickGain.gain.setValueAtTime(0.08, t);
        kickGain.gain.exponentialRampToValueAtTime(0.001, t + 0.12);
        kick.connect(kickGain);
        kickGain.connect(this.ctx.destination);
        kick.start(t);
        kick.stop(t + 0.12);
      }

      step = (step + 1) % 32;
    }, 220);
  }

  stopRadio() {
    this.radioPlaying = false;
    if (this.radioInterval) {
      clearInterval(this.radioInterval);
      this.radioInterval = null;
    }
  }

  playMissionJingle(success = true) {
    if (!this.ctx || this.isMuted) return;
    this.resume();
    const t = this.ctx.currentTime;
    const notes = success ? [261.63, 329.63, 392.0, 523.25] : [329.63, 311.13, 293.66, 261.63];
    notes.forEach((freq, idx) => {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = success ? 'triangle' : 'sawtooth';
      osc.frequency.setValueAtTime(freq, t + idx * 0.12);
      gain.gain.setValueAtTime(0.2, t + idx * 0.12);
      gain.gain.exponentialRampToValueAtTime(0.01, t + idx * 0.12 + 0.2);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(t + idx * 0.12);
      osc.stop(t + idx * 0.12 + 0.22);
    });
  }
}

export const sound = new SoundController();
