const generateUid = () => `block-${Math.random().toString(36).slice(2, 11)}`;

export function createTheoryBlock(type = "text") {
  return {
    uid: generateUid(),
    title: "",
    type,
    content: "",
    videoUrl: "",
    externalUrl: "",
    metadata: {},
  };
}

export function createEmptyTheory() {
  return {
    requiredBlocks: [createTheoryBlock()],
    optionalBlocks: [],
  };
}

export function cloneTheoryData(source = {}) {
  return {
    requiredBlocks: (source.requiredBlocks || []).map((block) => ({
      ...createTheoryBlock(block.type || "text"),
      ...block,
      uid: block.uid || generateUid(),
    })),
    optionalBlocks: (source.optionalBlocks || []).map((block) => ({
      ...createTheoryBlock(block.type || "text"),
      ...block,
      uid: block.uid || generateUid(),
    })),
  };
}

export function mapVersionToTheoryData(version) {
  if (!version) {
    return createEmptyTheory();
  }
  return cloneTheoryData({
    requiredBlocks: version.requiredBlocks || [],
    optionalBlocks: version.optionalBlocks || [],
  });
}

export function hasTheoryBlocks(data) {
  return Boolean(data?.requiredBlocks?.length);
}

export function buildTheoryPayload(data) {
  const normalizeBlock = (block) => {
    const payload = {
      title: (block.title || "").trim(),
      type: block.type || "text",
      content: (block.content || "").trim(),
      videoUrl: null,
      externalUrl: null,
      metadata: block.metadata || {},
    };
    if (payload.type === "video") {
      payload.videoUrl = (block.videoUrl || "").trim();
    }
    if (payload.type === "link") {
      payload.externalUrl = (block.externalUrl || "").trim();
    }
    return payload;
  };

  return {
    requiredBlocks: (data?.requiredBlocks || []).map((block) => normalizeBlock(block)),
    optionalBlocks: (data?.optionalBlocks || []).map((block) => normalizeBlock(block)),
  };
}

export function validateTheoryData(data) {
  if (!data || !Array.isArray(data.requiredBlocks) || data.requiredBlocks.length === 0) {
    return { valid: false, message: "Добавьте минимум один обязательный блок" };
  }

  for (const block of data.requiredBlocks) {
    if (!block.title || !block.title.trim()) {
      return { valid: false, message: "У каждого обязательного блока должен быть заголовок" };
    }
    if (block.type === "text" && (!block.content || !block.content.trim())) {
      return { valid: false, message: `Блок "${block.title}" должен содержать текст` };
    }
    if (block.type === "video" && (!block.videoUrl || !block.videoUrl.trim())) {
      return { valid: false, message: `Укажите ссылку на видео для блока "${block.title}"` };
    }
    if (block.type === "link" && (!block.externalUrl || !block.externalUrl.trim())) {
      return { valid: false, message: `Укажите ссылку на материал для блока "${block.title}"` };
    }
  }

  return { valid: true, message: "" };
}
