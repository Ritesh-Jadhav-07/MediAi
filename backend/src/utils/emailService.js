import nodemailer from "nodemailer";

let transporter;

const getTransporter = () => {
  if (transporter) {
    return transporter;
  }

  const { SMTP_HOST, SMTP_PORT, SMTP_SECURE, SMTP_USER, SMTP_PASS } =
    process.env;

  if (!SMTP_HOST || !SMTP_PORT || !SMTP_USER || !SMTP_PASS) {
    throw new Error("SMTP configuration is incomplete.");
  }

  transporter = nodemailer.createTransport({
    host: SMTP_HOST,
    port: Number(SMTP_PORT),
    secure: SMTP_SECURE === "true",
    auth: {
      user: SMTP_USER,
      pass: SMTP_PASS,
    },
  });

  return transporter;
};

export const sendEmail = async ({ to, subject, text, html }) => {
  try {
    if (!to || !subject || (!text && !html)) {
      throw new Error("Recipient, subject, and email content are required.");
    }

    const mailer = getTransporter();

    await mailer.sendMail({
      from: `"MediAI" <${process.env.SMTP_USER}>`,
      to,
      subject,
      text,
      html,
    });

    return { success: true };
  } catch (error) {
    console.error("MediAI email delivery failed:", error.message);

    return {
      success: false,
      error: "Email could not be sent.",
    };
  }
};

export const verifyEmailConfiguration = async () => {
  try {
    const mailer = getTransporter();
    await mailer.verify();

    return { success: true };
  } catch (error) {
    console.error("MediAI SMTP verification failed:", error.message);

    return {
      success: false,
      error: "SMTP configuration could not be verified.",
    };
  }
};