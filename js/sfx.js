/**
 * Procedural Web Audio — pitch/volume scale with combo for merges.
 */
export function createSfx() {
  let ctx = null;
  let master = null;

  function get() {
    if (!ctx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return null;
      ctx = new AC();
      master = ctx.createGain();
      master.gain.value = 0.96;
      master.connect(ctx.destination);
    }
    return ctx;
  }

  function resume() {
    const c = get();
    if (c && c.state === 'suspended') c.resume();
  }

  function beep(freq, dur, delay, type = 'sine', vol = 0.55) {
    const c = get();
    if (!c) return;
    const t = c.currentTime + delay;
    const osc = c.createOscillator();
    const g = c.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t);
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(vol, t + 0.014);
    g.gain.linearRampToValueAtTime(0, t + dur);
    osc.connect(g);
    g.connect(master);
    osc.start(t);
    osc.stop(t + dur + 0.04);
  }

  return {
    resume,
    /**
     * Light “whoosh slide” in the mid band only — no sub-bass tail (avoids boom/thump).
     * Quiet filtered noise + soft sine glide reads like friction/slip, not an impact.
     */
    playDrop() {
      const c = get();
      if (!c) return;
      resume();
      const t = c.currentTime;
      const dur = 0.13;

      const osc = c.createOscillator();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(780, t);
      osc.frequency.exponentialRampToValueAtTime(340, t + dur);

      const gTone = c.createGain();
      gTone.gain.setValueAtTime(0, t);
      gTone.gain.linearRampToValueAtTime(0.16, t + 0.016);
      gTone.gain.exponentialRampToValueAtTime(0.0006, t + dur + 0.05);
      osc.connect(gTone);

      const noiseBuf = c.createBuffer(1, Math.ceil(c.sampleRate * 0.08), c.sampleRate);
      const ch = noiseBuf.getChannelData(0);
      for (let i = 0; i < ch.length; i++) ch[i] = (Math.random() * 2 - 1) * 0.85;
      const noise = c.createBufferSource();
      noise.buffer = noiseBuf;
      const hp = c.createBiquadFilter();
      hp.type = 'highpass';
      hp.frequency.setValueAtTime(1400, t);
      hp.Q.setValueAtTime(0.7, t);
      const gN = c.createGain();
      gN.gain.setValueAtTime(0, t);
      gN.gain.linearRampToValueAtTime(0.07, t + 0.012);
      gN.gain.exponentialRampToValueAtTime(0.0005, t + dur + 0.02);
      noise.connect(hp);
      hp.connect(gN);

      const bus = c.createGain();
      bus.gain.value = 1;
      gTone.connect(bus);
      gN.connect(bus);
      bus.connect(master);

      osc.start(t);
      osc.stop(t + dur + 0.06);
      noise.start(t);
      noise.stop(t + dur + 0.05);
    },
    /** comboMult drives pitch + volume harder so chains feel “hot” */
    playMerge(newType, comboMult = 1) {
      const c = get();
      if (!c) return;
      resume();
      const m = Math.min(4, Math.max(1, comboMult));
      const pitchBoost = 1 + (m - 1) * 0.095 + newType * 0.02;
      const volBoost = 1 + (m - 1) * 0.14;
      const base = (300 + newType * 48) * pitchBoost;
      beep(base, 0.072, 0, 'sine', Math.min(0.82, 0.55 * volBoost));
      beep(base * 1.24, 0.092, 0.05, 'sine', Math.min(0.74, 0.46 * volBoost));
    },
    /** heat 1+ scales jackpot sting (combo chain) */
    playJackpot(heat = 1) {
      resume();
      const h = Math.min(2.2, Math.max(1, heat));
      const v = (x) => Math.min(0.88, x * (0.82 + h * 0.12));
      beep(392, 0.11, 0, 'sine', v(0.54));
      beep(523, 0.11, 0.1, 'sine', v(0.48));
      beep(659, 0.13, 0.2, 'sine', v(0.44));
      beep(784, 0.17, 0.32, 'sine', v(0.4));
    },
    /** Low “heartbeat” when pile stress is high — stress 0..1 sets loudness */
    playHeartbeat(stress = 0.6) {
      const c = get();
      if (!c) return;
      resume();
      const t = c.currentTime;
      const vol = 0.09 + stress * 0.14;
      const osc = c.createOscillator();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(52, t);
      osc.frequency.exponentialRampToValueAtTime(38, t + 0.14);
      const g = c.createGain();
      g.gain.setValueAtTime(0, t);
      g.gain.linearRampToValueAtTime(vol, t + 0.012);
      g.gain.exponentialRampToValueAtTime(0.0006, t + 0.22);
      osc.connect(g);
      g.connect(master);
      osc.start(t);
      osc.stop(t + 0.24);
    },
    playGameOver() {
      resume();
      beep(349, 0.14, 0, 'triangle', 0.52);
      beep(262, 0.18, 0.11, 'triangle', 0.46);
      beep(196, 0.26, 0.26, 'sine', 0.4);
    },
    playLevelUp() {
      resume();
      beep(523, 0.07, 0, 'sine', 0.46);
      beep(659, 0.09, 0.07, 'sine', 0.42);
      beep(784, 0.11, 0.16, 'sine', 0.38);
    },
  };
}
