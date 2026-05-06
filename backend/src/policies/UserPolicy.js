class UserPolicy {
  static update(actor, targetUser) {
    if (!actor || !targetUser) {
      return false;
    }

    if (actor.role === "superadmin") {
      return true;
    }

    if (actor.role !== "manager") {
      return false;
    }

    const isSelfEdit = Number(actor.id) === Number(targetUser.id);
    const isSameBranch = Number(actor.branch_id || actor.branchId || 0) === Number(targetUser.branch_id || targetUser.branchId || 0);
    const targetRole = String(targetUser.role_name || targetUser.role || "");
    const isEmployeeTarget = targetRole === "employee";

    return isSelfEdit || (isSameBranch && isEmployeeTarget);
  }

  static delete(actor, targetUser) {
    if (!actor || !targetUser) {
      return false;
    }
    return actor.role === "superadmin" && Number(actor.id) !== Number(targetUser.id);
  }

  static viewProgress(actor, targetUser) {
    if (!actor || !targetUser) {
      return false;
    }

    if (actor.role === "superadmin") {
      return true;
    }

    if (actor.role !== "manager") {
      return false;
    }

    return Number(actor.branch_id || actor.branchId || 0) === Number(targetUser.branch_id || targetUser.branchId || 0);
  }
}

module.exports = UserPolicy;
