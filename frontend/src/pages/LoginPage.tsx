import { FormEvent, useState } from "react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export const LoginPage = () => {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setIsSubmitting(true);

    try {
      await login(email, password);
      navigate("/dashboard");
    } catch (error) {
      const message =
        (error as { response?: { data?: { message?: string; details?: string } } })?.response?.data?.message ||
        "Login failed. Please check your credentials.";
      setError("Login failed. Please check your credentials.");
      setError(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <motion.section
      className="login-shell"
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45 }}
    >
      <aside className="login-showcase motion-float">
        <p className="eyebrow">Golf Charity Platform</p>
        <h2>Play Monthly. Fund Real Change.</h2>
        <p>
          Your score entries power transparent contributions while keeping every draw exciting and fair.
        </p>
        <div className="login-showcase-metrics">
          <article>
            <strong>100%</strong>
            <span>Traceable donation flow</span>
          </article>
          <article>
            <strong>5 picks</strong>
            <span>Needed to enter every draw</span>
          </article>
          <article>
            <strong>3 tiers</strong>
            <span>Multiple winner levels</span>
          </article>
        </div>
      </aside>

      <motion.form className="auth-card login-card" onSubmit={handleSubmit} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}>
        <p className="eyebrow">Member Sign In</p>
        <h2>Welcome back</h2>
        <p className="muted-text">Access your dashboard, update picks, and track your impact.</p>
        <input type="email" placeholder="Email address" value={email} onChange={(e) => setEmail(e.target.value)} required />
        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />
        {error && <p className="error-text">{error}</p>}
        <button type="submit" disabled={isSubmitting}>
          {isSubmitting ? "Signing in..." : "Login"}
        </button>
      </motion.form>
    </motion.section>
  );
};
