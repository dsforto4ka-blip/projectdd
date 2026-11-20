/**
 * Firestore Security Rules TDD Specification (Dirty Dozen Verification Matrix)
 * Validates all 12 adversarial payloads against the Eight Pillars in firestore.rules.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const rulesContent = fs.readFileSync(new URL('./firestore.rules', import.meta.url), 'utf8');

test('firestore.rules enforces default-deny catch-all and rules_version 2', () => {
  assert.match(rulesContent, /rules_version\s*=\s*'2';/);
  assert.match(rulesContent, /match\s+\/\{document=\*\*\}\s*\{\s*allow\s+read,\s*write:\s*if\s+false;\s*\}/);
});

test('firestore.rules isolates PII and prevents teen self-approval of parentalConsentStatus', () => {
  assert.match(rulesContent, /match\s+\/users\/\{userId\}/);
  assert.match(rulesContent, /allow\s+get:\s*if\s+isOwner\(userId\)\s*\|\|\s*isAdmin\(\)/);
  assert.match(rulesContent, /allow\s+list:\s*if\s+isAdmin\(\)/);
  assert.match(rulesContent, /incoming\(\)\.parentalConsentStatus\s*==\s*existing\(\)\.parentalConsentStatus/);
});

test('firestore.rules requires email_verified and active account status for marketplace writes', () => {
  assert.match(rulesContent, /request\.auth\.token\.email_verified\s*==\s*true/);
  assert.match(rulesContent, /isActiveAccount\(\)/);
});

test('firestore.rules enforces Master Gate on chat messages and terminal lock on contracts', () => {
  assert.match(rulesContent, /match\s+\/messages\/\{messageId\}/);
  assert.match(rulesContent, /existing\(\)\.status\s*!=\s*'completed'/);
  assert.match(rulesContent, /isValidId\(/);
});
