/**
 * PromptLibraryModule: Unified prompt template management
 * Wraps AI Coding Studio Prompt Library Module v1.3.0
 */

export function createPromptLibraryModule({ dependencies, options }) {
  const { storage, state, eventBus } = dependencies;
  const templates = new Map();
  const categories = new Map();
  let initialized = false;

  return {
    async init() {
      try {
        // Load prompt templates from storage
        const stored = await storage.get(['promptTemplates', 'promptCategories']);
        
        if (stored.promptTemplates) {
          Object.entries(stored.promptTemplates).forEach(([key, template]) => {
            templates.set(key, template);
          });
        }

        if (stored.promptCategories) {
          Object.entries(stored.promptCategories).forEach(([key, category]) => {
            categories.set(key, category);
          });
        }

        initialized = true;
        eventBus.emit('promptLibrary:ready', { count: templates.size });
      } catch (error) {
        console.error('[PromptLibrary] Init failed:', error);
        throw error;
      }
    },

    async enable() {},
    async disable() {},

    // Public API
    async getTemplate(name) {
      if (!templates.has(name)) {
        throw new Error(`Template not found: ${name}`);
      }
      return templates.get(name);
    },

    async getAllTemplates() {
      return Array.from(templates.values());
    },

    async registerTemplate(name, template) {
      templates.set(name, template);
      await storage.set({ 
        [`promptTemplates.${name}`]: template 
      });
      eventBus.emit('promptLibrary:templateAdded', { name, template });
      return template;
    },

    async renderTemplate(name, variables) {
      const template = await this.getTemplate(name);
      let content = template.content;
      
      // Replace variables
      Object.entries(variables || {}).forEach(([key, value]) => {
        content = content.replace(new RegExp(`{{${key}}}`, 'g'), value);
      });

      eventBus.emit('promptLibrary:templateRendered', { name });
      return content;
    },

    async getCategory(categoryName) {
      return categories.get(categoryName) || null;
    },

    async listCategories() {
      return Array.from(categories.keys());
    },

    async searchTemplates(query) {
      const results = Array.from(templates.values()).filter(t => 
        t.name.includes(query) || 
        (t.description && t.description.includes(query))
      );
      return results;
    },

    async destroy() {
      templates.clear();
      categories.clear();
    },
  };
}

export default createPromptLibraryModule;
