import test from 'node:test';
import assert from 'node:assert/strict';
import { randomToken, digest, hashPassword, verifyPassword, encrypt, decrypt } from '../server/src/utils/security.js';
test('password hashes are salted and verified', async () => {
  const a = await hashPassword('A long example password!'),
    b = await hashPassword('A long example password!');
  assert.notEqual(a, b);
  assert.equal(await verifyPassword('A long example password!', a), true);
  assert.equal(await verifyPassword('wrong', a), false);
});
test('malformed password hashes are rejected', async () => assert.equal(await verifyPassword('x', 'scrypt:salt:bad'), false));
test('opaque tokens have sufficient entropy and only hashes are compared', () => {
  const a = randomToken(),
    b = randomToken();
  assert.equal(a.length, 43);
  assert.notEqual(a, b);
  assert.equal(digest(a).length, 64);
});
test('mail outbox encryption authenticates contents', () => {
  const key = randomToken(),
    message = 'Private invitation link';
  const encrypted = encrypt(message, key);
  assert.equal(decrypt(encrypted, key), message);
  assert.ok(!encrypted.includes(message));
  assert.throws(() => decrypt(encrypted, randomToken()));
});
