/**
 * AutoContinueModule: Provider-aware automatic continuation subsystem
 * Wraps Auto Continue Module (fixed version)
 * 
 * Purpose: Automatically continue AI responses across different providers
 * (DeepSeek, Claude, ChatGPT) with state machine control and safety limits
 */

export function createAutoContinueModule({ dependencies, options }) {
  const { eventBus, state, storage } = dependencies;
  
  // State machine states
  const States = {
    IDLE: 'idle',
    WAITING: 'waiting',
    DETECTING: 'detecting',
    CONTINUING: 'continuing',
    PAUSED: 'paused',
    COMPLETED: 'completed',
    ERROR: 'error',
  };

  // Session management
  const sessions = new Map();
  const completionDetector = new Map();
  const retryBackoff = new Map();

  return {
    async init() {
      try {
        // Load persisted sessions from storage
        const stored = await storage.get(['autoContinueSessions', 'autoContinueState']);
        
        if (stored.autoContinueSessions) {
          Object.entries(stored.autoContinueSessions).forEach(([key, session]) => {
            sessions.set(key, session);
          });
        }

        if (stored.autoContinueState) {
          state.set('autoContinue', stored.autoContinueState);
        } else {
          state.set('autoContinue', { 
            enabled: true,
            currentState: States.IDLE,
            policy: 'manual', // 'manual' | 'automatic' | 'policy-controlled'
            safetyLimits: {
              maxRetries: 3,
              maxBackoffMs: 30000,
              maxContinuations: 10,
            },
            provider: detectCurrentProvider(),
          });
        }

        eventBus.emit('autoContinue:ready', { 
          state: state.get('autoContinue')
        });
      } catch (error) {
        console.error('[AutoContinue] Init failed:', error);
        throw error;
      }
    },

    async enable() {
      const current = state.get('autoContinue');
      current.enabled = true;
      state.set('autoContinue', current);
      eventBus.emit('autoContinue:enabled');
    },

    async disable() {
      const current = state.get('autoContinue');
      current.enabled = false;
      state.set('autoContinue', current);
      eventBus.emit('autoContinue:disabled');
    },

    // State machine control
    async transitionState(sessionId, newState) {
      const session = sessions.get(sessionId);
      if (!session) throw new Error(`Session not found: ${sessionId}`);

      const oldState = session.state;
      session.state = newState;
      session.stateChangedAt = Date.now();

      await storage.set({ 
        [`autoContinueSessions.${sessionId}`]: session 
      });

      eventBus.emit('autoContinue:stateTransition', {
        sessionId,
        from: oldState,
        to: newState,
      });

      return session;
    },

    // Session management
    async startSession(sessionId, options = {}) {
      const session = {
        id: sessionId,
        state: States.IDLE,
        provider: options.provider || detectCurrentProvider(),
        policy: options.policy || 'manual',
        continuationCount: 0,
        retryCount: 0,
        completionSignals: [],
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };

      sessions.set(sessionId, session);
      await storage.set({ [`autoContinueSessions.${sessionId}`]: session });

      eventBus.emit('autoContinue:sessionStarted', { sessionId, session });
      return session;
    },

    async closeSession(sessionId) {
      const session = sessions.get(sessionId);
      if (!session) throw new Error(`Session not found: ${sessionId}`);

      session.state = States.COMPLETED;
      session.closedAt = Date.now();

      sessions.delete(sessionId);
      completionDetector.delete(sessionId);
      retryBackoff.delete(sessionId);

      await storage.set({ 
        [`autoContinueSessions.${sessionId}`]: session 
      });

      eventBus.emit('autoContinue:sessionClosed', { sessionId });
      return session;
    },

    // Completion detection
    async detectCompletion(sessionId) {
      const session = sessions.get(sessionId);
      if (!session) throw new Error(`Session not found: ${sessionId}`);

      await this.transitionState(sessionId, States.DETECTING);

      const detector = completionDetector.get(sessionId) || {
        signals: [],
        threshold: 3, // require 3 signals for stability
        detectionTime: Date.now(),
      };

      // Multi-signal completion detection
      const signals = await this._gatherCompletionSignals(sessionId);
      detector.signals.push(...signals);

      // Check if threshold met (stability check)
      if (detector.signals.length >= detector.threshold) {
        await this.transitionState(sessionId, States.COMPLETED);
        eventBus.emit('autoContinue:completionDetected', {
          sessionId,
          signals: detector.signals,
        });

        completionDetector.delete(sessionId);
        return true;
      }

      completionDetector.set(sessionId, detector);
      return false;
    },

    async _gatherCompletionSignals(sessionId) {
      // Provider-specific signal detection
      // This will be overridden by provider adapters
      const signals = [];

      // Token limit signal
      if (await this._checkTokenLimit(sessionId)) {
        signals.push('TOKEN_LIMIT');
      }

      // Response quality signal
      if (await this._checkResponseQuality(sessionId)) {
        signals.push('QUALITY_CHECK_PASS');
      }

      // Provider stop token signal
      if (await this._checkStopToken(sessionId)) {
        signals.push('STOP_TOKEN');
      }

      return signals;
    },

    async _checkTokenLimit() { return false; },
    async _checkResponseQuality() { return false; },
    async _checkStopToken() { return false; },

    // Continuation control
    async requestContinuation(sessionId) {
      const session = sessions.get(sessionId);
      if (!session) throw new Error(`Session not found: ${sessionId}`);

      const acState = state.get('autoContinue');
      
      // Check safety limits
      if (session.continuationCount >= acState.safetyLimits.maxContinuations) {
        throw new Error(`Max continuations (${acState.safetyLimits.maxContinuations}) reached`);
      }

      await this.transitionState(sessionId, States.CONTINUING);

      try {
        eventBus.emit('autoContinue:continuationRequested', { sessionId });
        session.continuationCount++;
        session.lastContinuationAt = Date.now();

        await storage.set({ 
          [`autoContinueSessions.${sessionId}`]: session 
        });

        return {
          allowed: true,
          continuationCount: session.continuationCount,
          remainingContinuations: acState.safetyLimits.maxContinuations - session.continuationCount,
        };
      } catch (error) {
        await this.transitionState(sessionId, States.ERROR);
        throw error;
      }
    },

    // Policy control
    async setPolicy(policy) {
      if (!['manual', 'automatic', 'policy-controlled'].includes(policy)) {
        throw new Error(`Invalid policy: ${policy}`);
      }

      const acState = state.get('autoContinue');
      acState.policy = policy;
      state.set('autoContinue', acState);

      await storage.set({ 'autoContinueState': acState });
      eventBus.emit('autoContinue:policyChanged', { policy });
    },

    async getPolicy() {
      return state.get('autoContinue').policy;
    },

    // Pause/Resume/Cancel
    async pause(sessionId) {
      const session = sessions.get(sessionId);
      if (!session) throw new Error(`Session not found: ${sessionId}`);

      await this.transitionState(sessionId, States.PAUSED);
      eventBus.emit('autoContinue:paused', { sessionId });
    },

    async resume(sessionId) {
      const session = sessions.get(sessionId);
      if (!session) throw new Error(`Session not found: ${sessionId}`);

      await this.transitionState(sessionId, States.WAITING);
      eventBus.emit('autoContinue:resumed', { sessionId });
    },

    async cancel(sessionId) {
      const session = sessions.get(sessionId);
      if (!session) throw new Error(`Session not found: ${sessionId}`);

      await this.transitionState(sessionId, States.COMPLETED);
      eventBus.emit('autoContinue:cancelled', { sessionId });
    },

    // Retry and backoff
    async requestRetry(sessionId) {
      const session = sessions.get(sessionId);
      if (!session) throw new Error(`Session not found: ${sessionId}`);

      const acState = state.get('autoContinue');
      
      if (session.retryCount >= acState.safetyLimits.maxRetries) {
        throw new Error(`Max retries (${acState.safetyLimits.maxRetries}) exceeded`);
      }

      const backoff = retryBackoff.get(sessionId) || {
        attempt: 0,
        nextRetryAt: Date.now(),
      };

      // Calculate exponential backoff
      const delay = Math.min(
        Math.pow(2, backoff.attempt) * 1000,
        acState.safetyLimits.maxBackoffMs
      );

      backoff.attempt++;
      backoff.nextRetryAt = Date.now() + delay;

      session.retryCount++;
      retryBackoff.set(sessionId, backoff);

      await storage.set({ 
        [`autoContinueSessions.${sessionId}`]: session 
      });

      eventBus.emit('autoContinue:retryScheduled', {
        sessionId,
        retryCount: session.retryCount,
        nextRetryIn: delay,
      });

      return { delay, nextRetryAt: backoff.nextRetryAt };
    },

    // Provider adapters
    async registerProvider(providerName, adapter) {
      if (!adapter || typeof adapter.detectCompletion !== 'function') {
        throw new Error('Provider adapter must implement detectCompletion()');
      }

      state.set(`provider.${providerName}`, adapter);
      eventBus.emit('autoContinue:providerRegistered', { providerName });
    },

    async getProvider(providerName) {
      return state.get(`provider.${providerName}`);
    },

    // State restoration
    async restoreSessions() {
      const stored = await storage.get(['autoContinueSessions']);
      if (!stored.autoContinueSessions) return [];

      const restored = [];
      for (const [key, session] of Object.entries(stored.autoContinueSessions)) {
        // Only restore non-completed sessions
        if (session.state !== States.COMPLETED) {
          sessions.set(key, session);
          restored.push(session);
        }
      }

      eventBus.emit('autoContinue:sessionsRestored', { count: restored.length });
      return restored;
    },

    // Query methods
    async getSession(sessionId) {
      return sessions.get(sessionId) || null;
    },

    async listSessions() {
      return Array.from(sessions.values());
    },

    async getState(sessionId) {
      const session = sessions.get(sessionId);
      return session ? session.state : null;
    },

    // Public API
    async destroy() {
      sessions.clear();
      completionDetector.clear();
      retryBackoff.clear();
    },
  };
}

/**
 * Detect current provider
 */
function detectCurrentProvider() {
  const hostname = window.location.hostname;
  if (hostname.includes('deepseek.com')) return 'deepseek';
  if (hostname.includes('claude.ai')) return 'claude';
  if (hostname.includes('chatgpt.com') || hostname.includes('openai.com')) return 'chatgpt';
  return 'unknown';
}

export default createAutoContinueModule;
