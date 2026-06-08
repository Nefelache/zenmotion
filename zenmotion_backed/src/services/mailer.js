import nodemailer from "nodemailer";
import { config } from "../config/index.js";
import { logger } from "../utils/logger.js";
import { formatMoney } from "../utils/pricing.js";

let transporter = null;

function getTransporter() {
  if (transporter) return transporter;
  if (config.mail.configured) {
    transporter = nodemailer.createTransport({
      host: config.mail.host,
      port: config.mail.port,
      secure: config.mail.secure,
      auth: config.mail.user ? { user: config.mail.user, pass: config.mail.pass } : undefined,
    });
  } else {
    // No SMTP configured → log emails to the console so the flow still works in dev.
    transporter = {
      sendMail: async (msg) => {
        logger.info("[mailer:console] (no SMTP configured) email not sent, preview below:");
        logger.info(`  to:      ${msg.to}`);
        logger.info(`  subject: ${msg.subject}`);
        logger.info(`  text:    ${(msg.text || "").replace(/\n/g, "\n           ")}`);
        return { messageId: "console-" + Date.now() };
      },
    };
  }
  return transporter;
}

async function send({ to, subject, text, html, replyTo }) {
  try {
    const info = await getTransporter().sendMail({
      from: config.mail.from,
      to,
      subject,
      text,
      html,
      replyTo,
    });
    return { ok: true, id: info.messageId };
  } catch (err) {
    logger.error("Failed to send email:", err.message);
    return { ok: false, error: err.message };
  }
}

/* --------------------------- templated emails --------------------------- */

export async function sendOrderConfirmation(order, items, accessLink) {
  const lines = items
    .map((i) => {
      const opt = i.options && Object.keys(i.options).length
        ? " (" + Object.entries(i.options).map(([k, v]) => `${k}: ${v}`).join(", ") + ")"
        : "";
      return `  - ${i.name}${opt} ×${i.qty} — ${formatMoney(i.lineCents, order.currency)}`;
    })
    .join("\n");

  const hasDigital = items.some((i) => i.type === "digital");
  const accessBlock = hasDigital && accessLink
    ? `\nYour digital course is ready. Access it here:\n  ${accessLink}\n`
    : "";

  const text =
    `Thank you for your order!\n\n` +
    `Order: ${order.id}\n` +
    `${lines}\n\n` +
    `Subtotal: ${formatMoney(order.subtotalCents, order.currency)}\n` +
    `Shipping: ${order.shippingCents ? formatMoney(order.shippingCents, order.currency) : "Free / digital"}\n` +
    `Total:    ${formatMoney(order.totalCents, order.currency)}\n` +
    accessBlock +
    `\nThis charge appears as ${config.store.statementDescriptor} on your statement.\n` +
    `Covered by our 90-day money-back guarantee. Questions? ${config.mail.supportEmail}\n\n` +
    `— ZenMotion`;

  return send({ to: order.email, subject: `Your ZenMotion order ${order.id}`, text });
}

export async function sendContactReceived(message) {
  // Notify support inbox.
  const supportText =
    `New contact message\n\n` +
    `From: ${message.name} <${message.email}>\n` +
    `Subject: ${message.subject || "(none)"}\n\n` +
    `${message.message}\n`;
  await send({
    to: config.mail.supportEmail,
    subject: `[Contact] ${message.subject || "New message"} — ${message.name}`,
    text: supportText,
    replyTo: message.email,
  });

  // Auto-acknowledge the sender.
  const ackText =
    `Hi ${message.name},\n\n` +
    `Thanks for reaching out to ZenMotion. We've received your message and a real person will reply, ` +
    `usually within one business day (Mon–Fri, 9:00–18:00 HKT).\n\n` +
    `For reference, here's what you sent:\n"${message.message}"\n\n` +
    `— The ZenMotion team\n${config.mail.supportEmail}`;
  return send({ to: message.email, subject: "We received your message — ZenMotion", text: ackText });
}
