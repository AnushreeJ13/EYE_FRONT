import { Link } from "react-router-dom";

const PERSONAS = [
  { icon: "🎓", title: "Students", desc: "Pulling an all-nighter before exams? EyeSpy keeps you alert so your study hours actually count. Your parents' sacrifice deserves your best effort.", color: "#f59e0b" },
  { icon: "🚗", title: "Drivers", desc: "One microsleep on the highway = game over. EyeSpy screams until you respond. Your family needs you home safe — not a statistic.", color: "#ef4444" },
  { icon: "💼", title: "Professionals", desc: "Post-lunch slump killing your focus? That presentation determines your next promotion. EyeSpy nudges you back before anyone notices.", color: "#7dd3fc" },
  { icon: "🌙", title: "Night Shift", desc: "Hospitals, factories, security — people depend on you being alert at 3 AM. EyeSpy tracks your fatigue curve across your entire shift.", color: "#a78bfa" },
];

const FEATURES = [
  { icon: "👁️", title: "Eye Aspect Ratio", desc: "478-point face mesh tracks eye openness with surgical precision. Detects microsleeps in real-time." },
  { icon: "😮", title: "Yawn Detection", desc: "Mouth Aspect Ratio catches yawns — the earliest fatigue signal your body sends." },
  { icon: "📊", title: "PERCLOS", desc: "Industry-standard metric used in automotive safety. Percentage of eye closure over 60-second windows." },
  { icon: "🔊", title: "Smart Audio Alerts", desc: "4-level escalation system. From gentle chimes to emergency sirens. Drive mode won't stop until you respond." },
  { icon: "🧭", title: "Head Pose Tracking", desc: "3D head orientation via solvePnP. Catches nodding off, phone usage, and looking away." },
  { icon: "💬", title: "Personal Motivation", desc: "Tell EyeSpy WHY you need to stay awake. It weaves your reason into alerts that actually hit home." },
];

export default function Landing() {
  return (
    <div className="page" style={{ background: "var(--gradient-hero)", overflow: "hidden", position: "relative" }}>
      {/* Animated Orbs */}
      <div className="orb orb-1" />
      <div className="orb orb-2" />
      <div className="orb orb-3" />

      {/* Hero */}
      <section className="hero">
        <div className="hero-content">
          <h1 className="h1 animate-in">
            Your Personal{" "}
            <span className="gradient-text">Wakefulness Guardian</span>
          </h1>
          <p className="body-lg animate-in animate-delay-1">
            EyeSpy doesn't just detect drowsiness — it knows <em>why</em> you need to stay awake and <em>fights for you</em> when your body gives up. Six AI signals. Personal motivation. Audio alerts that don't quit.
          </p>
          <div className="hero-actions animate-in animate-delay-2">
            <Link to="/login"><button className="btn btn-primary btn-lg">Start Protecting Yourself →</button></Link>
            <a href="#who"><button className="btn btn-secondary btn-lg">Who Is This For?</button></a>
          </div>
        </div>
      </section>

      {/* Who Is This For */}
      <section id="who" className="section">
        <div className="container">
          <div className="text-center mb-4">
            <h2 className="h2">Built For People Who <span className="gradient-text">Can't Afford To Sleep</span></h2>
            <p className="body-lg" style={{ maxWidth: 600, margin: "1rem auto" }}>
              Not a toy. Not a demo. A guardian for moments when staying awake is everything.
            </p>
          </div>
          <div className="persona-grid">
            {PERSONAS.map((p, i) => (
              <div key={i} className={`persona-card animate-in animate-delay-${(i % 3) + 1}`}>
                <div className="persona-icon">{p.icon}</div>
                <h3>{p.title}</h3>
                <p>{p.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="section" style={{ background: "var(--bg-secondary)" }}>
        <div className="container text-center">
          <h2 className="h2 mb-3">How It <span className="gradient-text">Protects You</span></h2>
          <div className="grid-3" style={{ maxWidth: 900, margin: "0 auto" }}>
            <div className="card">
              <h3 className="h3 mb-1">1. Tell Us Why</h3>
              <p className="caption">Share why staying awake matters. "Board exam tomorrow." "Driving home to my daughter." We remember.</p>
            </div>
            <div className="card">
              <h3 className="h3 mb-1">2. Pick Your Mode</h3>
              <p className="caption">Study, Drive, Work, Night Shift, or Custom. Each mode has tuned thresholds and alert styles.</p>
            </div>
            <div className="card">
              <h3 className="h3 mb-1">3. Stay Protected</h3>
              <p className="caption">AI monitors your eyes, mouth, and head pose. When you drift, personalized alerts bring you back.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="section">
        <div className="container">
          <div className="text-center mb-4">
            <h2 className="h2">Six Signals. <span className="gradient-text">Zero Guesswork.</span></h2>
          </div>
          <div className="features-grid">
            {FEATURES.map((f, i) => (
              <div key={i} className={`feature-card animate-in animate-delay-${(i % 3) + 1}`}>
                <div className="feature-icon">{f.icon}</div>
                <h3>{f.title}</h3>
                <p>{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="section text-center" style={{ background: "var(--bg-secondary)" }}>
        <div className="container">
          <h2 className="h2 mb-2">Your Next All-Nighter Deserves a Guardian</h2>
          <p className="body-lg mb-3">Free. No credit card. Just a webcam and a reason to stay awake.</p>
          <Link to="/login"><button className="btn btn-primary btn-lg">Get Started — It's Free</button></Link>
        </div>
      </section>

      <footer className="footer">
        <p>EyeSpy v3 — Built with MediaPipe, FastAPI, React & Web Audio API</p>
      </footer>
    </div>
  );
}
