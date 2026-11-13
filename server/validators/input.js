const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const namePattern = /^[\p{L}\p{M}][\p{L}\p{M} .'-]*$/u;
const idPattern = /^\d{11}$/;
const passportPattern = /^[A-Za-z0-9]{6,20}$/;

export function stringValue(value) {
  return typeof value === 'string' ? value.trim() : '';
}

export function normalizeEmail(email = '') {
  return stringValue(email).toLowerCase();
}

export function validateEmail(email) {
  const value = normalizeEmail(email);
  if (!value || value.length > 254 || value.includes('..') || !emailPattern.test(value)) return 'Enter a valid email address.';
  const [local, domain] = value.split('@');
  if (local.length > 64 || domain.length > 253 || domain.startsWith('.') || domain.endsWith('.') || domain.includes('..')) return 'Enter a valid email address.';
  return null;
}

export function validatePassword(password, { required = true } = {}) {
  if (!password && !required) return null;
  if (typeof password !== 'string' || password.length < 8 || password.length > 128) return 'Password must be between 8 and 128 characters.';
  if (!/[A-Za-z]/.test(password) || !/\d/.test(password)) return 'Password must contain at least one letter and one number.';
  return null;
}

export function validateName(name, label = 'Name') {
  const value = stringValue(name);
  if (!value) return `${label} is required.`;
  if (value.length < 2 || value.length > 120 || !namePattern.test(value)) return `${label} must be 2 to 120 letters and may include spaces, apostrophes, periods, or hyphens.`;
  return null;
}

export function validateText(value, label, { required = false, min = 0, max = 500, multiline = true } = {}) {
  const text = stringValue(value);
  if (!text && required) return `${label} is required.`;
  if (!text) return null;
  if (text.length < min || text.length > max) return `${label} must be ${min ? `${min} to ` : 'no more than '}${max} characters.`;
  if (/\p{C}/u.test(text) || (!multiline && /[\r\n]/.test(text))) return `${label} contains invalid characters.`;
  return null;
}

export function parsePositiveId(value) {
  const id = Number(value);
  return Number.isSafeInteger(id) && id > 0 ? id : null;
}

export function parseMoneyNaira(value, { label = 'Amount', max = 100_000_000 } = {}) {
  const raw = stringValue(String(value ?? ''));
  if (!/^\d{1,9}(?:\.\d{1,2})?$/.test(raw)) return { error: `${label} must be a positive amount with no more than 2 decimal places.` };
  const naira = Number(raw);
  if (!Number.isFinite(naira) || naira <= 0 || naira > max) return { error: `${label} must be greater than zero and no more than ₦${max.toLocaleString()}.` };
  return { naira, kobo: Math.round(naira * 100) };
}

export function validateImageUrl(value, label = 'Image URL', { required = false } = {}) {
  const url = stringValue(value);
  if (!url && required) return `${label} is required.`;
  if (!url) return null;
  try {
    const parsed = new URL(url);
    if (!['http:', 'https:'].includes(parsed.protocol) || url.length > 2048) return `${label} is invalid.`;
  } catch { return `${label} is invalid.`; }
  return null;
}

export function validateSignup({ name, email, password, role = 'customer' }) {
  return validateName(name) || validateEmail(email) || validatePassword(password) || (!['customer', 'artisan'].includes(role) ? 'Choose a valid account type.' : null);
}

export function validateProfile({ name, skill, area, bio, startingPrice, imageUrl }) {
  const price = startingPrice === '' || startingPrice == null ? null : parseMoneyNaira(startingPrice, { label: 'Starting price' });
  return validateName(name) || validateText(skill, 'Skill', { required: true, min: 2, max: 80, multiline: false }) || validateText(area, 'Area', { required: true, min: 2, max: 120, multiline: false }) || validateText(bio, 'Bio', { max: 1000 }) || (price?.error || null) || validateImageUrl(imageUrl);
}

export function validateProduct({ name, description, price, imageUrl }) {
  const money = parseMoneyNaira(price, { label: 'Product price' });
  return validateText(name, 'Product name', { required: true, min: 2, max: 160, multiline: false }) || validateText(description, 'Product description', { max: 2000 }) || money.error || validateImageUrl(imageUrl, 'Product image', { required: true });
}

export function validateMessage({ body, imageUrl }) {
  if (!stringValue(body) && !stringValue(imageUrl)) return 'Write a message or attach a photo.';
  return validateText(body, 'Message', { max: 4000 }) || validateImageUrl(imageUrl, 'Attached image');
}

export function validateReview({ rating, comment, photoUrl }) {
  const score = Number(rating);
  if (!Number.isInteger(score) || score < 1 || score > 5) return 'Rating must be a whole number from 1 to 5.';
  return validateText(comment, 'Comment', { max: 500 }) || validateImageUrl(photoUrl, 'Review photo');
}

export function validatePayout({ bankName, bankCode, accountNumber }) {
  return validateText(bankName, 'Bank name', { required: true, min: 2, max: 120, multiline: false }) || (!/^\d{3,10}$/.test(stringValue(bankCode)) ? 'Bank code must contain 3 to 10 digits.' : null) || (!/^\d{10}$/.test(stringValue(accountNumber)) ? 'Account number must contain exactly 10 digits.' : null);
}

export function validateVerification({ idType, idNumber, idPhotoAssetId, selfieAssetId }) {
  const number = stringValue(idNumber).replace(/\s/g, '');
  if (!['nin', 'passport'].includes(idType)) return 'Choose NIN or passport.';
  if (!number || (idType === 'nin' ? !idPattern.test(number) : !passportPattern.test(number))) return idType === 'nin' ? 'NIN must contain exactly 11 digits.' : 'Passport number must contain 6 to 20 letters or numbers.';
  if (!/^[\w:/.-]{1,255}$/.test(stringValue(idPhotoAssetId)) || !/^[\w:/.-]{1,255}$/.test(stringValue(selfieAssetId))) return 'Upload a valid ID photo and selfie.';
  return null;
}
