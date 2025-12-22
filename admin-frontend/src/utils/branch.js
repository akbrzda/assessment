export function formatBranchLabel(branch) {
  if (!branch) {
    return "";
  }

  const name = typeof branch === "object" ? branch.name || "" : "";
  const city = typeof branch === "object" ? branch.city || "" : "";

  const trimmedName = name.trim();
  const trimmedCity = city.trim();

  if (trimmedName && trimmedCity) {
    return `${trimmedName} (${trimmedCity})`;
  }

  return trimmedName || trimmedCity || "";
}
