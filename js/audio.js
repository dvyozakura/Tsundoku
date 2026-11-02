// 効果音と音楽はすべてWeb Audioで合成する。AudioContextは最初の操作の後に作る。
const KEY = 'tsundoku.mute';

function load() { try { return localStorage.getItem(KEY) === '1'; } catch { return false; } }
function save(v) { try { localStorage.setItem(KEY, v ? '1' : '0'); } catch { /* 保存できなくても遊べる */ } }

// 4小節ごとに進むコード。1音ずつ鳴らす静かな勉強部屋の音楽
const PROG = [
  [57, 60, 64, 69], [53, 57, 60, 65], [55, 59, 62, 67], [52, 55, 59, 64],
  [57, 60, 64, 72], [50, 53, 57, 65], [55, 59, 62, 71], [52, 56, 59, 68],
];
const MEL = [76, 0, 72, 74, 0, 76, 79, 0, 74, 0, 71, 72, 0, 67, 69, 0];

export class Sound {
  constructor() {
    this.ctx = null;
    this.muted = load();
    this.playing = false;
    this.step = 0;
    this.urgency = 0;
    this.timer = null;
    this.next = 0;
    document.addEventListener('visibilitychange', () => {
      if (!this.ctx) return;
      if (document.hidden) { this.pause(); this.ctx.suspend(); }
      else { this.ctx.resume(); if (this.want) this.startMusic(); }
    });
  }

  unlock() {
    if (!this.ctx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return;
      this.ctx = new AC();
      this.master = this.ctx.createGain();
      this.master.gain.value = this.muted ? 0 : 0.8;
      this.master.connect(this.ctx.destination);
      const len = this.ctx.sampleRate;
      this.noise = this.ctx.createBuffer(1, len, len);
      const d = this.noise.getChannelData(0);
      for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    }
    if (this.ctx.state === 'suspended') this.ctx.resume();
  }

  setMuted(v) {
    this.muted = v;
    save(v);
    if (this.master) this.master.gain.setTargetAtTime(v ? 0 : 0.8, this.ctx.currentTime, 0.02);
  }

  tone(freq, t, dur, vol, type = 'sine') {
    const o = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    o.type = type;
    o.frequency.value = freq;
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol, t + 0.008);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g).connect(this.master);
    o.start(t);
    o.stop(t + dur + 0.02);
  }

  burst(t, dur, vol, type, freq, q = 1, sweep = 0) {
    const s = this.ctx.createBufferSource();
    s.buffer = this.noise;
    s.loop = true;
    const f = this.ctx.createBiquadFilter();
    f.type = type;
    f.frequency.setValueAtTime(freq, t);
    if (sweep) f.frequency.exponentialRampToValueAtTime(sweep, t + dur);
    f.Q.value = q;
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    s.connect(f).connect(g).connect(this.master);
    s.start(t, Math.random() * 0.8);
    s.stop(t + dur + 0.02);
  }

  throwBook(power) {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    this.burst(t, 0.26, 0.2 + power * 0.2, 'bandpass', 500, 1.2, 2200);
  }

  thud(power) {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    const v = Math.min(0.7, 0.1 + power * 0.03);
    this.tone(95 + Math.random() * 30, t, 0.13, v, 'sine');
    this.burst(t, 0.07, v * 0.7, 'lowpass', 1300);
  }

  landed() {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    this.tone(880, t, 0.1, 0.09, 'triangle');
    this.tone(1320, t + 0.07, 0.15, 0.08, 'triangle');
  }

  missed() {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    this.tone(220, t, 0.24, 0.1, 'triangle');
    this.tone(174, t + 0.12, 0.3, 0.09, 'triangle');
  }

  rumble(dur, power) {
    if (!this.ctx) return;
    this.burst(this.ctx.currentTime, dur, 0.3 + power * 0.3, 'lowpass', 150, 2);
  }

  // 学校のチャイム
  chime() {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    [[64, 60, 62, 55], [55, 62, 64, 60]].flat().forEach((m, i) => {
      const f = 440 * 2 ** ((m + 12 - 69) / 12);
      this.tone(f, t + i * 0.42, 1.2, 0.22, 'sine');
      this.tone(f * 2.01, t + i * 0.42, 0.6, 0.05, 'sine');
    });
  }

  pencil() {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    this.burst(t, 0.09, 0.1, 'highpass', 3200);
  }

  stamp() {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    this.tone(150, t, 0.2, 0.5, 'sine');
    this.burst(t, 0.1, 0.3, 'lowpass', 900);
  }

  startMusic() {
    this.want = true;
    if (!this.ctx || this.playing) return;
    this.playing = true;
    this.next = this.ctx.currentTime + 0.1;
    this.timer = setInterval(() => this.schedule(), 100);
  }

  pause() {
    this.playing = false;
    clearInterval(this.timer);
  }

  stopMusic() { this.want = false; this.pause(); }

  // 本番が近いほど速くなり、途中からメロディが増える
  schedule() {
    const beat = (60 / (84 + this.urgency * 34)) / 2;
    while (this.next < this.ctx.currentTime + 0.3) {
      const s = this.step;
      const chord = PROG[Math.floor(s / 16) % PROG.length];
      const m = chord[s % 4];
      this.tone(440 * 2 ** ((m - 69) / 12), this.next, 0.5, 0.05, 'triangle');
      if (s % 8 === 0) this.tone(440 * 2 ** ((chord[0] - 12 - 69) / 12), this.next, 0.9, 0.09, 'sine');
      if (Math.floor(s / 32) % 2 === 1 && MEL[s % 16]) {
        this.tone(440 * 2 ** ((MEL[s % 16] - 69) / 12), this.next, 0.34, 0.035, 'sine');
      }
      if (this.urgency > 0.5 && s % 4 === 2) this.burst(this.next, 0.04, 0.03, 'highpass', 6000);
      this.next += beat;
      this.step++;
    }
  }
}
