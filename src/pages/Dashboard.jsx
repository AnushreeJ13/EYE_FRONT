import { useState, useEffect, useRef, useCallback } from "react";
import { useAuth } from "../context/AuthContext";
import AudioEngine from "../utils/audioEngine";
import api from "../utils/api";

const MODES = [
  { id: "study", icon: "🎓", name: "Study" },
  { id: "drive", icon: "🚗", name: "Drive" },
  { id: "work", icon: "💼", name: "Work" },
  { id: "night", icon: "🌙", name: "Night" },
  { id: "custom", icon: "⚡", name: "Custom" },
];

export default function Dashboard() {
  const { user, profile } = useAuth();

  const [mode, setMode] = useState(profile.preferred_mode || "study");
  const [isActive, setIsActive] = useState(false);
  const [metrics, setMetrics] = useState(null);
  const [alertMsg, setAlertMsg] = useState("");
  const [alertLevel, setAlertLevel] = useState(-1);
  const [responseRequired, setResponseRequired] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [sessionStats, setSessionStats] = useState({ drowsinessEvents: 0, blinks: 0, yawns: 0 });
  const [pomoTime, setPomoTime] = useState(25 * 60);
  const [isPomoActive, setIsPomoActive] = useState(false);

  const wsRef = useRef(null);
  const canvasRef = useRef(null);
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const audioRef = useRef(null);
  const timerRef = useRef(null);
  const pomoTimerRef = useRef(null);
  const startTimeRef = useRef(null);
  const frameLoopRef = useRef(null);

  // Initialize audio engine
  useEffect(() => {
    const engine = new AudioEngine();
    engine.onAlertChange = (level, message) => {
      setAlertLevel(level);
      setAlertMsg(message);
    };
    audioRef.current = engine;
    return () => engine.destroy();
  }, []);

  // Sync mode + motivation to audio engine
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.setMode(mode);
      audioRef.current.setMotivation(profile);
    }
  }, [mode, profile]);

  // Elapsed timer
  useEffect(() => {
    if (isActive) {
      startTimeRef.current = Date.now();
      timerRef.current = setInterval(() => {
        setElapsed(Math.floor((Date.now() - startTimeRef.current) / 1000));
      }, 1000);
    } else {
      clearInterval(timerRef.current);
    }
    return () => clearInterval(timerRef.current);
  }, [isActive]);

  // Pomodoro timer
  useEffect(() => {
    if (isPomoActive && pomoTime > 0) {
      pomoTimerRef.current = setInterval(() => {
        setPomoTime((prev) => prev - 1);
      }, 1000);
    } else if (pomoTime === 0) {
      setIsPomoActive(false);
      clearInterval(pomoTimerRef.current);
      // Optional: Add a sound or notification here
      if (audioRef.current) {
        audioRef.current.playAlert(0, "Pomodoro session complete! Take a break.");
      }
    }
    return () => clearInterval(pomoTimerRef.current);
  }, [isPomoActive, pomoTime]);

  const formatTime = (s) => `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;

  // Track if we are waiting for a server response to avoid queueing up too many frames (backpressure)
  const isServerBusy = useRef(false);

  const sendFrame = useCallback(() => {
    if (!videoRef.current || !wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) return;
    
    // Prevent flooding the backend (which causes OOM crashes on Render)
    if (isServerBusy.current) {
      frameLoopRef.current = setTimeout(sendFrame, 150); // check again slightly later
      return;
    }
    
    const video = videoRef.current;
    const vW = video.videoWidth;
    const vH = video.videoHeight;
    
    // Maintain aspect ratio while keeping resolution low for the server
    const maxDim = 320;
    let targetW, targetH;
    
    if (vW > vH) {
      targetW = maxDim;
      targetH = Math.floor(maxDim * (vH / vW));
    } else {
      targetH = maxDim;
      targetW = Math.floor(maxDim * (vW / vH));
    }

    const c = document.createElement("canvas");
    c.width = targetW; 
    c.height = targetH;
    const ctx = c.getContext("2d");
    ctx.drawImage(video, 0, 0, targetW, targetH);
    const dataUrl = c.toDataURL("image/jpeg", 0.5);
    const b64 = dataUrl.split(",")[1];
    
    // Log payload size for debugging
    if (Math.random() < 0.1) console.log("Payload size (b64 chars):", b64.length);

    try {
      wsRef.current.send(JSON.stringify({ type: "frame", data: b64 }));
    } catch {
      isServerBusy.current = false;
    }
    
    // Safety fallback
    setTimeout(() => {
      isServerBusy.current = false;
    }, 2000);
    
    // Schedule next frame attempt (reduced to 4 fps for stability)
    frameLoopRef.current = setTimeout(sendFrame, 250);
  }, []);

  const startSession = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: 640, height: 480, facingMode: "user" },
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
      }

      const baseUrl = import.meta.env.VITE_BACKEND_URL || window.location.origin;
      const wsUrl = baseUrl.replace(/^http/, "ws") + "/ws/detect";
      console.log("Connecting to WebSocket at:", wsUrl);
      
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        console.log("WebSocket connection established!");
        setIsActive(true);
        setElapsed(0);
        setSessionStats({ drowsinessEvents: 0, blinks: 0, yawns: 0 });
        setAlertLevel(-1);
        setAlertMsg("");
        sendFrame();
      };

      ws.onmessage = (e) => {
        console.log("Message received from server");
        try {
          const data = JSON.parse(e.data);
          if (data.type === "detection") {
            // Unblock next frame transmission
            isServerBusy.current = false;
            
            setMetrics(data.metrics);

            // Feed metrics to audio engine for alert handling
            audioRef.current?.handleMetrics(data.metrics);

            // Track session stats
            setSessionStats((prev) => ({
              drowsinessEvents: prev.drowsinessEvents + (data.metrics.is_drowsy ? 1 : 0),
              blinks: data.metrics.blink_total || prev.blinks,
              yawns: prev.yawns + (data.metrics.is_yawning ? 1 : 0),
            }));

            // Check if response required (Drive mode)
            if (audioRef.current?.responseRequired) {
              setResponseRequired(true);
            }

            // Draw annotated frame
            if (data.frame && canvasRef.current) {
              const img = new Image();
              img.onload = () => {
                const ctx = canvasRef.current?.getContext("2d");
                if (ctx) {
                  canvasRef.current.width = img.width;
                  canvasRef.current.height = img.height;
                  ctx.drawImage(img, 0, 0);
                }
              };
              img.src = `data:image/jpeg;base64,${data.frame}`;
            }
          }
        } catch {}
      };

      ws.onclose = (event) => {
        console.log("WebSocket connection closed:", event.code, event.reason);
        setIsActive(false);
      };
      ws.onerror = (err) => {
        console.error("WebSocket error:", err);
        alert("Failed to connect to the detection server. Please check your connection or wait for the server to wake up.");
        ws.close();
      };
    } catch (err) {
      alert("Camera access denied: " + err.message);
    }
  };

  const stopSession = async () => {
    clearTimeout(frameLoopRef.current);
    audioRef.current?.stopAll();
    setResponseRequired(false);
    wsRef.current?.close();
    streamRef.current?.getTracks().forEach((t) => t.stop());
    setIsActive(false);

    // Save session
    try {
      await api.post("/api/sessions", {
        session_data: {
          mode,
          total_time: elapsed,
          drowsiness_events: sessionStats.drowsinessEvents,
          total_blinks: sessionStats.blinks,
          avg_ear: metrics?.ear || 0,
          min_ear: metrics?.ear || 0,
          max_ear: metrics?.ear || 0,
          avg_mar: metrics?.mar || 0,
          avg_alertness: metrics?.alertness_score || 0,
        },
      });
    } catch {}
  };

  const acknowledgeAlert = () => {
    audioRef.current?.dismiss();
    setResponseRequired(false);
    setAlertLevel(-1);
    setAlertMsg("");
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      clearTimeout(frameLoopRef.current);
      clearInterval(timerRef.current);
      wsRef.current?.close();
      streamRef.current?.getTracks().forEach((t) => t.stop());
    };
  }, []);

  const getScoreColor = (score) => {
    if (score >= 70) return "var(--success)";
    if (score >= 40) return "var(--warning)";
    return "var(--danger)";
  };

  const scoreVal = metrics?.alertness_score ?? 100;
  const circumference = 2 * Math.PI * 56;
  const scoreOffset = circumference - (scoreVal / 100) * circumference;

  return (
    <div className="page" data-mode={mode}>
      <div className="container">
        {/* Response Required Overlay */}
        {responseRequired && (
          <div className="response-overlay">
            <h1>🚨 WAKE UP!</h1>
            <p>{alertMsg || "You are falling asleep. TAP the button to confirm you are awake!"}</p>
            <button onClick={acknowledgeAlert}>I'M AWAKE</button>
          </div>
        )}

        {/* Mode Selector (visible when not active) */}
        {!isActive && (
          <div style={{ paddingTop: "1.5rem" }}>
            <h3 className="h3 mb-2">Select Your Mode</h3>
            <div className="mode-selector">
              {MODES.map((m) => (
                <div key={m.id} className={`mode-card ${mode === m.id ? "active" : ""}`}
                  onClick={() => setMode(m.id)} data-mode={m.id}>
                  <div className="mode-icon">{m.icon}</div>
                  <div className="mode-name">{m.name}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Motivation Banner */}
        {profile.motivation_reason && (
          <div className="motivation-banner mb-2">
            <div className="motive-label">Your Reason</div>
            <div className="motive-text">"{profile.motivation_reason}"
              {profile.motivation_who && <> — for {profile.motivation_who}</>}
            </div>
          </div>
        )}

        {/* Alert Banner */}
        {alertMsg && alertLevel >= 0 && (
          <div className={`alert-banner mb-2 ${alertLevel >= 2 ? "danger" : alertLevel >= 1 ? "warning" : "success"}`}>
            {alertMsg}
          </div>
        )}

        <div className="dashboard">
          {/* Main: Video Feed */}
          <div className="dashboard-main">
            <div className="video-container">
              <video ref={videoRef} playsInline muted style={{ display: isActive ? "block" : "none", width: "100%", borderRadius: "var(--radius-lg)" }} />
              {/* <canvas ref={canvasRef} style={{ display: isActive ? "block" : "none" }} /> */}
              {isActive && (
                <div className="video-status">
                  <span className="dot live" /> LIVE — {formatTime(elapsed)}
                </div>
              )}
              {!isActive && (
                <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(0,0,0,0.6)" }}>
                  <button className="btn btn-primary btn-lg" onClick={startSession}>
                    {MODES.find((m) => m.id === mode)?.icon} Start {MODES.find((m) => m.id === mode)?.name} Mode
                  </button>
                </div>
              )}
            </div>
            {isActive && (
              <button className="btn btn-danger w-full" onClick={stopSession}>⏹ Stop Session & Save</button>
            )}
          </div>

          {/* Sidebar: Metrics */}
          <div className="dashboard-sidebar">
            {/* Alertness Gauge */}
            <div className="card" style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "0.5rem" }}>
              <div className="alertness-gauge">
                <svg width="140" height="140" viewBox="0 0 140 140">
                  <circle cx="70" cy="70" r="56" fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="10" />
                  <circle cx="70" cy="70" r="56" fill="none" stroke={getScoreColor(scoreVal)} strokeWidth="10"
                    strokeDasharray={circumference} strokeDashoffset={scoreOffset}
                    strokeLinecap="round" style={{ transition: "stroke-dashoffset 0.4s, stroke 0.4s" }} />
                </svg>
                <div style={{ textAlign: "center" }}>
                  <div className="gauge-value" style={{ color: getScoreColor(scoreVal) }}>{Math.round(scoreVal)}</div>
                  <div className="gauge-label">Alertness</div>
                </div>
              </div>
              <div className="caption">
                {scoreVal >= 70 ? "You're doing great ✨" : scoreVal >= 40 ? "Stay focused ⚡" : "Alert! Wake up! 🚨"}
              </div>
            </div>

            {/* Live Metrics */}
            <div className="metrics-grid">
              <div className="metric-tile">
                <span className="metric-label">EAR</span>
                <span className="metric-value">{metrics?.ear?.toFixed(2) || "—"}</span>
              </div>
              <div className="metric-tile">
                <span className="metric-label">MAR</span>
                <span className="metric-value">{metrics?.mar?.toFixed(2) || "—"}</span>
              </div>
              <div className="metric-tile">
                <span className="metric-label">PERCLOS</span>
                <span className="metric-value">{metrics?.perclos != null ? `${Math.round(metrics.perclos)}%` : "—"}</span>
              </div>
              <div className="metric-tile">
                <span className="metric-label">Blinks</span>
                <span className="metric-value">{metrics?.blink_total ?? "—"}</span>
              </div>
              <div className="metric-tile">
                <span className="metric-label">Yawn</span>
                <span className="metric-value" style={{ color: metrics?.is_yawning ? "var(--warning)" : "var(--text-primary)" }}>
                  {metrics?.is_yawning ? "YES 😮" : "No"}
                </span>
              </div>
              <div className="metric-tile">
                <span className="metric-label">Head</span>
                <span className="metric-value" style={{ color: metrics?.is_distracted ? "var(--danger)" : "var(--text-primary)" }}>
                  {metrics?.is_distracted ? "Away!" : "OK ✓"}
                </span>
              </div>
            </div>

            {/* Pomodoro Timer (Study Mode) */}
            {mode === "study" && (
              <div className="pomodoro-widget">
                <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "0.5rem", marginBottom: "0.5rem" }}>
                  <span className="tomato-jump">🍅</span>
                  <h3 className="h3" style={{ fontSize: "1.1rem", margin: 0 }}>Focus Session</h3>
                </div>
                <div className="pomodoro-time">
                  {String(Math.floor(pomoTime / 60)).padStart(2, '0')}:{String(pomoTime % 60).padStart(2, '0')}
                </div>
                <div className="pomodoro-controls">
                  <button className="pomodoro-btn" onClick={() => { setIsPomoActive(!isPomoActive); if (pomoTime === 0) setPomoTime(25 * 60); }}>
                    {isPomoActive ? "⏸" : "▶"}
                  </button>
                  <button className="pomodoro-btn" onClick={() => { setIsPomoActive(false); setPomoTime(25 * 60); }}>
                    🔄
                  </button>
                </div>
                <div className="caption mt-2">
                  Stay focused! EyeSpy monitors your alertness.
                </div>
              </div>
            )}

            {/* Session Stats */}
            <div className="card">
              <h3 className="h3 mb-1" style={{ fontSize: "0.9rem" }}>Session Stats</h3>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <div className="caption">Duration</div>
                <div style={{ fontWeight: 600 }}>{formatTime(elapsed)}</div>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <div className="caption">Drowsy Events</div>
                <div style={{ fontWeight: 600, color: sessionStats.drowsinessEvents ? "var(--danger)" : "var(--success)" }}>
                  {sessionStats.drowsinessEvents}
                </div>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <div className="caption">Mode</div>
                <div style={{ fontWeight: 600, textTransform: "capitalize" }}>
                  {MODES.find((m) => m.id === mode)?.icon} {mode}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
