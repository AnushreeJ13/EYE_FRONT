import { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import api from "../utils/api";

const MODE_ICONS = { study: "🎓", drive: "🚗", work: "💼", night: "🌙", custom: "⚡" };

export default function History() {
  const { user } = useAuth();
  const [sessions, setSessions] = useState([]);
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      api.get("/api/sessions").then(r => setSessions(r.data.sessions || [])),
      api.get("/api/analytics").then(r => setAnalytics(r.data)),
    ]).finally(() => setLoading(false));
  }, []);

  const formatDuration = (s) => {
    if (!s) return "0s";
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return m ? `${m}m ${sec}s` : `${sec}s`;
  };

  const formatDate = (iso) => {
    try {
      const d = new Date(iso);
      return d.toLocaleDateString("en-IN", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
    } catch { return iso; }
  };

  if (loading) return (
    <div className="page" style={{ display: "flex", alignItems: "center", justifyContent: "center" }}>
      <span className="spinner" style={{ width: 36, height: 36, borderWidth: 3 }} />
    </div>
  );

  return (
    <div className="page">
      <div className="container" style={{ paddingTop: "2rem", paddingBottom: "3rem" }}>
        <h2 className="h2 mb-3">Your <span className="gradient-text">History</span></h2>

        {/* Analytics Summary */}
        {analytics && (
          <div className="analytics-summary">
            <div className="metric-tile">
              <span className="metric-label">Total Sessions</span>
              <span className="metric-value">{analytics.total_sessions}</span>
            </div>
            <div className="metric-tile">
              <span className="metric-label">Total Time</span>
              <span className="metric-value">{formatDuration(analytics.total_monitoring_time)}</span>
            </div>
            <div className="metric-tile">
              <span className="metric-label">Drowsy Events</span>
              <span className="metric-value" style={{ color: analytics.total_drowsiness_events ? "var(--danger)" : "var(--success)" }}>
                {analytics.total_drowsiness_events}
              </span>
            </div>
            <div className="metric-tile">
              <span className="metric-label">Avg Alertness</span>
              <span className="metric-value" style={{ color: (analytics.overall_avg_alertness || 0) >= 60 ? "var(--success)" : "var(--warning)" }}>
                {Math.round(analytics.overall_avg_alertness || 0)}%
              </span>
            </div>
          </div>
        )}

        {/* Session List */}
        {sessions.length === 0 ? (
          <div className="card text-center" style={{ padding: "3rem" }}>
            <p className="body-lg">No sessions yet. Start your first detection on the Dashboard!</p>
          </div>
        ) : (
          <div className="flex flex-col gap-1">
            {sessions.map((s) => (
              <div key={s.id} className="session-card">
                <div>
                  <div className="flex items-center gap-1 mb-1">
                    <strong>{formatDate(s.started_at)}</strong>
                    <span className="mode-tag">{MODE_ICONS[s.mode] || "⚡"} {s.mode || "study"}</span>
                  </div>
                  <div className="session-meta">
                    <div className="session-stat">
                      <span className="stat-val">{formatDuration(s.total_time)}</span>
                      <span className="stat-lbl">Duration</span>
                    </div>
                    <div className="session-stat">
                      <span className="stat-val" style={{ color: s.drowsiness_events ? "var(--danger)" : "var(--success)" }}>
                        {s.drowsiness_events}
                      </span>
                      <span className="stat-lbl">Drowsy Events</span>
                    </div>
                    <div className="session-stat">
                      <span className="stat-val">{s.total_blinks}</span>
                      <span className="stat-lbl">Blinks</span>
                    </div>
                    <div className="session-stat">
                      <span className="stat-val">{(s.avg_ear || 0).toFixed(2)}</span>
                      <span className="stat-lbl">Avg EAR</span>
                    </div>
                    <div className="session-stat">
                      <span className="stat-val">{Math.round(s.avg_alertness || 0)}%</span>
                      <span className="stat-lbl">Alertness</span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
