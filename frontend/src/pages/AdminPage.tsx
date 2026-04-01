import { FormEvent, useState } from "react";
import { motion } from "framer-motion";
import { apiClient } from "../api/client";
import { Toast } from "../components/Toast";

type AdminWinner = {
  _id: string;
  matchCount: number;
  prizeAmount: number;
  verificationStatus: "pending" | "approved" | "rejected";
  payoutStatus: "pending" | "paid";
  proofUrl: string;
  userId?: {
    name?: string;
    email?: string;
  };
};

type DrawResult = {
  mode: "random" | "algorithmic";
  simulated: boolean;
  winningNumbers: number[];
  winnerCounts?: {
    match5?: number;
    match4?: number;
    match3?: number;
  };
  prizePool?: {
    total?: number;
    tier5?: number;
    tier4?: number;
    tier3?: number;
    rollover?: number;
    perWinner?: {
      match5?: number;
      match4?: number;
      match3?: number;
    };
  };
};

const resolveProofUrl = (proofUrl: string) => {
  if (proofUrl.startsWith("http://") || proofUrl.startsWith("https://")) {
    return proofUrl;
  }

  return `http://localhost:4000${proofUrl}`;
};

export const AdminPage = () => {
  const [mode, setMode] = useState<"random" | "algorithmic">("random");
  const [result, setResult] = useState<DrawResult | null>(null);
  const [message, setMessage] = useState("");
  const [winners, setWinners] = useState<AdminWinner[]>([]);
  const [reportSummary, setReportSummary] = useState<{
    totalUsers: number;
    activeSubscribers: number;
    totalPrizePool: number;
    winnerVerification: { pending?: number; approved?: number; rejected?: number };
  } | null>(null);
  const [notificationSummary, setNotificationSummary] = useState<{ sent: number; failed: number; skipped: number } | null>(null);
  const [loadingAction, setLoadingAction] = useState("");

  const parseApiError = (error: unknown) => {
    const fallback = "Something went wrong. Please try again.";
    if (typeof error !== "object" || error === null) return fallback;

    const maybe = error as {
      response?: { data?: { message?: string; details?: string } };
      message?: string;
    };

    const message = maybe.response?.data?.message || maybe.message || fallback;
    const details = maybe.response?.data?.details;

    return details ? `${message}: ${details}` : message;
  };

  const loadWinners = async () => {
    setLoadingAction("winners");
    try {
      const { data } = await apiClient.get("/winners/admin");
      setWinners(data.winners || []);
    } catch (error) {
      setMessage(parseApiError(error));
    } finally {
      setLoadingAction("");
    }
  };

  const loadReports = async () => {
    setLoadingAction("reports");
    try {
      const { data } = await apiClient.get("/reports/summary");
      setReportSummary(data);
    } catch (error) {
      setMessage(parseApiError(error));
    } finally {
      setLoadingAction("");
    }
  };

  const loadNotificationReport = async () => {
    setLoadingAction("notifications");
    try {
      const { data } = await apiClient.get("/reports/notifications");
      setNotificationSummary(data.summary);
    } catch (error) {
      setMessage(parseApiError(error));
    } finally {
      setLoadingAction("");
    }
  };

  const runSimulation = async () => {
    setLoadingAction("simulate");
    try {
      const { data } = await apiClient.post("/draws/simulate", { mode });
      setResult(data);
      setMessage("Simulation complete.");
    } catch (error) {
      setMessage(parseApiError(error));
    } finally {
      setLoadingAction("");
    }
  };

  const publishDraw = async () => {
    setLoadingAction("publish");
    try {
      const { data } = await apiClient.post("/draws/publish", { mode });
      setResult(data);
      setMessage("Draw published.");
    } catch (error) {
      setMessage(parseApiError(error));
    } finally {
      setLoadingAction("");
    }
  };

  const createCharity = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setLoadingAction("charity");
    const formElement = event.currentTarget;
    const form = new FormData(formElement);

    try {
      await apiClient.post("/charities", {
        name: String(form.get("name") || "").trim(),
        description: String(form.get("description") || "").trim(),
        imageUrl: String(form.get("imageUrl") || "").trim() || undefined,
        featured: Boolean(form.get("featured"))
      });

      setMessage("Charity created.");
      formElement.reset();
    } catch (error) {
      setMessage(parseApiError(error));
    } finally {
      setLoadingAction("");
    }
  };

  const reviewWinner = async (winnerId: string, decision: "approve" | "reject") => {
    setLoadingAction(`review-${winnerId}`);
    try {
      await apiClient.post(`/winners/${winnerId}/review`, {
        decision,
        reviewNote: decision === "approve" ? "Verified by admin" : "Proof did not match records"
      });
      setMessage(`Winner ${decision}d.`);
      await loadWinners();
    } catch (error) {
      setMessage(parseApiError(error));
    } finally {
      setLoadingAction("");
    }
  };

  const markPaid = async (winnerId: string) => {
    setLoadingAction(`paid-${winnerId}`);
    try {
      await apiClient.post(`/winners/${winnerId}/mark-paid`);
      setMessage("Winner marked paid.");
      await loadWinners();
    } catch (error) {
      setMessage(parseApiError(error));
    } finally {
      setLoadingAction("");
    }
  };

  const prizeTotal = result?.prizePool?.total || 0;
  const tierRows = [
    {
      key: "match5",
      label: "Match 5",
      className: "tier-gold",
      winners: result?.winnerCounts?.match5 || 0,
      pool: result?.prizePool?.tier5 || 0,
      perWinner: result?.prizePool?.perWinner?.match5 || 0
    },
    {
      key: "match4",
      label: "Match 4",
      className: "tier-silver",
      winners: result?.winnerCounts?.match4 || 0,
      pool: result?.prizePool?.tier4 || 0,
      perWinner: result?.prizePool?.perWinner?.match4 || 0
    },
    {
      key: "match3",
      label: "Match 3",
      className: "tier-bronze",
      winners: result?.winnerCounts?.match3 || 0,
      pool: result?.prizePool?.tier3 || 0,
      perWinner: result?.prizePool?.perWinner?.match3 || 0
    }
  ];

  return (
    <motion.div className="grid-two" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.45 }}>
      {message && <Toast message={message} type={message.toLowerCase().includes("failed") ? "error" : "success"} onClose={() => setMessage("")} />}
      <motion.section className="panel glow-panel" initial={{ y: 18, opacity: 0 }} animate={{ y: 0, opacity: 1 }}>
        <h2>Draw Management</h2>
        <label>
          Mode
          <select value={mode} onChange={(e) => setMode(e.target.value as "random" | "algorithmic")}>
            <option value="random">Random</option>
            <option value="algorithmic">Algorithmic</option>
          </select>
        </label>
        <div className="btn-row">
          <button onClick={runSimulation} disabled={loadingAction === "simulate" || loadingAction === "publish"}>
            {loadingAction === "simulate" ? "Simulating..." : "Run Simulation"}
          </button>
          <button onClick={publishDraw} disabled={loadingAction === "simulate" || loadingAction === "publish"}>
            {loadingAction === "publish" ? "Publishing..." : "Publish Draw"}
          </button>
        </div>
        {result && (
          <motion.div
            className="draw-result-grid"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35 }}
          >
            <article className="draw-result-card draw-result-hero">
              <p className="draw-result-label">Draw Summary</p>
              <h3>{result.simulated ? "Simulation Preview" : "Published Draw"}</h3>
              <p>
                Mode: <strong>{result.mode}</strong>
              </p>
              <div className="winning-number-strip">
                {(result.winningNumbers || []).map((num) => (
                  <span key={num}>{num}</span>
                ))}
              </div>
            </article>

            <article className="draw-result-card">
              <p className="draw-result-label">Winner Tiers</p>
              <div className="tier-pill-grid">
                {tierRows.map((tier) => (
                  <div key={tier.key} className={`tier-pill ${tier.className}`}>
                    <span>{tier.label}</span>
                    <strong>{tier.winners}</strong>
                  </div>
                ))}
              </div>
            </article>

            <article className="draw-result-card">
              <p className="draw-result-label">Prize Pool (INR)</p>
              <div className="tier-lines">
                <div>
                  <span>Total</span>
                  <strong>{(result.prizePool?.total || 0).toFixed(2)}</strong>
                </div>
                <div>
                  <span>Rollover</span>
                  <strong>{(result.prizePool?.rollover || 0).toFixed(2)}</strong>
                </div>
              </div>
              <div className="sparkline-stack">
                {tierRows.map((tier) => {
                  const percent = prizeTotal > 0 ? (tier.pool / prizeTotal) * 100 : 0;
                  return (
                    <div key={`pool-${tier.key}`} className="sparkline-row">
                      <div className="sparkline-head">
                        <span className={tier.className}>{tier.label}</span>
                        <strong>{tier.pool.toFixed(2)}</strong>
                      </div>
                      <div className="sparkline-track">
                        <motion.div
                          className={`sparkline-fill ${tier.className}`}
                          initial={{ width: 0 }}
                          animate={{ width: `${Math.max(percent, 3)}%` }}
                          transition={{ duration: 0.55, ease: "easeOut" }}
                        />
                      </div>
                      <small>{percent.toFixed(1)}%</small>
                    </div>
                  );
                })}
              </div>
            </article>

            <article className="draw-result-card">
              <p className="draw-result-label">Per Winner (INR)</p>
              <div className="sparkline-stack">
                {tierRows.map((tier) => {
                  const maxPerWinner = Math.max(...tierRows.map((item) => item.perWinner), 1);
                  const width = (tier.perWinner / maxPerWinner) * 100;

                  return (
                    <div key={`per-${tier.key}`} className="sparkline-row">
                      <div className="sparkline-head">
                        <span className={tier.className}>{tier.label}</span>
                        <strong>{tier.perWinner.toFixed(2)}</strong>
                      </div>
                      <div className="sparkline-track">
                        <motion.div
                          className={`sparkline-fill ${tier.className}`}
                          initial={{ width: 0 }}
                          animate={{ width: `${Math.max(width, 3)}%` }}
                          transition={{ duration: 0.55, ease: "easeOut" }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </article>
          </motion.div>
        )}
        <div className="btn-row">
          <button className="ghost-btn" onClick={loadWinners}>
            {loadingAction === "winners" ? "Loading..." : "Refresh Winners"}
          </button>
          <button className="ghost-btn" onClick={loadReports}>
            {loadingAction === "reports" ? "Loading..." : "Load Reports"}
          </button>
          <button className="ghost-btn" onClick={loadNotificationReport}>
            {loadingAction === "notifications" ? "Loading..." : "Load Notifications"}
          </button>
        </div>
        {reportSummary && (
          <div className="report-grid">
            <article className="report-card">
              <p>Total users</p>
              <strong>{reportSummary.totalUsers}</strong>
            </article>
            <article className="report-card">
              <p>Active subscribers</p>
              <strong>{reportSummary.activeSubscribers}</strong>
            </article>
            <article className="report-card">
              <p>Total prize pool</p>
              <strong>INR {reportSummary.totalPrizePool.toFixed(2)}</strong>
            </article>
            <article className="report-card">
              <p>Verification queue</p>
              <strong>
                P:{reportSummary.winnerVerification.pending || 0} A:{reportSummary.winnerVerification.approved || 0} R:
                {reportSummary.winnerVerification.rejected || 0}
              </strong>
            </article>
          </div>
        )}
        {notificationSummary && (
          <div className="report-grid">
            <article className="report-card">
              <p>Emails sent</p>
              <strong>{notificationSummary.sent}</strong>
            </article>
            <article className="report-card">
              <p>Emails failed</p>
              <strong>{notificationSummary.failed}</strong>
            </article>
            <article className="report-card">
              <p>Emails skipped</p>
              <strong>{notificationSummary.skipped}</strong>
            </article>
          </div>
        )}
      </motion.section>

      <motion.section className="panel glow-panel" initial={{ y: 18, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.08 }}>
        <h2>Create Charity</h2>
        <form className="stack-form" onSubmit={createCharity}>
          <input name="name" placeholder="Charity name" minLength={2} required />
          <textarea name="description" placeholder="Description (min 10 chars)" minLength={10} required rows={4} />
          <input name="imageUrl" placeholder="Image URL" />
          <label className="checkbox-row">
            <input name="featured" type="checkbox" /> Featured
          </label>
          <button type="submit" disabled={loadingAction === "charity"}>
            {loadingAction === "charity" ? "Saving..." : "Save Charity"}
          </button>
        </form>
      </motion.section>

      <motion.section className="panel full-width glow-panel" initial={{ y: 18, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.14 }}>
        <h2>Winner Verification Queue</h2>
        {winners.length === 0 && <p>No winner records loaded.</p>}
        <div className="winner-list">
          {winners.map((winner) => (
            <article key={winner._id} className="winner-card">
              <p>
                {winner.userId?.name || "Unknown"} ({winner.userId?.email || "-"})
              </p>
              <p>
                Match {winner.matchCount} | INR {winner.prizeAmount.toFixed(2)}
              </p>
              <p>
                Verification: {winner.verificationStatus} | Payout: {winner.payoutStatus}
              </p>
              {winner.proofUrl && (
                <a href={resolveProofUrl(winner.proofUrl)} target="_blank" rel="noreferrer">
                  View Proof
                </a>
              )}
              <div className="btn-row">
                <button onClick={() => reviewWinner(winner._id, "approve")} disabled={loadingAction.startsWith("review-")}>
                  {loadingAction === `review-${winner._id}` ? "Approving..." : "Approve"}
                </button>
                <button
                  className="ghost-btn"
                  onClick={() => reviewWinner(winner._id, "reject")}
                  disabled={loadingAction.startsWith("review-")}
                >
                  {loadingAction === `review-${winner._id}` ? "Rejecting..." : "Reject"}
                </button>
                <button onClick={() => markPaid(winner._id)} disabled={loadingAction === `paid-${winner._id}`}>
                  {loadingAction === `paid-${winner._id}` ? "Updating..." : "Mark Paid"}
                </button>
              </div>
            </article>
          ))}
        </div>
      </motion.section>
    </motion.div>
  );
};
