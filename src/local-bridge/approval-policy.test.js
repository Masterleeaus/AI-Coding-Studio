import { test } from 'vitest';
import assert from 'node:assert/strict';
import { RISK_LEVELS } from './contracts.js';
import { isRiskApproved, requiresExplicitApproval } from './approval-policy.js';

test('READ is implicit while every other risk needs an exact grant', () => {
  assert.equal(requiresExplicitApproval(RISK_LEVELS.READ), false);
  assert.equal(isRiskApproved(RISK_LEVELS.READ, null), true);
  for (const risk of [RISK_LEVELS.SAFE_EXECUTION, RISK_LEVELS.WRITE, RISK_LEVELS.DESTRUCTIVE, RISK_LEVELS.PUBLISH]) {
    assert.equal(requiresExplicitApproval(risk), true);
    assert.equal(isRiskApproved(risk, { grantedRiskLevels: [risk] }), true);
    assert.equal(isRiskApproved(risk, { grantedRiskLevels: [RISK_LEVELS.READ] }), false);
  }
});

test('malformed approval data fails closed and unknown risks throw', () => {
  assert.equal(isRiskApproved(RISK_LEVELS.WRITE, { grantedRiskLevels: 'WRITE' }), false);
  assert.throws(() => requiresExplicitApproval('SUPERUSER'), /Unknown risk level/);
});
