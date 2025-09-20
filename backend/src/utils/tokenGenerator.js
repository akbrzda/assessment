const crypto = require('crypto');

function generateInviteCode(length = 6) {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  while (code.length < length) {
    const byte = crypto.randomBytes(1)[0];
    const index = byte % chars.length;
    code += chars[index];
  }
  return code;
}

module.exports = {
  generateInviteCode
};
