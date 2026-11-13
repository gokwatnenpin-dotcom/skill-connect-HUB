export function createMailer() {
  if (!process.env.BREVO_API_KEY || !process.env.BREVO_SENDER_EMAIL) return null;
  return {
    async sendMail({ to, subject, text, html }) {
      const response = await fetch('https://api.brevo.com/v3/smtp/email', {
        method: 'POST',
        headers: { accept: 'application/json', 'api-key': process.env.BREVO_API_KEY, 'content-type': 'application/json' },
        body: JSON.stringify({
          sender: { email: process.env.BREVO_SENDER_EMAIL, name: process.env.BREVO_SENDER_NAME || 'SkillConnect-HUB' },
          to: [{ email: to }],
          subject,
          textContent: text,
          ...(html ? { htmlContent: html } : {}),
        }),
      });
      if (!response.ok) throw new Error(`Brevo email failed with status ${response.status}`);
    },
  };
}

export async function sendVerificationEmail(mailer, { to, name, url }) {
  const firstName = name.trim().split(/\s+/)[0];
  await mailer.sendMail({
    to,
    subject: 'Verify your SkillConnect-HUB email',
    text: `Hi ${firstName}, verify your email address to finish creating your SkillConnect-HUB account: ${url}\n\nThis link expires in 24 hours. If you did not create this account, you can ignore this email.`,
    html: `<div style="font-family:Arial,sans-serif;color:#1E2421;max-width:560px;margin:auto"><h1 style="color:#1F5C46">Verify your email</h1><p>Hi ${escapeHtml(firstName)},</p><p>Click below to verify your email address and finish creating your SkillConnect-HUB account.</p><p><a href="${escapeHtml(url)}" style="display:inline-block;padding:12px 20px;background:#1F5C46;color:#fff;text-decoration:none;border-radius:8px">Verify email</a></p><p>This link expires in 24 hours. If you did not create this account, ignore this email.</p></div>`,
  });
}

function escapeHtml(value) {
  return value.replace(/[&<>"']/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[character]);
}

export async function sendReviewReminder(mailer, order) {
  await mailer.sendMail({
    from: process.env.SMTP_FROM || process.env.SMTP_USER,
    to: order.email,
    subject: 'How was your SkillConnect-HUB order?',
    text: `Hi ${order.name.split(/\s+/)[0]}, how was your order from ${order.artisan_name}? Leave a review in SkillConnect-HUB.`,
  });
}
