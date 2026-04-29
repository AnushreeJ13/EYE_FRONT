import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

const MODES = [
  { id: "study", icon: "🎓", name: "Study", desc: "Late-night sessions & exam prep" },
  { id: "drive", icon: "🚗", name: "Drive", desc: "Aggressive alerts, response required" },
  { id: "work", icon: "💼", name: "Work", desc: "Subtle nudges & micro-breaks" },
  { id: "night", icon: "🌙", name: "Night Shift", desc: "Shift-long fatigue tracking" },
  { id: "custom", icon: "⚡", name: "Custom", desc: "Your rules, your thresholds" },
];

const STEPS = [
  { title: "What's your mission?", sub: "Tell us why staying awake matters to you right now." },
  { title: "Who are you doing this for?", sub: "Sometimes we do it for others. That's powerful." },
  { title: "Pick your mode", sub: "Different situations need different protection." },
];

export default function Onboarding() {
  const [step, setStep] = useState(0);
  const [reason, setReason] = useState("");
  const [who, setWho] = useState("");
  const [stakes, setStakes] = useState("");
  const [mode, setMode] = useState("study");
  const [saving, setSaving] = useState(false);
  const { updateProfile } = useAuth();
  const navigate = useNavigate();

  const finish = async () => {
    setSaving(true);
    try {
      await updateProfile({
        motivation_reason: reason,
        motivation_who: who,
        motivation_stakes: stakes,
        preferred_mode: mode,
      });
      navigate("/dashboard");
    } catch {
      alert("Failed to save — try again.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="onboarding-page">
      <div className="onboarding-card">
        <h2 className="h2 gradient-text">Set Up Your Guardian</h2>
        <p className="caption">This makes your alerts personal. You can change this anytime.</p>

        {/* Step indicators */}
        <div className="step-indicator">
          {STEPS.map((_, i) => (
            <div key={i} className={`step-dot ${i === step ? "active" : i < step ? "done" : ""}`} />
          ))}
        </div>

        <h3 className="h3">{STEPS[step].title}</h3>
        <p className="caption mb-2">{STEPS[step].sub}</p>

        <div className="step-content">
          {step === 0 && (
            <>
              <div className="form-group">
                <label>Why are you staying awake?</label>
                <textarea rows={2} value={reason} onChange={(e) => setReason(e.target.value)}
                  placeholder='e.g., "Board exam tomorrow", "Driving 400km home", "Night shift at the ER"' />
              </div>
              <div className="form-group">
                <label>What's at stake?</label>
                <input type="text" value={stakes} onChange={(e) => setStakes(e.target.value)}
                  placeholder={'e.g., "My career", "My safety", "I promised I\'d finish this"'} />
              </div>
            </>
          )}

          {step === 1 && (
            <div className="form-group">
              <label>Who are you doing this for? (optional)</label>
              <input type="text" value={who} onChange={(e) => setWho(e.target.value)}
                placeholder='e.g., "My parents", "My family", "Myself", "My patients"' />
              <p className="caption mt-1">When you're drifting, we'll remind you who needs you alert.</p>
            </div>
          )}

          {step === 2 && (
            <div className="mode-selector">
              {MODES.map((m) => (
                <div key={m.id} className={`mode-card ${mode === m.id ? "active" : ""}`}
                  onClick={() => setMode(m.id)} data-mode={m.id}>
                  <div className="mode-icon">{m.icon}</div>
                  <div className="mode-name">{m.name}</div>
                  <div className="mode-desc">{m.desc}</div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="step-actions">
          {step > 0 && (
            <button className="btn btn-secondary" onClick={() => setStep(step - 1)}>Back</button>
          )}
          {step < 2 ? (
            <button className="btn btn-primary" onClick={() => setStep(step + 1)}>Continue</button>
          ) : (
            <button className="btn btn-primary" onClick={finish} disabled={saving}>
              {saving ? <><span className="spinner" /> Saving...</> : "Start Protecting Me →"}
            </button>
          )}
          {step === 0 && (
            <button className="btn btn-secondary" onClick={() => navigate("/dashboard")} style={{ marginLeft: "auto" }}>
              Skip for now
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
