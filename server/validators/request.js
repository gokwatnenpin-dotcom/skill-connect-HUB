import { normalizeEmail, parseMoneyNaira, parsePositiveId, stringValue, validateEmail, validateMessage, validatePayout, validateProduct, validateProfile, validateReview, validateSignup, validateText, validateVerification } from './input.js';

function bad(res, message, code = 'VALIDATION_ERROR') {
  return res.status(400).json({ code, message });
}

function pathId(path, pattern) {
  const match = path.match(pattern);
  return match ? parsePositiveId(match[1]) : null;
}

export function validateRequest(req, res, next) {
  const body = req.body || {};
  const path = req.path;
  let error = null;

  for (const [key, value] of Object.entries(body)) {
    if (typeof value === 'string' && value.length > 10_000) return bad(res, `${key} is too long.`);
  }
  for (const [key, value] of Object.entries(req.query || {})) {
    if (typeof value !== 'string' || value.length > 120) return bad(res, `${key} is invalid.`);
  }

  if (req.method === 'POST' && path === '/auth/signup') error = validateSignup(body);
  else if (req.method === 'POST' && path === '/auth/login') error = validateEmail(body.email) || (stringValue(body.password) ? null : 'Password is required.');
  else if (req.method === 'POST' && path === '/auth/resend-verification') error = validateEmail(body.email);
  else if (req.method === 'POST' && path === '/auth/supabase') error = !stringValue(body.accessToken) ? 'Supabase sign-in could not be verified.' : (!['customer', 'artisan'].includes(body.role || 'customer') ? 'Choose a valid account type.' : null);
  else if (req.method === 'POST' && path === '/artisan/profile') error = validateProfile(body);
  else if (req.method === 'POST' && path === '/artisan/payout-details') error = validatePayout(body);
  else if (req.method === 'POST' && path === '/artisan/verification') error = validateVerification(body);
  else if (req.method === 'POST' && path === '/products') error = validateProduct(body);
  else if (req.method === 'PUT' && /^\/products\/[^/]+$/.test(path)) error = parsePositiveId(path.split('/').pop()) ? validateProduct(body) : 'Product ID is invalid.';
  else if (req.method === 'POST' && path === '/conversations') error = parsePositiveId(body.artisanId) ? null : 'Artisan ID is invalid.';
  else if (req.method === 'POST' && /^\/conversations\/\d+\/messages$/.test(path)) error = parsePositiveId(path.split('/')[2]) ? validateMessage(body) : 'Conversation ID is invalid.';
  else if (req.method === 'POST' && /^\/conversations\/\d+\/orders$/.test(path)) error = parsePositiveId(path.split('/')[2]) ? (parseMoneyNaira(body.amount, { label: 'Amount' }).error || validateText(body.description, 'Description', { required: true, min: 2, max: 2000 })) : 'Conversation ID is invalid.';
  else if (req.method === 'POST' && path === '/orders') error = null;
  else if (req.method === 'POST' && /^\/orders\/\d+\/review$/.test(path)) error = parsePositiveId(path.split('/')[2]) ? validateReview(body) : 'Order ID is invalid.';
  else if (req.method === 'PUT' && /^\/reviews\/\d+$/.test(path)) error = parsePositiveId(path.split('/')[2]) ? validateReview(body) : 'Review ID is invalid.';
  else if (req.method === 'POST' && /^\/reviews\/\d+\/reply$/.test(path)) error = parsePositiveId(path.split('/')[2]) ? validateText(body.reply, 'Reply', { required: true, min: 1, max: 500 }) : 'Review ID is invalid.';
  else if (req.method === 'POST' && /^\/reviews\/\d+\/report$/.test(path)) error = ['fake', 'rude', 'wrong_person'].includes(body.reason) ? null : 'Choose fake, rude, or wrong person.';
  else if (req.method === 'POST' && /^\/messages\/\d+\/report$/.test(path)) error = parsePositiveId(path.split('/')[2]) ? validateText(body.reason || 'Reported by user', 'Reason', { required: true, min: 2, max: 500 }) : 'Message ID is invalid.';
  else if (req.method === 'POST' && /^\/admin\/artisans\/[^/]+\/decision$/.test(path)) error = parsePositiveId(path.split('/')[3]) ? (!['approved', 'rejected'].includes(body.decision) ? 'Choose approved or rejected.' : validateText(body.reason, 'Reason', { max: 500 })) : 'Artisan ID is invalid.';
  else if (req.method === 'POST' && /^\/admin\/orders\/[^/]+\/resolve$/.test(path)) { error = parsePositiveId(path.split('/')[3]) ? (!['refund_full', 'refund_partial', 'release', 'fix_on_hold'].includes(body.action) ? 'Choose a valid dispute resolution.' : validateText(body.note, 'Note', { max: 1000 })) : 'Order ID is invalid.'; if (!error && body.action === 'refund_partial') error = parseMoneyNaira(body.amount, { label: 'Refund amount' }).error; }
  else if (req.method === 'POST' && /^\/admin\/reviews\/[^/]+\/action$/.test(path)) error = parsePositiveId(path.split('/')[3]) ? (!['keep', 'hide', 'warn'].includes(body.action) ? 'Choose a valid review action.' : validateText(body.reason, 'Reason', { max: 500 })) : 'Review ID is invalid.';
  else if (req.method === 'POST' && /^\/admin\/users\/[^/]+\/suspension$/.test(path)) error = parsePositiveId(path.split('/')[3]) ? (typeof body.suspended !== 'boolean' ? 'Suspension status is invalid.' : validateText(body.reason, 'Reason', { max: 500 })) : 'User ID is invalid.';

  if (error) return bad(res, error);
  if (req.method === 'POST' && path === '/auth/login') req.body.email = normalizeEmail(req.body.email);
  return next();
}
