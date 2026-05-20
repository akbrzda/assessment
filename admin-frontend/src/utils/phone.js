export const formatPhoneMask = (value) => {
  const digitsRaw = String(value || "").replace(/\D/g, "");
  if (!digitsRaw) {
    return "";
  }

  let digits = digitsRaw;
  if (digits.startsWith("8")) {
    digits = `7${digits.slice(1)}`;
  } else if (!digits.startsWith("7")) {
    digits = `7${digits}`;
  }

  digits = digits.slice(0, 11);
  const local = digits.slice(1);

  if (!local) return "+7";
  if (local.length <= 3) return `+7 (${local}`;
  if (local.length <= 6) return `+7 (${local.slice(0, 3)}) ${local.slice(3)}`;
  if (local.length <= 8) return `+7 (${local.slice(0, 3)}) ${local.slice(3, 6)}-${local.slice(6)}`;
  return `+7 (${local.slice(0, 3)}) ${local.slice(3, 6)}-${local.slice(6, 8)}-${local.slice(8, 10)}`;
};

export const normalizePhoneForApi = (value) => {
  const digitsRaw = String(value || "").replace(/\D/g, "");
  if (!digitsRaw) {
    return null;
  }

  let digits = digitsRaw;
  if (digits.startsWith("8")) {
    digits = `7${digits.slice(1)}`;
  } else if (!digits.startsWith("7")) {
    digits = `7${digits}`;
  }

  digits = digits.slice(0, 11);
  if (digits.length !== 11) {
    return null;
  }

  return `+${digits}`;
};

export const formatPhoneForUi = (value) => {
  const normalized = normalizePhoneForApi(value);
  if (!normalized) {
    return "—";
  }
  return formatPhoneMask(normalized);
};
