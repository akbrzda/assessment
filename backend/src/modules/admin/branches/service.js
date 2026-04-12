const { logAndSend, buildActorFromRequest } = require("../../../services/auditService");
const branchesRepository = require("./repository");
const { normalizeBranchPayload } = require("./validators");

function mapManagerRows(managers) {
  return managers.map((manager) => ({
    ...manager,
    role: manager.role_name,
  }));
}

function assertManagerRole(user) {
  if (!user) {
    const error = new Error("РџРѕР»СЊР·РѕРІР°С‚РµР»СЊ РЅРµ РЅР°Р№РґРµРЅ");
    error.status = 404;
    throw error;
  }

  if (user.role_name !== "manager" && user.role_name !== "superadmin") {
    const error = new Error("РџРѕР»СЊР·РѕРІР°С‚РµР»СЊ РЅРµ СЏРІР»СЏРµС‚СЃСЏ СѓРїСЂР°РІР»СЏСЋС‰РёРј РёР»Рё СЃСѓРїРµСЂР°РґРјРёРЅРѕРј");
    error.status = 400;
    throw error;
  }
}

async function getBranches({ search }) {
  return branchesRepository.listBranches({ search });
}

async function getBranchById(branchId) {
  const branch = await branchesRepository.findBranchById(branchId);
  if (!branch) {
    const error = new Error("Р¤РёР»РёР°Р» РЅРµ РЅР°Р№РґРµРЅ");
    error.status = 404;
    throw error;
  }

  const [stats, managers, availableManagersRaw] = await Promise.all([
    branchesRepository.getBranchStats(branchId),
    branchesRepository.listManagersByBranch(branchId),
    branchesRepository.listManagers(),
  ]);

  return {
    branch: {
      ...branch,
      ...stats,
      managers,
    },
    availableManagers: mapManagerRows(availableManagersRaw),
  };
}

async function createBranch(payload, req) {
  const data = normalizeBranchPayload(payload);

  const existing = await branchesRepository.findBranchByName(data.name);
  if (existing) {
    const error = new Error("Р¤РёР»РёР°Р» СЃ С‚Р°РєРёРј РЅР°Р·РІР°РЅРёРµРј СѓР¶Рµ СЃСѓС‰РµСЃС‚РІСѓРµС‚");
    error.status = 400;
    throw error;
  }

  const branchId = await branchesRepository.createBranch(data);

  await logAndSend({
    req,
    actor: buildActorFromRequest(req),
    action: "branch.created",
    entity: "branch",
    entityId: branchId,
    metadata: {
      name: data.name,
      city: data.city,
      isVisibleInMiniapp: data.isVisibleInMiniapp,
    },
  });

  return {
    branchId,
    message: "Р¤РёР»РёР°Р» СЃРѕР·РґР°РЅ СѓСЃРїРµС€РЅРѕ",
  };
}

async function updateBranch(branchId, payload, req) {
  const existing = await branchesRepository.findBranchById(branchId);
  if (!existing) {
    const error = new Error("Р¤РёР»РёР°Р» РЅРµ РЅР°Р№РґРµРЅ");
    error.status = 404;
    throw error;
  }

  const data = normalizeBranchPayload(payload, {
    defaultVisibility: existing.is_visible_in_miniapp === 1,
  });

  const duplicate = await branchesRepository.findBranchByName(data.name, {
    excludeId: branchId,
  });
  if (duplicate) {
    const error = new Error("Р¤РёР»РёР°Р» СЃ С‚Р°РєРёРј РЅР°Р·РІР°РЅРёРµРј СѓР¶Рµ СЃСѓС‰РµСЃС‚РІСѓРµС‚");
    error.status = 400;
    throw error;
  }

  await branchesRepository.updateBranch(branchId, data);

  await logAndSend({
    req,
    actor: buildActorFromRequest(req),
    action: "branch.updated",
    entity: "branch",
    entityId: branchId,
    metadata: {
      previousName: existing.name,
      name: data.name,
      previousCity: existing.city,
      city: data.city,
      previousVisibility: existing.is_visible_in_miniapp === 1,
      isVisibleInMiniapp: data.isVisibleInMiniapp,
    },
  });

  return { message: "Р¤РёР»РёР°Р» РѕР±РЅРѕРІР»РµРЅ СѓСЃРїРµС€РЅРѕ" };
}

async function deleteBranch(branchId, req) {
  const existing = await branchesRepository.findBranchById(branchId);
  if (!existing) {
    const error = new Error("Р¤РёР»РёР°Р» РЅРµ РЅР°Р№РґРµРЅ");
    error.status = 404;
    throw error;
  }

  const usersCount = await branchesRepository.countUsersByBranch(branchId);
  if (usersCount > 0) {
    const error = new Error(
      `РќРµРІРѕР·РјРѕР¶РЅРѕ СѓРґР°Р»РёС‚СЊ С„РёР»РёР°Р». Р’ РЅРµРј ${usersCount} СЃРѕС‚СЂСѓРґРЅРёРєРѕРІ. РЎРЅР°С‡Р°Р»Р° РїРµСЂРµРјРµСЃС‚РёС‚Рµ РёР»Рё СѓРґР°Р»РёС‚Рµ СЃРѕС‚СЂСѓРґРЅРёРєРѕРІ.`,
    );
    error.status = 400;
    throw error;
  }

  await branchesRepository.deleteBranch(branchId);

  await logAndSend({
    req,
    actor: buildActorFromRequest(req),
    action: "branch.deleted",
    entity: "branch",
    entityId: branchId,
    metadata: {
      name: existing.name,
    },
  });
}

async function assignManager(branchId, userId, req) {
  const branch = await branchesRepository.findBranchById(branchId);
  if (!branch) {
    const error = new Error("Р¤РёР»РёР°Р» РЅРµ РЅР°Р№РґРµРЅ");
    error.status = 404;
    throw error;
  }

  const user = await branchesRepository.findUserWithRole(userId);
  assertManagerRole(user);

  const existing = await branchesRepository.findManagerAssignment(branchId, userId);
  if (existing) {
    const error = new Error("Р­С‚РѕС‚ СѓРїСЂР°РІР»СЏСЋС‰РёР№ СѓР¶Рµ РЅР°Р·РЅР°С‡РµРЅ Рє РґР°РЅРЅРѕРјСѓ С„РёР»РёР°Р»Сѓ");
    error.status = 400;
    throw error;
  }

  await branchesRepository.createManagerAssignment(branchId, userId);

  await logAndSend({
    req,
    actor: buildActorFromRequest(req),
    action: "branch.manager.assigned",
    entity: "branch",
    entityId: branchId,
    metadata: {
      managerId: userId,
      managerName: `${user.first_name} ${user.last_name}`,
      branchName: branch.name,
    },
  });

  return { message: "РЈРїСЂР°РІР»СЏСЋС‰РёР№ РЅР°Р·РЅР°С‡РµРЅ СѓСЃРїРµС€РЅРѕ" };
}

async function removeManager(branchId, userId, req) {
  const branch = await branchesRepository.findBranchById(branchId);
  if (!branch) {
    const error = new Error("Р¤РёР»РёР°Р» РЅРµ РЅР°Р№РґРµРЅ");
    error.status = 404;
    throw error;
  }

  const user = await branchesRepository.findUserWithRole(userId);
  if (!user) {
    const error = new Error("РџРѕР»СЊР·РѕРІР°С‚РµР»СЊ РЅРµ РЅР°Р№РґРµРЅ");
    error.status = 404;
    throw error;
  }

  const affectedRows = await branchesRepository.deleteManagerAssignment(branchId, userId);
  if (!affectedRows) {
    const error = new Error("РќР°Р·РЅР°С‡РµРЅРёРµ РЅРµ РЅР°Р№РґРµРЅРѕ");
    error.status = 404;
    throw error;
  }

  await logAndSend({
    req,
    actor: buildActorFromRequest(req),
    action: "branch.manager.removed",
    entity: "branch",
    entityId: branchId,
    metadata: {
      managerId: userId,
      managerName: `${user.first_name} ${user.last_name}`,
      branchName: branch.name,
    },
  });

  return { message: "РЈРїСЂР°РІР»СЏСЋС‰РёР№ СѓРґР°Р»РµРЅ СѓСЃРїРµС€РЅРѕ" };
}

async function assignManagerToBranches(userId, branchIds, req) {
  const user = await branchesRepository.findUserWithRole(userId);
  assertManagerRole(user);

  const branches = await branchesRepository.findBranchesByIds(branchIds);
  if (branches.length !== branchIds.length) {
    const error = new Error("РћРґРёРЅ РёР»Рё РЅРµСЃРєРѕР»СЊРєРѕ С„РёР»РёР°Р»РѕРІ РЅРµ РЅР°Р№РґРµРЅС‹");
    error.status = 404;
    throw error;
  }

  await branchesRepository.deleteManagerAssignmentsByUser(userId);
  await branchesRepository.createManagerAssignmentsBatch(userId, branchIds);

  await logAndSend({
    req,
    actor: buildActorFromRequest(req),
    action: "branch.manager.mass_assigned",
    entity: "user",
    entityId: userId,
    metadata: {
      managerName: `${user.first_name} ${user.last_name}`,
      branchIds,
      branchNames: branches.map((branch) => branch.name),
    },
  });

  return { message: "РЈРїСЂР°РІР»СЏСЋС‰РёР№ РЅР°Р·РЅР°С‡РµРЅ Рє РІС‹Р±СЂР°РЅРЅС‹Рј С„РёР»РёР°Р»Р°Рј СѓСЃРїРµС€РЅРѕ" };
}

async function getManagers() {
  const managers = await branchesRepository.listManagers();
  return {
    managers: mapManagerRows(managers),
  };
}

module.exports = {
  getBranches,
  getBranchById,
  createBranch,
  updateBranch,
  deleteBranch,
  assignManager,
  removeManager,
  assignManagerToBranches,
  getManagers,
};

