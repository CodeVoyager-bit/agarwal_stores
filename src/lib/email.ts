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

/** The site's own address, for links in emails and Google's return trip. */
export function appOrigin() {
  if (process.env.APP_ORIGIN) return process.env.APP_ORIGIN.replace(/\/$/, "");
  if (process.env.VERCEL_PROJECT_PRODUCTION_URL) return `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`;
  return "http://127.0.0.1:3000";
}

const WHY: Record<string, { subject: string; heading: string; lead: string }> = {
  "sign-in": { subject: "is your Agarwal Stores login code", heading: "Your login code", lead: "Enter this code on the Agarwal Stores website to log in or finish creating your account." },
  "change-email": { subject: "confirms your new email at Agarwal Stores", heading: "Confirm your email", lead: "Enter this code on your Account page to add this email. Then you can log in with it too." },
};

/**
 * The code email, in the shop's festive look: saffron header, a marigold garland, the code in big boxes.
 * Tables and inline styles, because that's what email apps (Gmail, Outlook, phones) reliably show.
 */
export function codeMail(code: string, type = "sign-in") {
  const why = WHY[type] ?? { subject: "is your Agarwal Stores code", heading: "Your code", lead: "Enter this code on the Agarwal Stores website." };
  const site = appOrigin();
  const phone = process.env.SHOP_PHONE;
  const font = "font-family:'Segoe UI',Roboto,Helvetica,Arial,sans-serif";
  const digits = [...code]
    .map((d) => `<td style="width:46px;height:58px;background:#fff1df;border:1px solid #f6d7b3;border-radius:12px;text-align:center;${font};font-size:30px;font-weight:800;color:#7a1022">${d}</td>`)
    .join('<td style="width:8px"></td>');
  const garland = Array.from({ length: 26 }, (_, i) => `<span style="color:${["#e65100", "#2e7d32", "#ffc233", "#2e7d32"][i % 4]}">●</span>`).join("");
  return {
    subject: `${code} ${why.subject}`,
    text: `Agarwal Stores · Crackers\n\n${why.heading}: ${code}\n\n${why.lead}\nIt works for 10 minutes. Never share it: the shop will never ask you for it.\n\nDidn't ask for this? Ignore this email; nobody can use your account without the code.\n\n${site}${phone ? `\nHelp: +91 ${phone}` : ""}`,
    // charset: without it, anything that opens the HTML on its own garbles the Hindi and the garland
    html: `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head><body style="margin:0;padding:0;background:#fff8f0">
<div style="display:none;max-height:0;overflow:hidden">${why.heading}: ${code}. It works for 10 minutes.</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#fff8f0"><tr><td align="center" style="padding:28px 12px">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;background:#ffffff;border:1px solid #f0dcc8;border-radius:18px;overflow:hidden">
  <tr><td style="background:#ff9933;background-image:linear-gradient(100deg,#ff9933,#ffb43a);padding:22px 28px">
    <img src="${site}/apple-icon.png" width="36" height="36" alt="" style="vertical-align:middle;border:0;border-radius:9px;margin-right:8px">
    <span style="${font};font-size:22px;font-weight:800;color:#7a1022;vertical-align:middle">Agarwal Stores</span>
    <span style="${font};font-size:11px;font-weight:800;letter-spacing:2px;color:#ffffff;background:#c8102e;border-radius:99px;padding:4px 9px;margin-left:6px;vertical-align:3px">CRACKERS</span>
  </td></tr>
  <tr><td align="center" style="font-size:12px;line-height:12px;letter-spacing:4px;padding:6px 0 0">${garland}</td></tr>
  <tr><td style="padding:22px 28px 6px;${font}">
    <p style="margin:0 0 6px;font-size:14px;font-weight:700;color:#c8102e">शुभ दीपावली</p>
    <h1 style="margin:0 0 10px;font-size:26px;line-height:1.2;color:#7a1022">${why.heading}</h1>
    <p style="margin:0;font-size:15px;line-height:1.55;color:#2b1810">${why.lead}</p>
  </td></tr>
  <tr><td align="center" style="padding:22px 28px 8px"><table role="presentation" cellpadding="0" cellspacing="0"><tr>${digits}</tr></table></td></tr>
  <tr><td align="center" style="padding:6px 28px 24px;${font};font-size:13px;color:#6f5548">Works for <b>10 minutes</b>. Never share it: the shop will never ask you for it.</td></tr>
  <tr><td style="padding:14px 28px;background:#fff1df;${font};font-size:13px;line-height:1.5;color:#6f5548">Didn’t ask for this? Just ignore this email. Nobody can use your account without the code.</td></tr>
  <tr><td align="center" style="padding:18px 28px 22px;${font};font-size:12px;line-height:1.6;color:#a08676">
    Home delivery within 2 days · Pay cash or UPI on delivery<br>
    <a href="${site}" style="color:#c8102e;font-weight:700;text-decoration:none">${site.replace(/^https?:\/\//, "")}</a>${phone ? ` · Help: <a href="tel:+91${phone}" style="color:#c8102e;text-decoration:none">+91 ${phone}</a>` : ""}
  </td></tr>
</table></td></tr></table></body></html>`,
  };
}
