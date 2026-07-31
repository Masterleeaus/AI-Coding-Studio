/**
 * RetrievalContextModule: Context ranking and retrieval
 * Wraps Retrieval Context Ranking reference
 */

export function createRetrievalContextModule({ dependencies, options }) {
  const { promptLibrary, eventBus } = dependencies;

  return {
    async init() {
      eventBus.emit('retrievalContext:ready');
    },

    async enable() {},
    async disable() {},

    async rankContextItems(items, query, maxResults = 20) {
      // Score each item based on semantic relevance
      const scored = items.map(item => ({
        ...item,
        score: this._calculateRelevance(item, query),
      }));

      // Sort by score
      scored.sort((a, b) => b.score - a.score);

      // Return top N
      const results = scored.slice(0, maxResults);
      eventBus.emit('retrievalContext:itemsRanked', { count: results.length });
      return results;
    },

    _calculateRelevance(item, query) {
      let score = 0;
      const queryTerms = query.toLowerCase().split(/\s+/);
      const itemText = `${item.title || ''} ${item.content || ''}`.toLowerCase();

      queryTerms.forEach(term => {
        if (itemText.includes(term)) score += 1;
      });

      return score / queryTerms.length;
    },

    async extractContext(source) {
      eventBus.emit('retrievalContext:contextExtracted', { source });
      return { source, extractedAt: Date.now() };
    },

    async buildContextWindow(items, budget = 8000) {
      let totalTokens = 0;
      const included = [];

      for (const item of items) {
        const tokens = this._estimateTokens(item);
        if (totalTokens + tokens <= budget) {
          included.push(item);
          totalTokens += tokens;
        } else {
          break;
        }
      }

      return { items: included, totalTokens, budget };
    },

    _estimateTokens(item) {
      const text = `${item.title || ''} ${item.content || ''}`;
      return Math.ceil(text.length / 4);
    },

    async destroy() {},
  };
}

export default createRetrievalContextModule;
