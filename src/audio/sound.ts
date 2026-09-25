/** Original procedural soundtrack and effects. No remote audio or runtime network. */
export class Soundscape {
  private context: AudioContext | null = null;
  private master: GainNode | null = null;
  private timer: ReturnType<typeof setInterval> | null = null;
  private nextBeat = 0;
  private beat = 0;
  private active = true;
  muted = false;

  unlock() {
    if (!this.context) {
      this.context = new AudioContext(); this.master = this.context.createGain();
      this.master.gain.value = this.muted ? 0 : 0.34; this.master.connect(this.context.destination);
      this.nextBeat = this.context.currentTime + 0.15;
      this.timer = setInterval(() => this.schedule(), 100);
    }
    if (this.context.state === 'suspended') void this.context.resume().catch(() => undefined);
  }
  toggle() { this.muted = !this.muted; this.unlock(); if (this.master && this.context) this.master.gain.setTargetAtTime(this.muted ? 0 : 0.34, this.context.currentTime, 0.04); return this.muted; }
  setActive(active: boolean) { this.active = active; if (active && this.context) this.nextBeat = this.context.currentTime + 0.1; }

  private tone(frequency: number, time: number, duration: number, volume: number, type: OscillatorType = 'sine', endFrequency?: number) {
    if (!this.context || !this.master) return;
    const osc = this.context.createOscillator(), gain = this.context.createGain();
    osc.type = type; osc.frequency.setValueAtTime(frequency, time);
    if (endFrequency) osc.frequency.exponentialRampToValueAtTime(endFrequency, time + duration);
    gain.gain.setValueAtTime(0.0001, time); gain.gain.exponentialRampToValueAtTime(Math.max(0.0002, volume), time + 0.009);
    gain.gain.exponentialRampToValueAtTime(0.0001, time + duration);
    osc.connect(gain); gain.connect(this.master); osc.start(time); osc.stop(time + duration + 0.02);
    osc.onended = () => { osc.disconnect(); gain.disconnect(); };
  }
  private noise(duration: number, volume: number, frequency: number) {
    if (!this.context || !this.master) return;
    const t = this.context.currentTime, buffer = this.context.createBuffer(1, Math.ceil(this.context.sampleRate * duration), this.context.sampleRate);
    const data = buffer.getChannelData(0); for (let i = 0; i < data.length; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / data.length);
    const source = this.context.createBufferSource(), filter = this.context.createBiquadFilter(), gain = this.context.createGain();
    source.buffer = buffer; filter.type = 'lowpass'; filter.frequency.value = frequency;
    gain.gain.setValueAtTime(volume, t); gain.gain.exponentialRampToValueAtTime(0.0001, t + duration);
    source.connect(filter); filter.connect(gain); gain.connect(this.master); source.start();
    source.onended = () => { source.disconnect(); filter.disconnect(); gain.disconnect(); };
  }
  private schedule() {
    if (!this.context || !this.active || this.muted) { if (this.context) this.nextBeat = this.context.currentTime + 0.1; return; }
    const now = this.context.currentTime;
    if (this.nextBeat < now) this.nextBeat = now + 0.08;
    while (this.nextBeat < now + 0.22) {
      const chords = [[48, 55, 59, 64], [45, 52, 55, 60], [41, 48, 52, 57], [43, 50, 53, 59]];
      const chord = chords[Math.floor(this.beat / 16) % 4], step = this.beat % 16, t = this.nextBeat;
      const hz = (note: number) => 440 * 2 ** ((note - 69) / 12);
      if (step % 4 === 0) this.tone(hz(chord[0]), t, 0.5, 0.11, 'sine');
      if ([0, 3, 6, 8, 11, 14].includes(step)) {
        const note = chord[(step % 3) + 1] + 12;
        this.tone(hz(note), t, 0.28, 0.075, 'triangle'); this.tone(hz(note) * 2, t, 0.16, 0.012);
      }
      if ([2, 7, 10, 15].includes(step)) this.tone(hz(chord[(step + 1) % 4] + 24), t, 0.65, 0.037);
      if (step % 4 === 2) this.tone(185, t, 0.035, 0.04, 'triangle', 85);
      this.beat++; this.nextBeat += 60 / 88 / 4;
    }
  }
  play(kind: 'shot' | 'boost' | 'fish' | 'hit' | 'break' | 'wake' | 'win' | 'lose' | 'click', strength = 1) {
    if (!this.context || this.muted) return;
    const t = this.context.currentTime;
    switch (kind) {
      case 'shot': this.tone(135, t, 0.35, 0.7, 'sine', 32); this.noise(0.3, 0.48, 1100); this.meow(t + 0.06, false); break;
      case 'boost': this.noise(0.35, 0.32, 2200); this.tone(210, t, 0.23, 0.2, 'triangle', 720); this.meow(t + 0.02, false); break;
      case 'fish': [880, 1174.66, 1567.98].forEach((f, i) => this.tone(f, t + i * 0.055, 0.2, 0.17)); break;
      case 'hit': this.tone(140 + Math.random() * 100, t, 0.12, Math.min(0.34, strength * 0.024), 'triangle', 65); this.noise(0.08, Math.min(0.22, strength * 0.015), 1300); break;
      case 'break': this.noise(0.22, 0.25, 2600); this.tone(340, t, 0.11, 0.13, 'triangle', 140); break;
      case 'wake': this.meow(t, true); break;
      case 'win': [523.25, 659.25, 783.99, 1046.5].forEach((f, i) => { this.tone(f, t + i * 0.12, 0.8, 0.2, 'triangle'); this.tone(f / 2, t + i * 0.12, 0.7, 0.08); }); break;
      case 'lose': [392, 349, 261].forEach((f, i) => this.tone(f, t + i * 0.2, 0.5, 0.14, 'triangle')); break;
      case 'click': this.tone(750, t, 0.07, 0.1, 'sine', 520); break;
    }
  }
  private meow(t: number, surprised: boolean) {
    this.tone(surprised ? 750 : 540, t, 0.24, 0.11, 'sawtooth', surprised ? 430 : 810);
    this.tone(surprised ? 430 : 810, t + 0.22, 0.24, 0.085, 'triangle', 330);
  }
  destroy() { if (this.timer) clearInterval(this.timer); void this.context?.close(); }
}
