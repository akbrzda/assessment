const test = require("node:test");
const assert = require("node:assert/strict");

const { extractFileNameFromUploadsUrl } = require("../src/utils/uploads");

test("extractFileNameFromUploadsUrl блокирует path traversal последовательности", () => {
  const result = extractFileNameFromUploadsUrl("/uploads/courses/../../secret.txt", "courses");
  assert.equal(result, "");
});

