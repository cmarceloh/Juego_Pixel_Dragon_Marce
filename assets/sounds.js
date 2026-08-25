'use strict';

// ====================================================
// DRAGON SLAYER ADVENTURES - Motor de Audio
// Todos los sonidos generados con Web Audio API
// ====================================================

const Sound = {
  ctx: null,
  masterGain: null,
  bgActive: false,
  bgTimeout: null,
  muted: false,

  init() {
    if (this.ctx) return;
    try {
      this.ctx = new (window.AudioContext || window.webkitAudioContext)();
      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.value = 0.45;
      this.masterGain.connect(this.ctx.destination);
    } catch (e) {
      console.warn('Audio no disponible en este navegador.');
    }
  },

  resume() {
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  },

  toggleMute() {
    this.muted = !this.muted;
    if (this.masterGain) {
      this.masterGain.gain.setTargetAtTime(
        this.muted ? 0 : 0.45,
        this.ctx.currentTime, 0.05
      );
    }
    return this.muted;
  },

  // ─── Primitivas de síntesis ───────────────────────

  _tone(freq, type, dur, vol, startFreq, endFreq) {
    if (!this.ctx || !this.masterGain) return null;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.connect(gain);
    gain.connect(this.masterGain);
    osc.type = type || 'square';
    const now = this.ctx.currentTime;
    if (startFreq !== undefined) {
      osc.frequency.setValueAtTime(startFreq, now);
      osc.frequency.linearRampToValueAtTime(freq, now + dur * 0.6);
    } else {
      osc.frequency.setValueAtTime(freq, now);
    }
    if (endFreq !== undefined) {
      osc.frequency.linearRampToValueAtTime(endFreq, now + dur);
    }
    gain.gain.setValueAtTime(vol || 0.3, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + dur);
    osc.start(now);
    osc.stop(now + dur + 0.01);
    return { osc, gain };
  },

  _noise(dur, vol, lowpass) {
    if (!this.ctx || !this.masterGain) return;
    const samples = Math.floor(this.ctx.sampleRate * dur);
    const buf = this.ctx.createBuffer(1, samples, this.ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < samples; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / samples, 0.5);
    }
    const src = this.ctx.createBufferSource();
    src.buffer = buf;
    const gain = this.ctx.createGain();
    gain.gain.value = vol || 0.2;
    if (lowpass) {
      const filter = this.ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.value = lowpass;
      src.connect(filter);
      filter.connect(gain);
    } else {
      src.connect(gain);
    }
    gain.connect(this.masterGain);
    src.start();
    src.stop(this.ctx.currentTime + dur + 0.01);
  },

  // ─── Efectos de sonido ────────────────────────────

  jump() {
    if (!this.ctx) return;
    this.resume();
    this._tone(580, 'square', 0.13, 0.22, 260, 620);
  },

  doubleJump() {
    if (!this.ctx) return;
    this.resume();
    this._tone(780, 'sine', 0.1, 0.18, 400, 900);
    setTimeout(() => this._tone(1100, 'sine', 0.08, 0.12), 60);
  },

  coin() {
    if (!this.ctx) return;
    this.resume();
    this._tone(880, 'sine', 0.07, 0.28);
    setTimeout(() => this._tone(1320, 'sine', 0.12, 0.3), 65);
    setTimeout(() => this._tone(1760, 'sine', 0.1, 0.2), 130);
  },

  axeThrow() {
    if (!this.ctx) return;
    this.resume();
    this._noise(0.08, 0.15, 2000);
    this._tone(220, 'sawtooth', 0.15, 0.18, 380, 120);
  },

  axeHit() {
    if (!this.ctx) return;
    this.resume();
    this._noise(0.08, 0.25, 1500);
    this._tone(180, 'square', 0.06, 0.2);
  },

  playerHit() {
    if (!this.ctx) return;
    this.resume();
    this._tone(200, 'sawtooth', 0.22, 0.38, 380, 120);
    this._noise(0.15, 0.2, 800);
  },

  enemyDie() {
    if (!this.ctx) return;
    this.resume();
    const freqs = [440, 330, 220, 165];
    freqs.forEach((f, i) => {
      setTimeout(() => this._tone(f, 'square', 0.08, 0.22), i * 55);
    });
  },

  fireball() {
    if (!this.ctx) return;
    this.resume();
    this._tone(110, 'sawtooth', 0.22, 0.18, 200, 90);
    this._noise(0.12, 0.1, 600);
  },

  bossHit() {
    if (!this.ctx) return;
    this.resume();
    this._tone(90, 'sawtooth', 0.18, 0.45, 220, 70);
    this._noise(0.12, 0.3, 400);
  },

  bossRoar() {
    if (!this.ctx || !this.masterGain) return;
    this.resume();
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    const dist = this.ctx.createWaveShaper();
    const curve = new Float32Array(256);
    for (let i = 0; i < 256; i++) {
      const x = (i * 2) / 256 - 1;
      curve[i] = (Math.PI + 200) * x / (Math.PI + 200 * Math.abs(x));
    }
    dist.curve = curve;
    osc.connect(dist);
    dist.connect(gain);
    gain.connect(this.masterGain);
    osc.type = 'sawtooth';
    const now = this.ctx.currentTime;
    osc.frequency.setValueAtTime(55, now);
    osc.frequency.linearRampToValueAtTime(38, now + 1.0);
    gain.gain.setValueAtTime(0.6, now);
    gain.gain.linearRampToValueAtTime(0, now + 1.0);
    osc.start(now);
    osc.stop(now + 1.1);
    this._noise(0.4, 0.3, 500);
  },

  bossDie() {
    if (!this.ctx) return;
    this.resume();
    const freqs = [880, 660, 550, 440, 330, 220, 165, 110];
    freqs.forEach((f, i) => {
      setTimeout(() => {
        this._tone(f, 'sawtooth', 0.12, 0.38);
        this._noise(0.06, 0.2);
      }, i * 90);
    });
  },

  levelComplete() {
    if (!this.ctx) return;
    this.resume();
    const melody = [523, 659, 784, 1047, 784, 1047, 1319];
    melody.forEach((f, i) => {
      setTimeout(() => this._tone(f, 'sine', 0.28, 0.38), i * 110);
    });
  },

  victory() {
    if (!this.ctx) return;
    this.resume();
    const melody = [523, 523, 523, 784, 659, 523, 784, 659, 784, 1047];
    melody.forEach((f, i) => {
      setTimeout(() => this._tone(f, 'sine', 0.3, 0.45), i * 120);
    });
  },

  gameOver() {
    if (!this.ctx) return;
    this.resume();
    const melody = [440, 392, 349, 294, 247, 196, 147, 110];
    melody.forEach((f, i) => {
      setTimeout(() => this._tone(f, 'square', 0.28, 0.38), i * 140);
    });
  },

  landing() {
    if (!this.ctx) return;
    this._noise(0.04, 0.12, 1200);
  },

  bombThrow() {
    if (!this.ctx) return;
    this.resume();
    this._tone(320, 'sine', 0.14, 0.35, 180, 520);
  },

  explosion() {
    if (!this.ctx) return;
    this.resume();
    this._noise(0.42, 0.65, 220);
    this._tone(85, 'sawtooth', 0.35, 0.5, 150, 25);
  },

  lavaBurn() {
    if (!this.ctx) return;
    this.resume();
    this._noise(0.35, 0.5, 600);
    this._tone(140, 'sawtooth', 0.25, 0.4, 260, 40);
  },

  laser() {
    if (!this.ctx) return;
    this.resume();
    this._tone(880, 'sawtooth', 0.08, 0.25, 1400, 180);
  },

  inkShoot() {
    if (!this.ctx) return;
    this.resume();
    this._tone(240, 'sine', 0.12, 0.25, 120, 480);
  },

  powerUp() {
    if (!this.ctx) return;
    this.resume();
    const notes = [330, 440, 554, 659, 880];
    notes.forEach((f, i) => {
      setTimeout(() => this._tone(f, 'sine', 0.12, 0.35), i * 45);
    });
  },

  // ─── Música de fondo procedural ───────────────────

  startBgMusic(levelNum) {
    this.stopBgMusic();
    if (!this.ctx) return;

    const themes = [
      // Nivel 1 – Aldea alegre
      {
        melody: [392, 440, 494, 523, 494, 440, 392, 330, 349, 392, 440, 392],
        bass:   [196, 220, 247, 262, 247, 220, 196, 165, 175, 196, 220, 196],
        tempo: 188, waveM: 'square', waveB: 'triangle'
      },
      // Nivel 2 – Cueva misteriosa
      {
        melody: [330, 311, 294, 330, 311, 277, 294, 277, 262, 247, 262, 294],
        bass:   [165, 156, 147, 165, 156, 139, 147, 139, 131, 123, 131, 147],
        tempo: 148, waveM: 'square', waveB: 'sawtooth'
      },
      // Nivel 3 – Castillo dramático
      {
        melody: [220, 233, 247, 220, 196, 208, 220, 233, 247, 262, 247, 220],
        bass:   [110, 117, 123, 110, 98,  104, 110, 117, 123, 131, 123, 110],
        tempo: 200, waveM: 'sawtooth', waveB: 'square'
      }
    ];

    const theme = themes[Math.max(0, Math.min(2, levelNum - 1))];
    let i = 0;
    this.bgActive = true;
    const msBeat = 60000 / theme.tempo;

    const tick = () => {
      if (!this.bgActive || !this.ctx) return;
      const idx = i % theme.melody.length;
      this._tone(theme.melody[idx], theme.waveM, (msBeat / 1000) * 0.88, 0.06);
      if (idx % 2 === 0) {
        this._tone(theme.bass[idx], theme.waveB, (msBeat / 1000) * 1.8, 0.05);
      }
      i++;
      this.bgTimeout = setTimeout(tick, msBeat);
    };
    tick();
  },

  stopBgMusic() {
    this.bgActive = false;
    if (this.bgTimeout) {
      clearTimeout(this.bgTimeout);
      this.bgTimeout = null;
    }
  }
};
