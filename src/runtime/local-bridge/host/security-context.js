import { createCommandRegistry } from '../command-registry.js';

export function createHostSecurityContext({
  sessionAuthority,
  repositoryAllowlist,
  approvalGrantAuthority,
} = {}) {
  if (!sessionAuthority || typeof sessionAuthority.verify !== 'function') {
    throw new TypeError('sessionAuthority must implement verify().');
  }
  if (!repositoryAllowlist || typeof repositoryAllowlist.require !== 'function') {
    throw new TypeError('repositoryAllowlist must implement require().');
  }
  if (!approvalGrantAuthority || typeof approvalGrantAuthority.verifyAndConsume !== 'function') {
    throw new TypeError('approvalGrantAuthority must implement verifyAndConsume().');
  }

  return Object.freeze({
    async requestAuthenticator({ request, transportContext }) {
      return sessionAuthority.verify(request.auth, transportContext?.identity);
    },

    async repositoryAuthorizer({ request }) {
      return repositoryAllowlist.require(request.repositoryId);
    },

    async approvalVerifier({
      requestId,
      command,
      repositoryId,
      riskLevel,
      approval,
      identity,
    }) {
      if (!approval?.grant) return false;
      return approvalGrantAuthority.verifyAndConsume(approval.grant, {
        sessionId: identity.sessionId,
        requestId,
        command,
        repositoryId,
        riskLevel,
      });
    },
  });
}

export function createSecureHostCommandRegistry(options = {}) {
  const {
    sessionAuthority,
    repositoryAllowlist,
    approvalGrantAuthority,
    ...registryOptions
  } = options;
  const security = createHostSecurityContext({
    sessionAuthority,
    repositoryAllowlist,
    approvalGrantAuthority,
  });
  return createCommandRegistry({ ...registryOptions, ...security });
}
