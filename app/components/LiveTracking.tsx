"use client";

import { useEffect, useState, useCallback } from "react";

interface Checkpoint {
  date: string;
  location: string;
  status: string;
  message: string;
  tag: string;
}

interface TrackingData {
  tracking_number: string;
  courier: string;
  delivered: boolean;
  estimated_delivery: string;
  last_updated: string;
  status_message: string;
  checkpoints: Checkpoint[];
  tracking_url: string;
  used_api: boolean;
}

interface LiveTrackingProps {
  trackingNumber: string;
  courierName: string;
  orderId?: string;
  /** Auto-refresh interval in seconds (default: 60) */
  refreshInterval?: number;
}

const TAG_CONFIG: Record<
  string,
  { color: string; bg: string; icon: string; pulse: boolean }
> = {
  Picked: {
    color: "#6366f1",
    bg: "#eef2ff",
    icon: "📦",
    pulse: false,
  },
  InTransit: {
    color: "#f59e0b",
    bg: "#fffbeb",
    icon: "🚚",
    pulse: true,
  },
  OutForDelivery: {
    color: "#10b981",
    bg: "#ecfdf5",
    icon: "🛵",
    pulse: true,
  },
  Delivered: {
    color: "#059669",
    bg: "#d1fae5",
    icon: "✅",
    pulse: false,
  },
};

function formatDate(iso: string) {
  const d = new Date(iso);
  return d.toLocaleString("en-PK", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatDeliveryDate(iso: string) {
  const d = new Date(iso);
  return d.toLocaleDateString("en-PK", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });
}

function TimeAgo({ iso }: { iso: string }) {
  const [label, setLabel] = useState("");
  useEffect(() => {
    const calc = () => {
      const diff = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
      if (diff < 60) setLabel(`${diff}s ago`);
      else if (diff < 3600) setLabel(`${Math.floor(diff / 60)}m ago`);
      else if (diff < 86400) setLabel(`${Math.floor(diff / 3600)}h ago`);
      else setLabel(`${Math.floor(diff / 86400)}d ago`);
    };
    calc();
    const t = setInterval(calc, 15000);
    return () => clearInterval(t);
  }, [iso]);
  return <span>{label}</span>;
}

export default function LiveTracking({
  trackingNumber,
  courierName,
  orderId,
  refreshInterval = 60,
}: LiveTrackingProps) {
  const [data, setData] = useState<TrackingData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastFetch, setLastFetch] = useState<Date | null>(null);

  const fetchTracking = useCallback(async () => {
    try {
      setError(null);
      const params = new URLSearchParams({
        tracking: trackingNumber,
        courier: courierName,
        ...(orderId ? { orderId } : {}),
      });
      const res = await fetch(`/api/track-live?${params}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      if (json.error) throw new Error(json.error);
      setData(json);
      setLastFetch(new Date());
    } catch (e: any) {
      setError(e.message || "Tracking failed");
    } finally {
      setLoading(false);
    }
  }, [trackingNumber, courierName, orderId]);

  useEffect(() => {
    fetchTracking();
    const interval = setInterval(fetchTracking, refreshInterval * 1000);
    return () => clearInterval(interval);
  }, [fetchTracking, refreshInterval]);

  /* ─── Loading ─── */
  if (loading) {
    return (
      <div style={styles.wrapper}>
        <div style={styles.loadingBox}>
          <div style={styles.spinner} />
          <p style={styles.loadingText}>
            Fetching live tracking for <strong>{trackingNumber}</strong>…
          </p>
        </div>
      </div>
    );
  }

  /* ─── Error ─── */
  if (error || !data) {
    return (
      <div style={styles.wrapper}>
        <div style={{ ...styles.card, borderLeft: "4px solid #ef4444" }}>
          <p style={{ color: "#ef4444", fontWeight: 600 }}>
            ⚠️ Could not load tracking
          </p>
          <p style={{ color: "#6b7280", fontSize: 13, marginTop: 4 }}>
            {error}
          </p>
          <button onClick={fetchTracking} style={styles.retryBtn}>
            Retry
          </button>
        </div>
      </div>
    );
  }

  const activeTag = data.checkpoints[0]?.tag ?? "Picked";
  const cfg = TAG_CONFIG[activeTag] ?? TAG_CONFIG["Picked"];

  /* ─── Progress bar ─── */
  const STAGES = ["Picked", "InTransit", "OutForDelivery", "Delivered"];
  const currentStageIdx = STAGES.indexOf(activeTag);
  const progress = Math.round(((currentStageIdx + 1) / STAGES.length) * 100);

  return (
    <div style={styles.wrapper}>
      <div style={styles.card}>
        {/* ── Header ── */}
        <div style={styles.header}>
          <div>
            <p style={styles.courierLabel}>{data.courier.toUpperCase()}</p>
            <p style={styles.trackingNum}>
              <span style={styles.trackingNumIcon}>🔍</span>
              {data.tracking_number}
            </p>
          </div>
          <div style={{ textAlign: "right" }}>
            <span
              style={{
                ...styles.statusBadge,
                background: cfg.bg,
                color: cfg.color,
                border: `1.5px solid ${cfg.color}30`,
              }}
            >
              {cfg.pulse && <span style={styles.pulseDot(cfg.color)} />}
              {cfg.icon} {data.status_message}
            </span>
            <p style={styles.lastUpdated}>
              Updated:{" "}
              {lastFetch ? <TimeAgo iso={lastFetch.toISOString()} /> : "—"}
            </p>
          </div>
        </div>

        {/* ── EDD banner ── */}
        {!data.delivered && (
          <div style={styles.eddBanner}>
            <span>📅</span>
            <span>
              Estimated Delivery:{" "}
              <strong>{formatDeliveryDate(data.estimated_delivery)}</strong>
            </span>
          </div>
        )}
        {data.delivered && (
          <div
            style={{
              ...styles.eddBanner,
              background: "#d1fae5",
              color: "#065f46",
            }}
          >
            <span>🎉</span>
            <span>
              Delivered on{" "}
              <strong>{formatDeliveryDate(data.estimated_delivery)}</strong>
            </span>
          </div>
        )}

        {/* ── Progress bar ── */}
        <div style={styles.progressWrap}>
          {STAGES.map((stage, i) => {
            const done = i <= currentStageIdx;
            const stageCfg = TAG_CONFIG[stage];
            return (
              <div key={stage} style={styles.progressStep}>
                <div
                  style={{
                    ...styles.progressCircle,
                    background: done ? stageCfg.color : "#e5e7eb",
                    boxShadow:
                      done && i === currentStageIdx
                        ? `0 0 0 4px ${stageCfg.color}30`
                        : "none",
                  }}
                >
                  {done ? (
                    <span style={{ fontSize: 12 }}>{stageCfg.icon}</span>
                  ) : (
                    <span style={{ color: "#9ca3af", fontSize: 10 }}>●</span>
                  )}
                </div>
                {i < STAGES.length - 1 && (
                  <div
                    style={{
                      ...styles.progressLine,
                      background:
                        i < currentStageIdx ? stageCfg.color : "#e5e7eb",
                    }}
                  />
                )}
                <p
                  style={{
                    ...styles.progressLabel,
                    color: done ? stageCfg.color : "#9ca3af",
                    fontWeight: done ? 700 : 400,
                  }}
                >
                  {stage === "InTransit"
                    ? "In Transit"
                    : stage === "OutForDelivery"
                      ? "Out for Delivery"
                      : stage}
                </p>
              </div>
            );
          })}
        </div>

        {/* ── Timeline ── */}
        <div style={styles.timelineSection}>
          <p style={styles.timelineTitle}>📍 Live Updates</p>
          <div>
            {data.checkpoints.map((cp, i) => {
              const cpCfg = TAG_CONFIG[cp.tag] ?? TAG_CONFIG["Picked"];
              return (
                <div key={i} style={styles.timelineItem}>
                  <div style={styles.timelineDotCol}>
                    <div
                      style={{
                        ...styles.timelineDot,
                        background: cpCfg.color,
                        boxShadow:
                          i === 0 ? `0 0 0 4px ${cpCfg.color}25` : "none",
                      }}
                    >
                      <span style={{ fontSize: 10 }}>{cpCfg.icon}</span>
                    </div>
                    {i < data.checkpoints.length - 1 && (
                      <div style={styles.timelineLine} />
                    )}
                  </div>
                  <div style={styles.timelineContent}>
                    <div style={styles.timelineStatusRow}>
                      <span
                        style={{
                          ...styles.timelineStatusChip,
                          background: cpCfg.bg,
                          color: cpCfg.color,
                        }}
                      >
                        {cp.status}
                      </span>
                      {i === 0 && (
                        <span style={styles.liveChip}>
                          <span style={styles.liveDot} /> LIVE
                        </span>
                      )}
                    </div>
                    <p style={styles.timelineMessage}>{cp.message}</p>
                    <div style={styles.timelineMeta}>
                      <span>📍 {cp.location}</span>
                      <span>🕐 {formatDate(cp.date)}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* ── Courier link ── */}
        <div style={styles.courierLinkRow}>
          <a
            href={data.tracking_url}
            target="_blank"
            rel="noopener noreferrer"
            style={styles.courierLink}
          >
            🔗 Track on {data.courier} website →
          </a>
          <button onClick={fetchTracking} style={styles.refreshBtn}>
            🔄 Refresh
          </button>
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════
   Styles
═══════════════════════════════════════════ */
const styles: Record<string, any> = {
  wrapper: {
    fontFamily: "'Segoe UI', system-ui, sans-serif",
    width: "100%",
    marginTop: 16,
  },
  card: {
    background: "#fff",
    border: "1px solid #e5e7eb",
    borderRadius: 16,
    padding: "20px 24px",
    boxShadow: "0 4px 24px rgba(0,0,0,0.06)",
    overflow: "hidden",
  },
  loadingBox: {
    display: "flex",
    alignItems: "center",
    gap: 12,
    padding: "20px 24px",
    background: "#f9fafb",
    borderRadius: 12,
    border: "1px solid #e5e7eb",
  },
  spinner: {
    width: 20,
    height: 20,
    border: "3px solid #e5e7eb",
    borderTop: "3px solid #6366f1",
    borderRadius: "50%",
    animation: "spin 0.8s linear infinite",
  },
  loadingText: { color: "#6b7280", fontSize: 14, margin: 0 },
  header: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 12,
    flexWrap: "wrap",
    gap: 8,
  },
  courierLabel: {
    margin: 0,
    fontSize: 11,
    fontWeight: 700,
    letterSpacing: 1.5,
    color: "#9ca3af",
  },
  trackingNum: {
    margin: 0,
    fontSize: 18,
    fontWeight: 800,
    color: "#111827",
    display: "flex",
    alignItems: "center",
    gap: 6,
    marginTop: 2,
  },
  trackingNumIcon: { fontSize: 14 },
  statusBadge: {
    display: "inline-flex",
    alignItems: "center",
    gap: 6,
    padding: "5px 12px",
    borderRadius: 20,
    fontSize: 13,
    fontWeight: 700,
  },
  pulseDot: (color: string) => ({
    width: 7,
    height: 7,
    borderRadius: "50%",
    background: color,
    display: "inline-block",
    animation: "pulse 1.4s ease-in-out infinite",
  }),
  lastUpdated: {
    fontSize: 11,
    color: "#9ca3af",
    margin: "4px 0 0",
    textAlign: "right" as const,
  },
  eddBanner: {
    display: "flex",
    alignItems: "center",
    gap: 8,
    background: "#eff6ff",
    color: "#1d4ed8",
    borderRadius: 10,
    padding: "10px 14px",
    fontSize: 13,
    marginBottom: 16,
  },
  progressWrap: {
    display: "flex",
    alignItems: "flex-start",
    justifyContent: "space-between",
    marginBottom: 20,
    padding: "0 4px",
  },
  progressStep: {
    display: "flex",
    flexDirection: "column" as const,
    alignItems: "center",
    flex: 1,
    position: "relative" as const,
  },
  progressCircle: {
    width: 32,
    height: 32,
    borderRadius: "50%",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 1,
    transition: "all 0.4s ease",
  },
  progressLine: {
    position: "absolute" as const,
    top: 16,
    left: "50%",
    width: "100%",
    height: 3,
    zIndex: 0,
    transition: "background 0.4s ease",
  },
  progressLabel: {
    fontSize: 10,
    marginTop: 6,
    textAlign: "center" as const,
    maxWidth: 70,
  },
  timelineSection: { marginTop: 8 },
  timelineTitle: {
    fontWeight: 700,
    color: "#374151",
    fontSize: 14,
    margin: "0 0 12px",
    letterSpacing: 0.3,
  },
  timelineItem: {
    display: "flex",
    gap: 12,
    marginBottom: 4,
  },
  timelineDotCol: {
    display: "flex",
    flexDirection: "column" as const,
    alignItems: "center",
    minWidth: 28,
  },
  timelineDot: {
    width: 28,
    height: 28,
    borderRadius: "50%",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  timelineLine: {
    width: 2,
    flex: 1,
    minHeight: 24,
    background: "#e5e7eb",
    margin: "3px 0",
  },
  timelineContent: {
    flex: 1,
    paddingBottom: 16,
  },
  timelineStatusRow: {
    display: "flex",
    alignItems: "center",
    gap: 8,
    marginBottom: 4,
  },
  timelineStatusChip: {
    padding: "2px 10px",
    borderRadius: 20,
    fontSize: 11,
    fontWeight: 700,
  },
  liveChip: {
    display: "inline-flex",
    alignItems: "center",
    gap: 4,
    background: "#fee2e2",
    color: "#dc2626",
    borderRadius: 20,
    padding: "2px 8px",
    fontSize: 10,
    fontWeight: 800,
    letterSpacing: 0.5,
  },
  liveDot: {
    width: 6,
    height: 6,
    borderRadius: "50%",
    background: "#dc2626",
    display: "inline-block",
    animation: "pulse 1s ease-in-out infinite",
  },
  timelineMessage: {
    margin: 0,
    fontSize: 13,
    color: "#374151",
    fontWeight: 500,
    lineHeight: 1.4,
  },
  timelineMeta: {
    display: "flex",
    gap: 14,
    fontSize: 11,
    color: "#9ca3af",
    marginTop: 4,
    flexWrap: "wrap" as const,
  },
  courierLinkRow: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 16,
    paddingTop: 14,
    borderTop: "1px solid #f3f4f6",
    flexWrap: "wrap" as const,
    gap: 8,
  },
  courierLink: {
    color: "#6366f1",
    fontSize: 13,
    fontWeight: 600,
    textDecoration: "none",
  },
  refreshBtn: {
    background: "#f9fafb",
    border: "1px solid #e5e7eb",
    borderRadius: 8,
    padding: "6px 12px",
    fontSize: 12,
    color: "#6b7280",
    cursor: "pointer",
    fontWeight: 600,
  },
  retryBtn: {
    marginTop: 10,
    background: "#6366f1",
    color: "#fff",
    border: "none",
    borderRadius: 8,
    padding: "8px 16px",
    cursor: "pointer",
    fontWeight: 600,
    fontSize: 13,
  },
};
