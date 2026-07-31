/**
 * McpIntegrationModule: Model Context Protocol integration
 * Wraps AI Coding Studio MCP Integration (Better DeepSeek Third Modules)
 */

export function createMcpIntegrationModule({ dependencies, options }) {
  const { toolRuntime, eventBus, state } = dependencies;
  const servers = new Map();
  const registeredTools = new Map();

  return {
    async init() {
      eventBus.emit('mcpIntegration:initialized');
    },

    async enable() {},
    async disable() {},

    async registerServer(serverConfig) {
      const server = {
        id: serverConfig.name,
        ...serverConfig,
        registeredAt: Date.now(),
        status: 'connected',
      };

      servers.set(serverConfig.name, server);
      eventBus.emit('mcpIntegration:serverRegistered', { server });
      return server;
    },

    async connectServer(serverName) {
      const server = servers.get(serverName);
      if (!server) throw new Error(`Server not found: ${serverName}`);

      server.status = 'connected';
      server.connectedAt = Date.now();

      eventBus.emit('mcpIntegration:serverConnected', { serverName });
      return server;
    },

    async disconnectServer(serverName) {
      const server = servers.get(serverName);
      if (!server) throw new Error(`Server not found: ${serverName}`);

      server.status = 'disconnected';
      servers.delete(serverName);

      eventBus.emit('mcpIntegration:serverDisconnected', { serverName });
    },

    async exposeToolFromRuntime(toolName) {
      const tool = await toolRuntime.getTool(toolName);
      if (!tool) throw new Error(`Tool not found: ${toolName}`);

      registeredTools.set(toolName, tool);
      eventBus.emit('mcpIntegration:toolExposed', { toolName });
      return tool;
    },

    async callMcpTool(toolName, input) {
      const tool = registeredTools.get(toolName);
      if (!tool) throw new Error(`MCP tool not found: ${toolName}`);

      return await toolRuntime.executeTool(toolName, input);
    },

    async listServers() {
      return Array.from(servers.values());
    },

    async listExposedTools() {
      return Array.from(registeredTools.values());
    },

    async getServerConfig(serverName) {
      return servers.get(serverName) || null;
    },

    async validateServerConfig(config) {
      if (!config.name) throw new Error('Server config requires name');
      if (!config.transport) throw new Error('Server config requires transport');
      return true;
    },

    async destroy() {
      servers.clear();
      registeredTools.clear();
    },
  };
}

export default createMcpIntegrationModule;
