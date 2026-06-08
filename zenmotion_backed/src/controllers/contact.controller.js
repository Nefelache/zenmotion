import { asyncHandler } from "../utils/errors.js";
import * as Contact from "../models/contact.model.js";
import { sendContactReceived } from "../services/mailer.js";

/**
 * POST /api/contact
 * Store the message, notify support, and auto-acknowledge the sender.
 */
export const submit = asyncHandler(async (req, res) => {
  const { name, email, subject, message } = req.body;

  const id = Contact.create({
    name,
    email,
    subject,
    message,
    ip: req.ip,
    userAgent: req.get("user-agent"),
  });

  // Fire the emails; don't fail the request if mail delivery hiccups.
  sendContactReceived({ name, email, subject, message }).catch(() => {});

  res.status(201).json({
    ok: true,
    id,
    message: "Thanks — your message has been received. We'll reply soon.",
  });
});
