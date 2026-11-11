export function naira(kobo) {
  return `₦${(Number(kobo) / 100).toLocaleString()}`;
}

export function productNaira(amount) {
  return `₦${Number(amount).toLocaleString()}`;
}
