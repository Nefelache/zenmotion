import crypto from "node:crypto";
import { db } from "../db/index.js";

const insertStmt = db.prepare(
  `INSERT INTO contact_messages (id, name, email, subject, message, ip, user_agent)
   VALUES (@id, @name, @email, @subject, @message, @ip, @user_agent)`
);

export function create({ name, email, subject, message, ip, userAgent }) {
  const id = crypto.randomUUID();
  insertStmt.run({
    id,
    name,
    email: email.toLowerCase(),
    subject: subject || null,
    message,
    ip: ip || null,
    user_agent: userAgent || null,
  });
  return id;
}
