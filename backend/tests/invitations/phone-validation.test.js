const test = require("node:test");
const assert = require("node:assert/strict");

const adminValidators = require("../../src/modules/invitations/admin/validators");
const publicValidators = require("../../src/modules/invitations/public/validators");

test("admin validateCreatePayload: принимает телефон в формате +7XXXXXXXXXX", () => {
  const payload = adminValidators.validateCreatePayload({
    firstName: "Иван",
    lastName: "Петров",
    branchId: 1,
    positionId: 2,
    phone: "+79991234567",
  });

  assert.equal(payload.phone, "+79991234567");
});

test("admin validateCreatePayload: отклоняет телефон вне формата +7", () => {
  assert.throws(
    () =>
      adminValidators.validateCreatePayload({
        firstName: "Иван",
        lastName: "Петров",
        branchId: 1,
        positionId: 2,
        phone: "89991234567",
      }),
    /Телефон должен быть в формате \+7XXXXXXXXXX/,
  );
});

test("public validateCreatePayload: требует телефон", () => {
  assert.throws(
    () =>
      publicValidators.validateCreatePayload({
        firstName: "Иван",
        lastName: "Петров",
        branchId: 1,
      }),
    /"phone" is required/,
  );
});

test("public validateUpdatePayload: отклоняет телефон вне формата +7", () => {
  assert.throws(
    () =>
      publicValidators.validateUpdatePayload({
        firstName: "Иван",
        lastName: "Петров",
        branchId: 1,
        phone: "+7123",
      }),
    /Телефон должен быть в формате \+7XXXXXXXXXX/,
  );
});
