function normalizeInviteCode(raw) {
  if (!raw) {
    return null;
  }

  const trimmed = raw.trim();
  const lower = trimmed.toLowerCase();

  if (lower.startsWith('invite-')) {
    return trimmed.slice(7).toUpperCase();
  }

  if (lower.startsWith('code-')) {
    return trimmed.slice(5).toUpperCase();
  }

  return trimmed.toUpperCase();
}

module.exports = {
  normalizeInviteCode
};
