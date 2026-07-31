/**
 * MarkdownSkillsModule: Skill manifest and activation
 * Wraps AI Coding Studio Markdown Skills Module v1.6.0
 */

export function createMarkdownSkillsModule({ dependencies, options }) {
  const { promptLibrary, storage, eventBus } = dependencies;
  const skills = new Map();

  return {
    async init() {
      const stored = await storage.get(['skills']);
      if (stored.skills) {
        Object.entries(stored.skills).forEach(([key, skill]) => {
          skills.set(key, skill);
        });
      }
      eventBus.emit('markdownSkills:ready', { count: skills.size });
    },

    async enable() {},
    async disable() {},

    async registerSkill(manifest) {
      const skill = {
        id: manifest.name,
        ...manifest,
        activatedAt: Date.now(),
      };
      skills.set(manifest.name, skill);
      await storage.set({ [`skills.${manifest.name}`]: skill });
      eventBus.emit('markdownSkills:skillRegistered', { skill });
      return skill;
    },

    async activateSkill(skillName) {
      const skill = skills.get(skillName);
      if (!skill) throw new Error(`Skill not found: ${skillName}`);
      
      skill.active = true;
      skill.activatedAt = Date.now();
      await storage.set({ [`skills.${skillName}`]: skill });
      eventBus.emit('markdownSkills:skillActivated', { skill });
      return skill;
    },

    async deactivateSkill(skillName) {
      const skill = skills.get(skillName);
      if (!skill) throw new Error(`Skill not found: ${skillName}`);
      
      skill.active = false;
      await storage.set({ [`skills.${skillName}`]: skill });
      eventBus.emit('markdownSkills:skillDeactivated', { skillName });
      return skill;
    },

    async getSkill(skillName) {
      return skills.get(skillName) || null;
    },

    async listSkills(activeOnly = false) {
      const allSkills = Array.from(skills.values());
      return activeOnly ? allSkills.filter(s => s.active) : allSkills;
    },

    async validateSkillManifest(manifest) {
      if (!manifest.name) throw new Error('Skill manifest requires name');
      if (!manifest.description) throw new Error('Skill manifest requires description');
      return true;
    },

    async destroy() {
      skills.clear();
    },
  };
}

export default createMarkdownSkillsModule;
