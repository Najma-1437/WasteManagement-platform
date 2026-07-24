// Centralized Kenya-locale formatting (currency, dates, phone numbers).
// These are independent of the UI language chosen via the LanguagePicker —
// KES amounts and en-KE dates stay in this format regardless of translation.

export function formatKes(amount) {
  return `KES ${Number(amount).toLocaleString('en-KE', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

export function formatDate(dateStr, options = { day: 'numeric', month: 'short', year: 'numeric' }) {
  return new Date(dateStr).toLocaleDateString('en-KE', options);
}

// Normalizes a Kenyan phone number to +254XXXXXXXXX for storage/display.
export function normalizePhone(input) {
  let phone = String(input || '').replace(/\s+/g, '');
  if (phone.startsWith('0')) phone = '254' + phone.slice(1);
  if (phone.startsWith('+')) phone = phone.slice(1);
  if (!phone.startsWith('254')) phone = '254' + phone;
  return `+${phone}`;
}
