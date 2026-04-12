const runtimeState = {
  initDataOverride: "",
  startParam: null,
  inviteCode: null,
};

export function setTelegramRuntimeState({ initDataOverride, startParam, inviteCode } = {}) {
  if (typeof initDataOverride === "string") {
    runtimeState.initDataOverride = initDataOverride;
  }

  if (startParam !== undefined) {
    runtimeState.startParam = startParam || null;
  }

  if (inviteCode !== undefined) {
    runtimeState.inviteCode = inviteCode || null;
  }
}

export function getTelegramInitDataOverride() {
  return runtimeState.initDataOverride || "";
}

export function getTelegramStartParam() {
  return runtimeState.startParam || "";
}

export function getTelegramInviteCode() {
  return runtimeState.inviteCode || null;
}

export function clearTelegramRuntimeState() {
  runtimeState.initDataOverride = "";
  runtimeState.startParam = null;
  runtimeState.inviteCode = null;
}
