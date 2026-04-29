/**
 * EyeSpy Audio Engine — Web Audio API based alert system.
 * No external audio files. All sounds generated via oscillators.
 *
 * Escalation Ladder:
 *   Level 0: Subtle chime (gentle ping)
 *   Level 1: Attention tone (two-tone beep)
 *   Level 2: Alarm sound (aggressive beeping)
 *   Level 3: Emergency siren + spoken message (SpeechSynthesis)
 */

const MODE_CONFIG = {
  study: {
    minLevel: 0,
    escalationDelay: 6000,
    colors: { accent: "#f59e0b", glow: "rgba(245,158,11,0.25)" },
  },
  drive: {
    minLevel: 2,
    escalationDelay: 2000,
    colors: { accent: "#ef4444", glow: "rgba(239,68,68,0.3)" },
  },
  work: {
    minLevel: 0,
    escalationDelay: 8000,
    colors: { accent: "#7dd3fc", glow: "rgba(125,211,252,0.2)" },
  },
  night: {
    minLevel: 0,
    escalationDelay: 5000,
    colors: { accent: "#a78bfa", glow: "rgba(167,139,250,0.25)" },
  },
  custom: {
    minLevel: 0,
    escalationDelay: 5000,
    colors: { accent: "#34d399", glow: "rgba(52,211,153,0.2)" },
  },
};

export { MODE_CONFIG };

export default class AudioEngine {
  constructor() {
    this.ctx = null;
    this.currentLevel = -1;
    this.isPlaying = false;
    this.oscillators = [];
    this.mode = "study";
    this.motivation = {};
    this.escalationTimer = null;
    this.responseRequired = false;
    this.onAlertChange = null;
  }

  _ensureContext() {
    if (!this.ctx || this.ctx.state === "closed") {
      this.ctx = new (window.AudioContext || window.webkitAudioContext)();
    }
    if (this.ctx.state === "suspended") this.ctx.resume();
  }

  setMode(mode) { this.mode = MODE_CONFIG[mode] ? mode : "study"; }
  setMotivation(m) { this.motivation = m || {}; }
  getConfig() { return MODE_CONFIG[this.mode] || MODE_CONFIG.study; }

  buildMessage(level) {
    const r = this.motivation.motivation_reason || "";
    const w = this.motivation.motivation_who || "";
    const s = this.motivation.motivation_stakes || "";
    if (level <= 0) {
      return r ? `Hey, stay focused. Remember — ${r}.` : "Your eyes are getting heavy. Stay alert.";
    }
    if (level === 1) {
      let msg = "You're falling asleep.";
      if (w) msg += ` ${w} ${w.toLowerCase().includes("my") ? "are" : "is"} counting on you.`;
      if (r) msg += ` ${r}.`;
      if (!w && !r) msg += " Get up, splash some water.";
      return msg;
    }
    if (level === 2) {
      let msg = "WAKE UP.";
      if (s) msg += ` What's at stake: ${s}.`;
      else if (r) msg += ` Your reason: ${r}.`;
      if (this.mode === "drive") msg += " Pull over if you can't stay awake.";
      return msg;
    }
    let msg = "EMERGENCY. WAKE UP NOW.";
    if (r) msg += ` You said: "${r}."`;
    if (w) msg += ` Do it for ${w}.`;
    if (this.mode === "drive") msg += " PULL OVER IMMEDIATELY.";
    return msg;
  }

  _playChime() {
    this._ensureContext();
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = "sine";
    osc.frequency.setValueAtTime(880, this.ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(1320, this.ctx.currentTime + 0.15);
    gain.gain.setValueAtTime(0.15, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.6);
    osc.connect(gain).connect(this.ctx.destination);
    osc.start(); osc.stop(this.ctx.currentTime + 0.6);
    this.oscillators.push(osc);
  }

  _playAttention() {
    this._ensureContext();
    const t = this.ctx.currentTime;
    for (let i = 0; i < 2; i++) {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = "square"; osc.frequency.value = i === 0 ? 660 : 880;
      gain.gain.setValueAtTime(0.2, t + i * 0.25);
      gain.gain.exponentialRampToValueAtTime(0.001, t + i * 0.25 + 0.2);
      osc.connect(gain).connect(this.ctx.destination);
      osc.start(t + i * 0.25); osc.stop(t + i * 0.25 + 0.2);
      this.oscillators.push(osc);
    }
  }

  _playAlarm() {
    this._ensureContext();
    const t = this.ctx.currentTime;
    for (let i = 0; i < 8; i++) {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = "sawtooth"; osc.frequency.value = i % 2 === 0 ? 880 : 1100;
      gain.gain.setValueAtTime(0.3, t + i * 0.15);
      gain.gain.exponentialRampToValueAtTime(0.01, t + i * 0.15 + 0.12);
      osc.connect(gain).connect(this.ctx.destination);
      osc.start(t + i * 0.15); osc.stop(t + i * 0.15 + 0.12);
      this.oscillators.push(osc);
    }
  }

  _playSiren() {
    this._ensureContext();
    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = "sawtooth"; gain.gain.value = 0.35;
    osc.connect(gain).connect(this.ctx.destination);
    for (let i = 0; i < 4; i++) {
      osc.frequency.setValueAtTime(600, t + i * 0.5);
      osc.frequency.linearRampToValueAtTime(1400, t + i * 0.5 + 0.25);
      osc.frequency.linearRampToValueAtTime(600, t + i * 0.5 + 0.5);
    }
    osc.start(t); osc.stop(t + 2);
    this.oscillators.push(osc);
  }

  _speak(text) {
    if (!("speechSynthesis" in window)) return;
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.rate = 1.1; u.pitch = 0.9; u.volume = 1;
    window.speechSynthesis.speak(u);
  }

  triggerAlert(level) {
    const config = this.getConfig();
    const effectiveLevel = Math.max(level, config.minLevel);
    if (effectiveLevel === this.currentLevel && this.isPlaying) return;
    this.stopAll();
    this.currentLevel = effectiveLevel;
    this.isPlaying = true;
    const message = this.buildMessage(effectiveLevel);
    switch (effectiveLevel) {
      case 0: this._playChime(); break;
      case 1: this._playAttention(); break;
      case 2: this._playAlarm(); break;
      case 3: default: this._playSiren(); setTimeout(() => this._speak(message), 2200); break;
    }
    if (this.mode === "drive" && effectiveLevel >= 2) this.responseRequired = true;
    if (this.onAlertChange) this.onAlertChange(effectiveLevel, message);
  }

  handleMetrics(metrics) {
    if (!metrics) return;
    const score = metrics.alertness_score ?? 100;
    const isDrowsy = metrics.is_drowsy;
    const isYawning = metrics.is_yawning;
    if (isDrowsy) {
      if (this.currentLevel < 1) { this.triggerAlert(1); this._startEscalation(); }
    } else if (score < 40) {
      this.triggerAlert(0);
    } else if (isYawning && score < 60) {
      this.triggerAlert(0);
    } else {
      this.dismiss();
    }
  }

  _startEscalation() {
    clearTimeout(this.escalationTimer);
    const config = this.getConfig();
    this.escalationTimer = setTimeout(() => {
      if (this.isPlaying && this.currentLevel < 3) {
        this.triggerAlert(this.currentLevel + 1);
        this._startEscalation();
      }
    }, config.escalationDelay);
  }

  dismiss() {
    this.stopAll();
    this.responseRequired = false;
    if (this.onAlertChange) this.onAlertChange(-1, "");
  }

  stopAll() {
    clearTimeout(this.escalationTimer);
    this.oscillators.forEach((o) => { try { o.stop(); } catch {} });
    this.oscillators = [];
    this.isPlaying = false;
    this.currentLevel = -1;
    if ("speechSynthesis" in window) window.speechSynthesis.cancel();
  }

  destroy() {
    this.stopAll();
    if (this.ctx && this.ctx.state !== "closed") this.ctx.close();
  }
}
