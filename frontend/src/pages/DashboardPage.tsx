import { FormEvent, useEffect, useMemo, useState } from "react";
import { apiClient } from "../api/client";
import { Toast } from "../components/Toast";
import { useAuth } from "../context/AuthContext";

type Score = {
  _id: string;
  score: number;
  playedAt: string;
};

type Winner = {
  _id: string;
  matchCount: number;
  prizeAmount: number;
  verificationStatus: "pending" | "approved" | "rejected";
  payoutStatus: "pending" | "paid";
  proofUrl: string;
};

const resolveProofUrl = (proofUrl: string) => {
  if (proofUrl.startsWith("http://") || proofUrl.startsWith("https://")) {
    return proofUrl;
  }

  return `http://localhost:4000${proofUrl}`;
};

export const DashboardPage = () => {
  const { user } = useAuth();
  const [scores, setScores] = useState<Score[]>([]);
  const [winners, setWinners] = useState<Winner[]>([]);
  const [charities, setCharities] = useState<Array<{ _id: string; name: string }>>([]);
  const [selectedCharityId, setSelectedCharityId] = useState("");
  const [contributionPercentage, setContributionPercentage] = useState("10");
  const [dashboardData, setDashboardData] = useState<{
    participation?: { drawsEntered: number; upcomingDrawMonthKey: string | null };
    winnings?: { pendingAmount: number; paidAmount: number };
  } | null>(null);
  const [scoreValue, setScoreValue] = useState("");
  const [playedAt, setPlayedAt] = useState("");
  const [message, setMessage] = useState("");

  const canEditScores = user?.subscription.status === "active";

  const loadScores = async () => {
    if (!canEditScores) {
      setScores([]);
      return;
    }

    const { data } = await apiClient.get("/scores");
    setScores(data.scores);
  };

  const loadWinners = async () => {
    const { data } = await apiClient.get("/winners/me");
    setWinners(data.winners || []);
  };

  const loadCharities = async () => {
    const { data } = await apiClient.get("/charities");
    setCharities((data.charities || []).map((item: { _id: string; name: string }) => ({ _id: item._id, name: item.name })));
  };

  const loadDashboard = async () => {
    const { data } = await apiClient.get("/dashboard/me");
    setDashboardData({
      participation: data.participation,
      winnings: data.winnings
    });
  };

  useEffect(() => {
    void loadScores();
    void loadWinners();
    void loadCharities();
    void loadDashboard();
  }, [canEditScores]);

  const summary = useMemo(() => {
    if (!scores.length) return "No scores yet";
    const avg = scores.reduce((acc, item) => acc + item.score, 0) / scores.length;
    return `Average (latest ${scores.length}) ${avg.toFixed(1)}`;
  }, [scores]);

  const addScore = async (event: FormEvent) => {
    event.preventDefault();

    try {
      await apiClient.post("/scores", {
        score: Number(scoreValue),
        playedAt: new Date(playedAt).toISOString()
      });
      setMessage("Score saved.");
      setScoreValue("");
      setPlayedAt("");
      await loadScores();
    } catch {
      setMessage("Unable to save score.");
    }
  };

  const activateSubscription = async (plan: "monthly" | "yearly") => {
    try {
      await apiClient.post("/subscriptions/mock-activate", { plan });
      window.location.reload();
    } catch {
      setMessage("Unable to activate subscription.");
    }
  };

  const startCheckout = async (plan: "monthly" | "yearly") => {
    try {
      const { data } = await apiClient.post("/subscriptions/checkout-session", { plan });
      if (data.url) {
        window.location.href = data.url;
      }
    } catch {
      setMessage("Stripe checkout is not configured yet. Use mock activation for now.");
    }
  };

  const cancelSubscription = async () => {
    try {
      await apiClient.post("/subscriptions/cancel");
      window.location.reload();
    } catch {
      setMessage("Unable to cancel subscription.");
    }
  };

  const uploadProof = async (winnerId: string, file: File) => {
    const formData = new FormData();
    formData.append("proof", file);

    try {
      await apiClient.post(`/winners/${winnerId}/proof`, formData, {
        headers: {
          "Content-Type": "multipart/form-data"
        }
      });
      setMessage("Proof uploaded.");
      await loadWinners();
    } catch {
      setMessage("Proof upload failed.");
    }
  };

  const saveCharitySelection = async (event: FormEvent) => {
    event.preventDefault();

    try {
      await apiClient.post("/charities/select", {
        charityId: selectedCharityId,
        contributionPercentage: Number(contributionPercentage)
      });
      setMessage("Charity preference saved.");
    } catch {
      setMessage("Unable to save charity selection.");
    }
  };

  const setLapsed = async () => {
    try {
      await apiClient.post("/subscriptions/mock-lapse");
      window.location.reload();
    } catch {
      setMessage("Unable to change subscription state.");
    }
  };

  return (
    <div className="grid-two">
      {message && <Toast message={message} type={message.toLowerCase().includes("unable") || message.toLowerCase().includes("failed") ? "error" : "success"} onClose={() => setMessage("")} />}
      <section className="panel">
        <h2>Your Subscription</h2>
        <p>Status: {user?.subscription.status}</p>
        <p>Plan: {user?.subscription.plan}</p>
        <p>Renewal: {user?.subscription.renewalDate ? new Date(user.subscription.renewalDate).toDateString() : "-"}</p>
        <div className="btn-row">
          <button onClick={() => startCheckout("monthly")}>Stripe Monthly</button>
          <button onClick={() => startCheckout("yearly")}>Stripe Yearly</button>
          <button className="ghost-btn" onClick={cancelSubscription}>
            Cancel at Period End
          </button>
        </div>
        <div className="btn-row">
          <button onClick={() => activateSubscription("monthly")}>Activate Monthly</button>
          <button onClick={() => activateSubscription("yearly")}>Activate Yearly</button>
          <button className="ghost-btn" onClick={setLapsed}>
            Set Lapsed
          </button>
        </div>
      </section>

      <section className="panel">
        <h2>Latest Scores</h2>
        <p>{summary}</p>
        {!canEditScores && <p className="warning">Activate subscription to enter scores and join draws.</p>}
        <form onSubmit={addScore} className="inline-form">
          <input
            type="number"
            min={1}
            max={45}
            placeholder="Stableford score"
            value={scoreValue}
            onChange={(e) => setScoreValue(e.target.value)}
            required
            disabled={!canEditScores}
          />
          <input
            type="date"
            value={playedAt}
            onChange={(e) => setPlayedAt(e.target.value)}
            required
            disabled={!canEditScores}
          />
          <button disabled={!canEditScores} type="submit">
            Add Score
          </button>
        </form>
        <ul>
          {scores.map((item) => (
            <li key={item._id}>
              {item.score} on {new Date(item.playedAt).toLocaleDateString()}
            </li>
          ))}
        </ul>
      </section>

      <section className="panel">
        <h2>Charity Selection</h2>
        <form className="stack-form" onSubmit={saveCharitySelection}>
          <select value={selectedCharityId} onChange={(event) => setSelectedCharityId(event.target.value)} required>
            <option value="">Select a charity</option>
            {charities.map((charity) => (
              <option key={charity._id} value={charity._id}>
                {charity.name}
              </option>
            ))}
          </select>
          <input
            type="number"
            min={10}
            max={100}
            value={contributionPercentage}
            onChange={(event) => setContributionPercentage(event.target.value)}
            required
          />
          <button type="submit">Save Preference</button>
        </form>
      </section>

      <section className="panel">
        <h2>Participation & Winnings</h2>
        <p>Draws entered: {dashboardData?.participation?.drawsEntered ?? 0}</p>
        <p>Upcoming draw key: {dashboardData?.participation?.upcomingDrawMonthKey || "TBD"}</p>
        <p>Pending payout: INR {(dashboardData?.winnings?.pendingAmount ?? 0).toFixed(2)}</p>
        <p>Paid payout: INR {(dashboardData?.winnings?.paidAmount ?? 0).toFixed(2)}</p>
      </section>

      <section className="panel full-width">
        <h2>Winner Verification</h2>
        {winners.length === 0 && <p>No winner records yet.</p>}
        <div className="winner-list">
          {winners.map((winner) => (
            <article key={winner._id} className="winner-card">
              <p>Match Tier: {winner.matchCount}</p>
              <p>Prize: INR {winner.prizeAmount.toFixed(2)}</p>
              <p>Verification: {winner.verificationStatus}</p>
              <p>Payout: {winner.payoutStatus}</p>
              {winner.proofUrl ? (
                <a href={resolveProofUrl(winner.proofUrl)} target="_blank" rel="noreferrer">
                  View Proof
                </a>
              ) : (
                <label className="file-label">
                  Upload proof
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(event) => {
                      const file = event.target.files?.[0];
                      if (file) {
                        void uploadProof(winner._id, file);
                      }
                    }}
                  />
                </label>
              )}
            </article>
          ))}
        </div>
      </section>
    </div>
  );
};
