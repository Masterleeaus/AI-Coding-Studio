import { RISK_LEVELS, isKnownRiskLevel } from './contracts.js';

export function requiresExplicitApproval(riskLevel) {
  if (!isKnownRiskLevel(riskLevel)) throw new TypeError(`Unknown risk level: ${riskLevel}`);
  return riskLevel !== RISK_LEVELS.READ;
}

export function isRiskApproved(riskLevel, approval) {
  if (!requiresExplicitApproval(riskLevel)) return true;
  if (!approval || typeof approval !== 'object' || !Array.isArray(approval.grantedRiskLevels)) return false;
  return approval.grantedRiskLevels.includes(riskLevel);
}
