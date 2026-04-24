const userModel = require("../../../models/userModel");
const assessmentModel = require("../../../models/assessmentModel");
const referenceModel = require("../../../models/referenceModel");
const invitationModel = require("../../../models/invitationModel");

async function getDashboardData(userId) {
  return userModel.getDashboardData(userId);
}

async function findUserByTelegramId(telegramId) {
  return userModel.findByTelegramId(telegramId);
}

async function createUser(payload) {
  return userModel.createUser(payload);
}

async function assignUserToMatchingAssessments(payload) {
  return assessmentModel.assignUserToMatchingAssessments(payload);
}

async function findActiveInvitationByCode(code) {
  return invitationModel.findActiveByCode(code);
}

async function markInvitationUsed(invitationId, userId) {
  return invitationModel.markUsed(invitationId, userId);
}

async function getRoleByName(roleName) {
  return referenceModel.getRoleByName(roleName);
}

async function getRoleById(roleId) {
  return referenceModel.getRoleById(roleId);
}

async function getBranchById(branchId) {
  return referenceModel.getBranchById(branchId);
}

async function getPositionById(positionId) {
  return referenceModel.getPositionById(positionId);
}

async function getPositionByName(positionName) {
  return referenceModel.getPositionByName(positionName);
}

async function getBranches() {
  return referenceModel.getBranches();
}

async function getPositions() {
  return referenceModel.getPositions();
}

async function getRoles() {
  return referenceModel.getRoles();
}

async function updateProfile(userId, payload) {
  return userModel.updateProfile(userId, payload);
}

async function updateTimezone(userId, timezone) {
  return userModel.updateTimezone(userId, timezone);
}

async function completeOnboarding(userId) {
  return userModel.completeOnboarding(userId);
}

async function activatePendingUser(userId, payload) {
  return userModel.activatePendingUser(userId, payload);
}

module.exports = {
  getDashboardData,
  findUserByTelegramId,
  createUser,
  activatePendingUser,
  assignUserToMatchingAssessments,
  findActiveInvitationByCode,
  markInvitationUsed,
  getRoleByName,
  getRoleById,
  getBranchById,
  getPositionById,
  getPositionByName,
  getBranches,
  getPositions,
  getRoles,
  updateProfile,
  updateTimezone,
  completeOnboarding,
};
