export function createMailer() {
  if (!process.env.BREVO_API_KEY || !process.env.BREVO_SENDER_EMAIL) return null;
  return {
    async sendMail({ to, subject, text }) {
      const response = await fetch('https://api.brevo.com/v3/smtp/email', {
        method: 'POST',
        headers: { accept: 'application/json', 'api-key': process.env.BREVO_API_KEY, 'content-type': 'application/json' },
        body: JSON.stringify({
          sender: { email: process.env.BREVO_SENDER_EMAIL, name: process.env.BREVO_SENDER_NAME || 'SkillConnect-HUB' },
          to: [{ email: to }],
          subject,
          textContent: text,
        }),
      });
      if (!response.ok) throw new Error(`Brevo email failed with status ${response.status}`);
    },
  };
}

export async function sendReviewReminder(mailer, order) {
  await mailer.sendMail({
    from: process.env.SMTP_FROM || process.env.SMTP_USER,
    to: order.email,
    subject: 'How was your SkillConnect-HUB order?',
    text: `Hi ${order.name.split(/\s+/)[0]}, how was your order from ${order.artisan_name}? Leave a review in SkillConnect-HUB.`,
  });
}
