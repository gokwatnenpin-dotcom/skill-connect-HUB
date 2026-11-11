export function validateSignup({ name, email, password, role = 'customer' }) {
  if (!name || !email || !password || !['customer', 'artisan'].includes(role)) return 'Name, email, password, and account type are required.';
  if (password.length < 6 || name.trim().length > 120 || !/^\S+@\S+\.\S+$/.test(email)) return 'Use a valid email and a password of at least 6 characters.';
  return null;
}

export function normalizeEmail(email = '') {
  return email.trim().toLowerCase();
}
