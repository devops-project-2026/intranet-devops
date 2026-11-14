const { generateKeyPairSync } = require('crypto');
const fs = require('fs');
const path = require('path');

const passphrase = process.env.JWT_KEY_PASSPHRASE;
if (!passphrase) {
  throw new Error('JWT_KEY_PASSPHRASE is required');
}

const { publicKey, privateKey } = generateKeyPairSync('rsa', {
  modulusLength: 4096,
  publicKeyEncoding: {
    type: 'spki',
    format: 'pem'
  },
  privateKeyEncoding: {
    type: 'pkcs8',
    format: 'pem',
    cipher: 'aes-256-cbc',
    passphrase
  }
});

const jwtDirectory = path.join(__dirname, 'config', 'jwt');
fs.writeFileSync(path.join(jwtDirectory, 'private.pem'), privateKey);
fs.writeFileSync(path.join(jwtDirectory, 'public.pem'), publicKey);
console.log('Keys generated successfully');
