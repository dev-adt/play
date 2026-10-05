// Web Audio API synthesizer for realistic, responsive in-browser card game sound effects

class SoundManager {
  private ctx: AudioContext | null = null;
  private noiseBuffer: AudioBuffer | null = null;
  public isMuted: boolean = false;

  constructor() {
    // Check localStorage for mute preference
    const saved = localStorage.getItem('tienlen_muted');
    if (saved !== null) {
      this.isMuted = saved === 'true';
    }
  }

  public initCtx() {
    if (!this.ctx && typeof window !== 'undefined') {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
        this.buildNoiseBuffer();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  private buildNoiseBuffer() {
    if (!this.ctx) return;
    const bufferSize = this.ctx.sampleRate * 1; // 1 second of noise
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }
    this.noiseBuffer = buffer;
  }

  public toggleMute(): boolean {
    this.isMuted = !this.isMuted;
    localStorage.setItem('tienlen_muted', String(this.isMuted));
    return this.isMuted;
  }

  // 1. GAME START / DEAL SOUND (Bắt đầu ván & Chia bài xào xạc + Chuông bắt đầu)
  public playDeal() {
    this.playGameStart();
  }

  public playGameStart() {
    if (this.isMuted) return;
    this.initCtx();
    if (!this.ctx) return;

    const now = this.ctx.currentTime;

    // Part A: Rapid card dealing flutter (5 quick card slide snaps)
    for (let i = 0; i < 5; i++) {
      const t = now + i * 0.055;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(320 + Math.random() * 80, t);
      osc.frequency.exponentialRampToValueAtTime(100, t + 0.04);

      gain.gain.setValueAtTime(0.12, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.04);

      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(t);
      osc.stop(t + 0.045);
    }

    // Part B: Bright energetic opening fanfare (D5 -> F#5 -> A5 -> D6)
    const fanfareNotes = [587.33, 739.99, 880.0, 1174.66];
    fanfareNotes.forEach((freq, idx) => {
      const t = now + 0.28 + idx * 0.07;
      const osc = this.ctx!.createOscillator();
      const gain = this.ctx!.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, t);

      gain.gain.setValueAtTime(0.18, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.22);

      osc.connect(gain);
      gain.connect(this.ctx!.destination);
      osc.start(t);
      osc.stop(t + 0.23);
    });
  }

  // 2. PLAY CARD SOUND (Đánh bài: tiếng cạch/quật lá bài xuống mặt bàn đanh chắc)
  public playCard() {
    if (this.isMuted) return;
    this.initCtx();
    if (!this.ctx) return;

    const now = this.ctx.currentTime;
    const pitchJitter = (Math.random() - 0.5) * 40;

    // Tone thud (body contact)
    const osc = this.ctx.createOscillator();
    const oscGain = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(340 + pitchJitter, now);
    osc.frequency.exponentialRampToValueAtTime(70, now + 0.065);

    oscGain.gain.setValueAtTime(0.28, now);
    oscGain.gain.exponentialRampToValueAtTime(0.001, now + 0.07);

    osc.connect(oscGain);
    oscGain.connect(this.ctx.destination);
    osc.start(now);
    osc.stop(now + 0.075);

    // Filtered noise snap (crisp paper snap)
    if (this.noiseBuffer) {
      const noise = this.ctx.createBufferSource();
      noise.buffer = this.noiseBuffer;

      const filter = this.ctx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.setValueAtTime(1600 + pitchJitter * 5, now);
      filter.Q.setValueAtTime(2.5, now);

      const noiseGain = this.ctx.createGain();
      noiseGain.gain.setValueAtTime(0.22, now);
      noiseGain.gain.exponentialRampToValueAtTime(0.001, now + 0.045);

      noise.connect(filter);
      filter.connect(noiseGain);
      noiseGain.connect(this.ctx.destination);

      noise.start(now);
      noise.stop(now + 0.05);
    }
  }

  // 3. WIN FANFARE (Thắng ván: nhạc chiến thắng rộn rã, tiếng chuông vàng may mắn)
  public playWin() {
    if (this.isMuted) return;
    this.initCtx();
    if (!this.ctx) return;

    const now = this.ctx.currentTime;

    // Triumphant major trumpet fanfare: C5 -> E5 -> G5 -> C6 (held)
    const winMelody = [
      { f: 523.25, start: 0, dur: 0.12 },
      { f: 659.25, start: 0.12, dur: 0.12 },
      { f: 783.99, start: 0.24, dur: 0.12 },
      { f: 1046.5, start: 0.36, dur: 0.45 },
      // Second high chord burst
      { f: 1318.51, start: 0.5, dur: 0.55 },
      { f: 1567.98, start: 0.65, dur: 0.7 },
    ];

    winMelody.forEach(({ f, start, dur }) => {
      const t = now + start;
      const osc = this.ctx!.createOscillator();
      const osc2 = this.ctx!.createOscillator();
      const gain = this.ctx!.createGain();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(f, t);

      osc2.type = 'sine';
      osc2.frequency.setValueAtTime(f * 2, t); // Octave overtone

      gain.gain.setValueAtTime(0.22, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + dur);

      osc.connect(gain);
      osc2.connect(gain);
      gain.connect(this.ctx!.destination);

      osc.start(t);
      osc2.start(t);
      osc.stop(t + dur);
      osc2.stop(t + dur);
    });

    // Gold sparkle chimes at end
    const chimes = [2093.0, 2637.02, 3135.96, 4186.01];
    chimes.forEach((f, idx) => {
      const t = now + 0.75 + idx * 0.06;
      const osc = this.ctx!.createOscillator();
      const gain = this.ctx!.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(f, t);

      gain.gain.setValueAtTime(0.12, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.25);

      osc.connect(gain);
      gain.connect(this.ctx!.destination);
      osc.start(t);
      osc.stop(t + 0.25);
    });
  }

  // 4. LOSE SOUND (Thua ván: âm giai nốt giáng trầm buồn rõ nét)
  public playLose() {
    if (this.isMuted) return;
    this.initCtx();
    if (!this.ctx) return;

    const now = this.ctx.currentTime;

    // Descending melancholy minor progression: F4 -> Eb4 -> Db4 -> C4 (low slide)
    const loseNotes = [
      { f: 349.23, start: 0, dur: 0.2 },
      { f: 311.13, start: 0.2, dur: 0.2 },
      { f: 277.18, start: 0.4, dur: 0.22 },
      { f: 220.0, start: 0.62, dur: 0.6 },
    ];

    loseNotes.forEach(({ f, start, dur }) => {
      const t = now + start;
      const osc = this.ctx!.createOscillator();
      const gain = this.ctx!.createGain();

      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(f, t);
      if (start >= 0.6) {
        // Slow sad pitch slide down on the last note
        osc.frequency.exponentialRampToValueAtTime(140, t + dur);
      }

      // Soft low-pass filter to sound warm and mellow
      const filter = this.ctx!.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(500, t);

      gain.gain.setValueAtTime(0.2, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + dur);

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(this.ctx!.destination);

      osc.start(t);
      osc.stop(t + dur);
    });
  }

  // 5. DRAMATIC CHOP / HIT SOUND (Chặt heo / Hàng đùng đoàng cực mạnh)
  public playChop() {
    if (this.isMuted) return;
    this.initCtx();
    if (!this.ctx) return;

    const now = this.ctx.currentTime;
    const osc1 = this.ctx.createOscillator();
    const osc2 = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc1.type = 'sawtooth';
    osc1.frequency.setValueAtTime(220, now);
    osc1.frequency.exponentialRampToValueAtTime(50, now + 0.35);

    osc2.type = 'square';
    osc2.frequency.setValueAtTime(160, now);
    osc2.frequency.exponentialRampToValueAtTime(40, now + 0.35);

    gain.gain.setValueAtTime(0.35, now);
    gain.gain.exponentialRampToValueAtTime(0.005, now + 0.35);

    osc1.connect(gain);
    osc2.connect(gain);
    gain.connect(this.ctx.destination);

    osc1.start(now);
    osc2.start(now);
    osc1.stop(now + 0.35);
    osc2.stop(now + 0.35);
  }

  // 6. TURN ALERT TICK (Nhắc đến lượt)
  public playTick() {
    if (this.isMuted) return;
    this.initCtx();
    if (!this.ctx) return;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(880, this.ctx.currentTime);

    gain.gain.setValueAtTime(0.09, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.05);

    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start();
    osc.stop(this.ctx.currentTime + 0.05);
  }
}

export const sounds = new SoundManager();

// Automatically unlock AudioContext on first user interaction in browser
if (typeof window !== 'undefined') {
  const unlockAudio = () => {
    sounds.initCtx();
    window.removeEventListener('pointerdown', unlockAudio);
    window.removeEventListener('keydown', unlockAudio);
    window.removeEventListener('touchstart', unlockAudio);
  };
  window.addEventListener('pointerdown', unlockAudio, { passive: true });
  window.addEventListener('keydown', unlockAudio, { passive: true });
  window.addEventListener('touchstart', unlockAudio, { passive: true });
}
