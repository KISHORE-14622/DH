import { motion } from "framer-motion";

export const HomePage = () => {
  return (
    <div className="hero-grid cinematic-grid">
      <motion.section
        className="hero-card"
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <p className="eyebrow">Golf x Giving x Rewards</p>
        <h2>Turn your monthly rounds into impact and prizes.</h2>
        <p>
          Subscribe, submit your last 5 Stableford scores, join monthly draws, and direct part of your plan to a
          charity you care about.
        </p>
        <div className="stat-strip">
          <motion.div initial={{ opacity: 0, scale: 0.92 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.15 }}>
            <span>40%</span>
            <small>Jackpot tier</small>
          </motion.div>
          <motion.div initial={{ opacity: 0, scale: 0.92 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.25 }}>
            <span>5</span>
            <small>Latest scores tracked</small>
          </motion.div>
          <motion.div initial={{ opacity: 0, scale: 0.92 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.35 }}>
            <span>10%+</span>
            <small>Min charity contribution</small>
          </motion.div>
        </div>
      </motion.section>

      <motion.section
        className="hero-card accent"
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1, duration: 0.5 }}
      >
        <h3>How it works</h3>
        <ol>
          <li>Choose monthly or yearly subscription.</li>
          <li>Add latest 5 scores (1 to 45 Stableford).</li>
          <li>Pick a charity with at least 10% contribution.</li>
          <li>Enter monthly draws and track winnings.</li>
        </ol>
      </motion.section>

      <motion.section
        className="hero-card impact-card full-width"
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2, duration: 0.5 }}
      >
        <h3>Impact-first experience</h3>
        <p>
          This platform is built around charitable outcomes, transparent prize math, and monthly excitement. Every
          subscriber action is tied to measurable contribution and traceable rewards.
        </p>
      </motion.section>
    </div>
  );
};
