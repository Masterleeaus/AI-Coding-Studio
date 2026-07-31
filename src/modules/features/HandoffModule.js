/**
 * HandoffModule: Conversation transition between providers
 * Wraps Context Budget Handoff Module (Handoff component)
 */

export function createHandoffModule({ dependencies, options }) {
  const { contextBudget, state, eventBus } = dependencies;
  const handoffHistory = [];

  return {
    async init() {
      eventBus.emit('handoff:ready');
    },

    async enable() {},
    async disable() {},

    async initiateHandoff(fromProvider, toProvider, conversationState) {
      const handoff = {
        id: `handoff-${Date.now()}`,
        fromProvider,
        toProvider,
        initiatedAt: Date.now(),
        conversationState,
        status: 'initiating',
      };

      try {
        eventBus.emit('handoff:initiated', { handoff });

        // Estimate context for new provider
        const fromProfile = await contextBudget.getProviderProfile(fromProvider);
        const toProfile = await contextBudget.getProviderProfile(toProvider);

        // Prepare handoff context
        const handoffContext = await this._prepareHandoffContext(
          conversationState,
          toProfile.contextWindow
        );

        handoff.status = 'completed';
        handoff.completedAt = Date.now();
        handoff.context = handoffContext;

        handoffHistory.push(handoff);
        eventBus.emit('handoff:completed', { handoff });

        return handoff;
      } catch (error) {
        handoff.status = 'failed';
        handoff.error = error.message;
        handoff.completedAt = Date.now();

        handoffHistory.push(handoff);
        eventBus.emit('handoff:failed', { handoff, error });
        throw error;
      }
    },

    async _prepareHandoffContext(conversationState, targetContextWindow) {
      // Trim conversation to fit target provider's context window
      const maxTokens = targetContextWindow - 1000; // Reserve 1000 tokens for response
      return await contextBudget.trimContext(conversationState.messages, maxTokens);
    },

    async renderHandoff(handoff) {
      const summary = {
        from: handoff.fromProvider,
        to: handoff.toProvider,
        timestamp: handoff.initiatedAt,
        contextItems: handoff.context?.length || 0,
      };

      eventBus.emit('handoff:rendered', { summary });
      return summary;
    },

    async getHandoffHistory(limit = 20) {
      return handoffHistory.slice(-limit);
    },

    async validateHandoff(handoff) {
      return handoff.status === 'completed' && !handoff.error;
    },

    async destroy() {
      handoffHistory.length = 0;
    },
  };
}

export default createHandoffModule;
