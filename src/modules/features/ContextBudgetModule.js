/**
 * ContextBudgetModule: Context window management and estimation
 * Wraps AI Coding Studio Context Budget Handoff Module v1.0.0
 */

export function createContextBudgetModule({ dependencies, options }) {
  const { state, eventBus, promptLibrary } = dependencies;
  
  const providerProfiles = {
    'claude-3-opus': { contextWindow: 200000, inputPrice: 15, outputPrice: 75 },
    'claude-3-sonnet': { contextWindow: 200000, inputPrice: 3, outputPrice: 15 },
    'gpt-4': { contextWindow: 8000, inputPrice: 0.03, outputPrice: 0.06 },
    'gpt-4-turbo': { contextWindow: 128000, inputPrice: 0.01, outputPrice: 0.03 },
    'deepseek-chat': { contextWindow: 4000, inputPrice: 0.0014, outputPrice: 0.0042 },
  };

  return {
    async init() {
      state.set('currentProvider', options.defaultProvider || 'claude-3-opus');
      eventBus.emit('contextBudget:ready');
    },

    async enable() {},
    async disable() {},

    async estimateTokens(content) {
      // Rough estimation: 1 token ≈ 4 characters
      return Math.ceil(content.length / 4);
    },

    async estimateContext(messages) {
      let totalTokens = 0;
      const provider = state.get('currentProvider');
      const profile = providerProfiles[provider];

      messages.forEach(msg => {
        totalTokens += this.estimateTokens(msg.content || '');
      });

      const usage = {
        tokensUsed: totalTokens,
        tokensAvailable: profile.contextWindow,
        tokensRemaining: profile.contextWindow - totalTokens,
        percentUsed: (totalTokens / profile.contextWindow) * 100,
      };

      return usage;
    },

    async trimContext(messages, targetTokens) {
      let currentTokens = 0;
      const trimmed = [];

      // Keep important messages within budget
      for (let i = messages.length - 1; i >= 0; i--) {
        const msg = messages[i];
        const msgTokens = this.estimateTokens(msg.content || '');

        if (currentTokens + msgTokens <= targetTokens) {
          trimmed.unshift(msg);
          currentTokens += msgTokens;
        }
      }

      eventBus.emit('contextBudget:contextTrimmed', { 
        originalCount: messages.length,
        trimmedCount: trimmed.length,
        tokensRemoved: currentTokens,
      });

      return trimmed;
    },

    async getProviderProfile(provider) {
      return providerProfiles[provider] || null;
    },

    async setCurrentProvider(provider) {
      if (!providerProfiles[provider]) {
        throw new Error(`Unknown provider: ${provider}`);
      }
      state.set('currentProvider', provider);
      eventBus.emit('contextBudget:providerChanged', { provider });
    },

    async getCurrentProvider() {
      return state.get('currentProvider');
    },

    async listProviders() {
      return Object.keys(providerProfiles);
    },

    async calculateCost(tokensInput, tokensOutput, provider) {
      const profile = providerProfiles[provider];
      if (!profile) throw new Error(`Unknown provider: ${provider}`);

      return {
        inputCost: (tokensInput / 1000) * profile.inputPrice,
        outputCost: (tokensOutput / 1000) * profile.outputPrice,
        totalCost: ((tokensInput / 1000) * profile.inputPrice) + 
                   ((tokensOutput / 1000) * profile.outputPrice),
      };
    },

    async destroy() {},
  };
}

export default createContextBudgetModule;
