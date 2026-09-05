/**
 * Web Audio API Sound Engine
 * External dependency-free sound synthesizer for ultra-low latency mobile playback
 */

class SoundEngine {
  constructor() {
    this.ctx = null;
    this.masterGain = null;
    this.bgmGain = null;
    this.sfxGain = null;
    this.isMuted = false;
    this.bgmInterval = null;
    this.bgmPlaying = false;
    this.bgmTempo = 130;
    this.bgmStep = 0;
  }

  init() {
    if (this.ctx) return;
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!AudioContext) return;
    this.ctx = new AudioContext();

    this.masterGain = this.ctx.createGain();
    this.masterGain.gain.value = 0.8;
    this.masterGain.connect(this.ctx.destination);

    this.sfxGain = this.ctx.createGain();
    this.sfxGain.gain.value = 0.8;
    this.sfxGain.connect(this.masterGain);

    this.bgmGain = this.ctx.createGain();
    this.bgmGain.gain.value = 0.25;
    this.bgmGain.connect(this.masterGain);
  }

  ensureContext() {
    if (!this.ctx) {
      this.init();
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  setMuted(muted) {
    this.isMuted = muted;
    if (this.masterGain) {
      this.masterGain.gain.value = muted ? 0 : 0.8;
    }
  }

  // 正解音: 高く澄んだピンポン♪
  playCorrect(isCombo = false) {
    if (this.isMuted) return;
    this.ensureContext();
    if (!this.ctx) return;

    const now = this.ctx.currentTime;
    const baseFreq = isCombo ? 660 : 523.25; // C5 or E5

    // Note 1
    const osc1 = this.ctx.createOscillator();
    const gain1 = this.ctx.createGain();
    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(baseFreq, now);
    gain1.gain.setValueAtTime(0.3, now);
    gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.18);
    osc1.connect(gain1);
    gain1.connect(this.sfxGain);
    osc1.start(now);
    osc1.stop(now + 0.18);

    // Note 2 (higher octave / major third)
    const osc2 = this.ctx.createOscillator();
    const gain2 = this.ctx.createGain();
    osc2.type = 'triangle';
    osc2.frequency.setValueAtTime(baseFreq * 1.5, now + 0.08);
    gain2.gain.setValueAtTime(0.4, now + 0.08);
    gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.32);
    osc2.connect(gain2);
    gain2.connect(this.sfxGain);
    osc2.start(now + 0.08);
    osc2.stop(now + 0.32);
  }

  // 不正解音: 激しい低周波ブザー＋クラッシュ
  playWrong() {
    if (this.isMuted) return;
    this.ensureContext();
    if (!this.ctx) return;

    const now = this.ctx.currentTime;

    // Sawtooth buzz
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(140, now);
    osc.frequency.linearRampToValueAtTime(80, now + 0.3);

    gain.gain.setValueAtTime(0.45, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);

    osc.connect(gain);
    gain.connect(this.sfxGain);
    osc.start(now);
    osc.stop(now + 0.35);

    // Dissonant tone
    const osc2 = this.ctx.createOscillator();
    const gain2 = this.ctx.createGain();
    osc2.type = 'square';
    osc2.frequency.setValueAtTime(133, now);
    gain2.gain.setValueAtTime(0.2, now);
    gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.25);
    osc2.connect(gain2);
    gain2.connect(this.sfxGain);
    osc2.start(now);
    osc2.stop(now + 0.25);
  }

  // コンボ音: 上昇アルペジオ
  playCombo(comboCount) {
    if (this.isMuted) return;
    this.ensureContext();
    if (!this.ctx) return;

    const now = this.ctx.currentTime;
    const base = 440 * Math.pow(1.06, Math.min(comboCount, 12));
    const notes = [base, base * 1.25, base * 1.5];

    notes.forEach((freq, idx) => {
      const startTime = now + idx * 0.05;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, startTime);
      gain.gain.setValueAtTime(0.3, startTime);
      gain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.15);
      osc.connect(gain);
      gain.connect(this.sfxGain);
      osc.start(startTime);
      osc.stop(startTime + 0.15);
    });
  }

  // フィーバー突入音: パワフルなキラキラ音
  playFever() {
    if (this.isMuted) return;
    this.ensureContext();
    if (!this.ctx) return;

    const now = this.ctx.currentTime;
    const freqs = [523.25, 659.25, 783.99, 1046.5, 1318.5];
    freqs.forEach((freq, i) => {
      const t = now + i * 0.05;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, t);
      gain.gain.setValueAtTime(0.35, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.25);
      osc.connect(gain);
      gain.connect(this.sfxGain);
      osc.start(t);
      osc.stop(t + 0.25);
    });
  }

  // 警告音: Emergency siren
  playWarning() {
    if (this.isMuted) return;
    this.ensureContext();
    if (!this.ctx) return;

    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(400, now);
    osc.frequency.linearRampToValueAtTime(850, now + 0.15);
    osc.frequency.linearRampToValueAtTime(400, now + 0.3);
    osc.frequency.linearRampToValueAtTime(850, now + 0.45);
    osc.frequency.linearRampToValueAtTime(400, now + 0.6);

    gain.gain.setValueAtTime(0.35, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.65);

    osc.connect(gain);
    gain.connect(this.sfxGain);
    osc.start(now);
    osc.stop(now + 0.65);
  }

  // 難問ボーナス大正解ファンファーレ
  playBonusCorrect() {
    if (this.isMuted) return;
    this.ensureContext();
    if (!this.ctx) return;

    const now = this.ctx.currentTime;
    const chords = [
      { t: 0, f: [523.25, 659.25, 783.99], d: 0.15 },
      { t: 0.15, f: [587.33, 739.99, 880], d: 0.15 },
      { t: 0.3, f: [659.25, 830.61, 987.77], d: 0.2 },
      { t: 0.5, f: [1046.5, 1318.5, 1567.98], d: 0.5 }
    ];

    chords.forEach(chord => {
      chord.f.forEach(freq => {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, now + chord.t);
        gain.gain.setValueAtTime(0.25, now + chord.t);
        gain.gain.exponentialRampToValueAtTime(0.001, now + chord.t + chord.d);
        osc.connect(gain);
        gain.connect(this.sfxGain);
        osc.start(now + chord.t);
        osc.stop(now + chord.t + chord.d);
      });
    });
  }

  // タップUI音
  playClick() {
    if (this.isMuted) return;
    this.ensureContext();
    if (!this.ctx) return;

    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(800, now);
    osc.frequency.exponentialRampToValueAtTime(200, now + 0.04);
    gain.gain.setValueAtTime(0.15, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.04);
    osc.connect(gain);
    gain.connect(this.sfxGain);
    osc.start(now);
    osc.stop(now + 0.04);
  }

  // 終了ホイッスル
  playFinish() {
    if (this.isMuted) return;
    this.ensureContext();
    if (!this.ctx) return;

    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(440, now);
    osc.frequency.exponentialRampToValueAtTime(880, now + 0.2);
    osc.frequency.linearRampToValueAtTime(440, now + 0.4);
    gain.gain.setValueAtTime(0.4, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.6);
    osc.connect(gain);
    gain.connect(this.sfxGain);
    osc.start(now);
    osc.stop(now + 0.6);
  }

  // ゲーム中BGMの開始（ハイテンポなエレクトロベースライン）
  startBGM(isFever = false) {
    if (this.isMuted || this.bgmPlaying) return;
    this.ensureContext();
    if (!this.ctx) return;

    this.bgmPlaying = true;
    this.bgmTempo = isFever ? 160 : 135;
    this.bgmStep = 0;

    const bassNotes = [110, 110, 130.81, 146.83, 110, 110, 164.81, 146.83];
    const beatInterval = 60 / this.bgmTempo / 2; // 16th/8th note

    this.bgmInterval = setInterval(() => {
      if (!this.bgmPlaying || !this.ctx || this.isMuted) return;
      const now = this.ctx.currentTime;
      const freq = bassNotes[this.bgmStep % bassNotes.length];

      // Bass synth
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = isFever ? 'sawtooth' : 'triangle';
      osc.frequency.setValueAtTime(freq * (isFever ? 1.5 : 1), now);
      gain.gain.setValueAtTime(isFever ? 0.2 : 0.15, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + beatInterval * 0.9);

      // Simple lowpass filter
      const filter = this.ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(isFever ? 1200 : 600, now);

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(this.bgmGain);

      osc.start(now);
      osc.stop(now + beatInterval * 0.9);

      // Hi-hat noise on alternating beats
      if (this.bgmStep % 2 === 1) {
        this.playHiHat(now);
      }

      this.bgmStep++;
    }, beatInterval * 1000);
  }

  playHiHat(t) {
    if (!this.ctx) return;
    const bufferSize = this.ctx.sampleRate * 0.03;
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }

    const noise = this.ctx.createBufferSource();
    noise.buffer = buffer;
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'highpass';
    filter.frequency.value = 7000;

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.06, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.03);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(this.bgmGain);
    noise.start(t);
  }

  updateBgmSpeed(isFever) {
    if (!this.bgmPlaying) return;
    this.stopBGM();
    this.startBGM(isFever);
  }

  stopBGM() {
    this.bgmPlaying = false;
    if (this.bgmInterval) {
      clearInterval(this.bgmInterval);
      this.bgmInterval = null;
    }
  }
}

export const sound = new SoundEngine();
