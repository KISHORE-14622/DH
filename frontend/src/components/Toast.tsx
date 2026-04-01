import { useEffect } from "react";
import { AnimatePresence, motion } from "framer-motion";

export const Toast = ({
  message,
  type = "info",
  onClose,
  duration = 2600
}: {
  message: string;
  type?: "success" | "error" | "info";
  onClose: () => void;
  duration?: number;
}) => {
  useEffect(() => {
    const timer = setTimeout(onClose, duration);
    return () => clearTimeout(timer);
  }, [duration, onClose]);

  return (
    <AnimatePresence>
      {message ? (
        <motion.div
          className={`toast toast-${type}`}
          initial={{ opacity: 0, y: 20, scale: 0.96 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 12, scale: 0.98 }}
          transition={{ duration: 0.25 }}
          role="status"
        >
          <span>{message}</span>
          <button className="toast-close" onClick={onClose}>
            x
          </button>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
};
