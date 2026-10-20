
const nodemailer = require("nodemailer");

let transporter = null;

const getTransporter = () => {
  if (transporter) {
    return transporter;
  }

  const {
    EMAIL_HOST,
    EMAIL_PORT,
    EMAIL_SECURE,
    EMAIL_USER,
    EMAIL_PASSWORD,
  } = process.env;

  if (!EMAIL_HOST || !EMAIL_PORT || !EMAIL_USER || !EMAIL_PASSWORD) {
    throw new Error(
      "Email service is not configured. Please configure the email settings in the backend .env file."
    );
  }

  transporter = nodemailer.createTransport({
    host: EMAIL_HOST,
    port: Number(EMAIL_PORT),
    secure: EMAIL_SECURE === "true",
    auth: {
      user: EMAIL_USER,
      pass: EMAIL_PASSWORD,
    },
  });

  return transporter;
};

const sendEmail = async ({ to, subject, text, html }) => {
  if (!to || !String(to).trim()) {
    throw new Error("Recipient email is required.");
  }

  if (!subject || !String(subject).trim()) {
    throw new Error("Email subject is required.");
  }

  if (!text && !html) {
    throw new Error("Email text or HTML content is required.");
  }

  const emailTransporter = getTransporter();

  return emailTransporter.sendMail({
    from: process.env.EMAIL_FROM || process.env.EMAIL_USER,
    to: String(to).trim(),
    subject: String(subject).trim(),
    ...(text ? { text } : {}),
    ...(html ? { html } : {}),
  });
};

module.exports = {
  sendEmail,
};
