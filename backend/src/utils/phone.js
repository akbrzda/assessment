function normalizePhoneToE164Ru(phone) {
  if (!phone) {
    return null;
  }

  const digits = String(phone).replace(/\D/g, "");

  if (digits.length === 11 && digits.startsWith("8")) {
    return `+7${digits.slice(1)}`;
  }

  if (digits.length === 11 && digits.startsWith("7")) {
    return `+${digits}`;
  }

  if (digits.length === 10) {
    return `+7${digits}`;
  }

  return null;
}

module.exports = {
  normalizePhoneToE164Ru,
};
