import nodemailer from "nodemailer";

/** Accounts made with a mobile number carry this until they add a real email; nothing is ever sent to it. */
export const placeholderEmail = (phone: string) => `${phone}@phone.fatake.invalid`;
export const isPlaceholderEmail = (email: string | null | undefined) => !email || email.endsWith("@phone.fatake.invalid");

type Mail = { to: string; subject: string; html: string; text: string };

/**
 * Sends from the shop's Hostinger mailbox over SMTP, like Agarwal Online. With no mailbox set (or
 * EMAIL_TO_LOG=true), development prints the email and its link to the server log instead.
 */
export async function sendEmail(mail: Mail) {
  if (isPlaceholderEmail(mail.to)) return;
  const { SMTP_USER, SMTP_PASS, EMAIL_FROM } = process.env;
  const dev = process.env.NODE_ENV !== "production";
  if (!SMTP_USER || !SMTP_PASS || !EMAIL_FROM || (dev && process.env.EMAIL_TO_LOG === "true")) {
    if (!dev) throw new Error("Email is not set up yet.");
    console.info(`[email to ${mail.to}] ${mail.subject}\n${mail.text}`);
    return;
  }
  // one connection per email: serverless functions don't live long enough to keep a pool
  const smtp = nodemailer.createTransport({
    host: "smtp.hostinger.com",
    port: 465,
    secure: true,
    auth: { user: SMTP_USER, pass: SMTP_PASS },
    connectionTimeout: 10_000,
    greetingTimeout: 10_000,
    socketTimeout: 10_000,
  });
  try {
    await smtp.sendMail({ from: EMAIL_FROM, ...mail });
  } catch (error) {
    console.error("Email failed:", error instanceof Error ? error.message : error);
    throw new Error("We couldn't send the email. Please try again in a minute.");
  }
}

const esc = (text: string) => text.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]!);

/** One plain, festive email with a single button; the text version carries the same link. */
function letter(name: string, lead: string, button: string, url: string, after: string): Pick<Mail, "html" | "text"> {
  const hello = name && name !== "Customer" ? `Namaste ${name},` : "Namaste,";
  return {
    text: `${hello}\n\n${lead}\n\n${button}: ${url}\n\n${after}\n\nAgarwal Stores · Crackers`,
    html: `<div style="font-family:system-ui,sans-serif;max-width:520px;margin:auto;padding:24px;color:#2b1810">
<p style="font-size:20px;font-weight:800;color:#7a1022;margin:0 0 16px">Agarwal Stores · Crackers</p>
<p>${esc(hello)}</p><p>${esc(lead)}</p>
<p style="margin:24px 0"><a href="${esc(url)}" style="background:#c8102e;color:#fff;padding:12px 20px;border-radius:10px;text-decoration:none;font-weight:700">${esc(button)}</a></p>
<p style="color:#6f5548;font-size:14px">${esc(after)}</p></div>`,
  };
}

export const verifyEmailMail = (name: string, url: string) => ({
  subject: "Confirm your email for Agarwal Stores",
  ...letter(name, "Please confirm this email address so you can log in with it and get order updates.", "Confirm Email", url, "The link works for 24 hours. If you didn't ask for this, ignore this email."),
});

export const resetPasswordMail = (name: string, url: string) => ({
  subject: "Set a new password for Agarwal Stores",
  ...letter(name, "Someone asked to set a new password for your account. Tap the button to choose one.", "Set New Password", url, "The link works for 1 hour. If you didn't ask for this, ignore this email; your password stays the same."),
});
