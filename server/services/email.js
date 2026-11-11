import nodemailer from 'nodemailer';

export function createMailer() {
  if (!process.env.SMTP_HOST || !process.env.SMTP_USER) return null;
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT || 587),
    secure: Number(process.env.SMTP_PORT || 587) === 465,
    auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
  });
}

export async function sendReviewReminder(mailer, order) {
  await mailer.sendMail({
    from: process.env.SMTP_FROM || process.env.SMTP_USER,
    to: order.email,
    subject: 'How was your SkillConnect-HUB order?',
    text: `Hi ${order.name.split(/\s+/)[0]}, how was your order from ${order.artisan_name}? Leave a review in SkillConnect-HUB.`,
  });
}
