import nodemailer from "nodemailer";
import { NotificationLog } from "../models/NotificationLog.js";

let transporter = null;

const getTransporter = () => {
  if (transporter) {
    return transporter;
  }

  if (!process.env.SMTP_HOST || !process.env.SMTP_USER || !process.env.SMTP_PASS) {
    return null;
  }

  transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT || 587),
    secure: String(process.env.SMTP_SECURE || "false") === "true",
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS
    }
  });

  return transporter;
};

export const sendEmail = async ({ to, subject, html, template = "generic" }) => {
  const sender = process.env.EMAIL_FROM || process.env.SMTP_USER || "no-reply@driveforgood.local";
  const configuredTransporter = getTransporter();

  if (!configuredTransporter) {
    await NotificationLog.create({
      toEmail: to,
      subject,
      template,
      status: "skipped",
      details: "SMTP config missing"
    });

    return { skipped: true };
  }

  try {
    await configuredTransporter.sendMail({
      from: sender,
      to,
      subject,
      html
    });

    await NotificationLog.create({
      toEmail: to,
      subject,
      template,
      status: "sent"
    });

    return { sent: true };
  } catch (error) {
    await NotificationLog.create({
      toEmail: to,
      subject,
      template,
      status: "failed",
      details: error.message
    });

    return { sent: false, error: error.message };
  }
};

export const sendWelcomeEmail = async (to, name) => {
  return sendEmail({
    to,
    subject: "Welcome to Drive For Good",
    template: "welcome",
    html: `<p>Hi ${name},</p><p>Your account is ready. Subscribe, add your latest scores, and support your chosen charity.</p>`
  });
};

export const sendSubscriptionStatusEmail = async (to, status, plan) => {
  return sendEmail({
    to,
    subject: "Subscription Update",
    template: "subscription-status",
    html: `<p>Your subscription status is now <strong>${status}</strong> for the <strong>${plan}</strong> plan.</p>`
  });
};

export const sendDrawPublishedEmail = async (to, monthKey, winningNumbers) => {
  return sendEmail({
    to,
    subject: `Draw Results Published - ${monthKey}`,
    template: "draw-published",
    html: `<p>This month's draw is now live.</p><p>Winning numbers: <strong>${winningNumbers.join(", ")}</strong></p>`
  });
};

export const sendWinnerAlertEmail = async (to, matchCount, prizeAmount) => {
  return sendEmail({
    to,
    subject: "You are a winner",
    template: "winner-alert",
    html: `<p>Congratulations. You matched <strong>${matchCount}</strong> numbers.</p><p>Prize amount: <strong>INR ${prizeAmount.toFixed(2)}</strong></p>`
  });
};

export const sendWinnerReviewEmail = async (to, decision, reviewNote) => {
  return sendEmail({
    to,
    subject: `Winner Verification ${decision}`,
    template: "winner-review",
    html: `<p>Your winner verification was <strong>${decision}</strong>.</p><p>Note: ${reviewNote || "-"}</p>`
  });
};

export const sendPayoutEmail = async (to, amount) => {
  return sendEmail({
    to,
    subject: "Payout Completed",
    template: "payout",
    html: `<p>Your payout of <strong>INR ${amount.toFixed(2)}</strong> has been marked as paid.</p>`
  });
};
