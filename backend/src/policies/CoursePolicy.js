class CoursePolicy {
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

module.exports = CoursePolicy;
