const fs = require("fs/promises");
const path = require("path");

async function ensureDirectory(directoryPath) {
  await fs.mkdir(directoryPath, { recursive: true });
}

async function fileExists(filePath) {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

async function removeFile(filePath) {
  try {
    await fs.unlink(filePath);
    return true;
  } catch (error) {
    if (error && error.code === "ENOENT") {
      return false;
    }
    throw error;
  }
}

async function listFiles(directoryPath) {
  const entries = await fs.readdir(directoryPath, { withFileTypes: true });
  return entries.filter((entry) => entry.isFile()).map((entry) => entry.name);
}

async function getFileStats(filePath) {
  return fs.stat(filePath);
}

function resolveSafePath(basePath, fileName) {
  return path.join(basePath, fileName);
}

module.exports = {
  ensureDirectory,
  fileExists,
  removeFile,
  listFiles,
  getFileStats,
  resolveSafePath,
};
