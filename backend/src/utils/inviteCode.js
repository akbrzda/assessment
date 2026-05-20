function normalizeInviteCode(raw) {
  if (!raw) {
    return null;
  }

  const trimmed = raw.trim();
  if (!trimmed) {
    return null;
  }

  const lower = trimmed.toLowerCase();
  let candidate = trimmed;

  if (lower.startsWith('invite-')) {
    candidate = trimmed.slice(7);
  } else if (lower.startsWith('invite_')) {
    candidate = trimmed.slice(7);
  } else if (lower.startsWith('code-')) {
    candidate = trimmed.slice(5);
  }

  const normalized = candidate.trim().toUpperCase();
  if (!/^[A-Z0-9]{4,16}$/.test(normalized)) {
    return null;
  }

  return normalized;
}

module.exports = {
  normalizeInviteCode
};
