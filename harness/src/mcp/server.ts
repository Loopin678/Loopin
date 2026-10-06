import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { registerMcpTools } from './tools.js';

export async function runMcpServer(): Promise<void> {
  const server = new McpServer({
    name: 'loopin-harness',
    version: '1.0.0',
  });

  registerMcpTools(server);

  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('[loopin-mcp] Server running on stdio');
}

// If executed directly
if (process.argv[1]?.endsWith('server.js') || process.argv[1]?.endsWith('server.ts')) {
  runMcpServer().catch((err) => {
    console.error('[loopin-mcp] Fatal error:', err);
    process.exit(1);
  });
}
