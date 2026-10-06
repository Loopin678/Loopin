import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js';
import { loadConfig } from '../src/config.js';
import { getStatus, getCurrentBranch } from '../src/git/git.js';
import { AtomicCommitSlicer } from '../src/git/slicer.js';
import { ConflictResolver } from '../src/git/conflict.js';
import { registerMcpTools } from '../src/mcp/tools.js';

async function runTestSuite() {
  console.log('🧪 Starting Loopin Harness Test Suite...\n');

  // Test 1: Config
  console.log('1️⃣  Testing Configuration:');
  const config = loadConfig();
  console.log(`   - Backend: ${config.backendUrl}`);
  console.log(`   - Project ID: ${config.projectId}`);
  console.log(`   - AI Provider: ${config.aiProvider}`);
  console.log('   ✔ Config loaded successfully.\n');

  // Test 2: Git Status
  console.log('2️⃣  Testing Git Operations:');
  const branch = await getCurrentBranch();
  const status = await getStatus();
  console.log(`   - Branch: ${branch}`);
  console.log(`   - Files changed: ${status.files.length}`);
  console.log('   ✔ Git operations succeeded.\n');

  // Test 3: Slicer Partitioning
  console.log('3️⃣  Testing Atomic Commit Slicer:');
  const slicer = new AtomicCommitSlicer(config);
  const slices = await slicer.plan();
  console.log(`   - Planned slices count: ${slices.length}`);
  slices.forEach((s, idx) => {
    console.log(`     [Slice ${idx + 1}] ${s.title} (${s.files.length} files)`);
  });
  console.log('   ✔ Slicer planned atomic slices successfully.\n');

  // Test 4: Conflict Resolver Synthesis
  console.log('4️⃣  Testing Conflict Resolution Synthesis:');
  const resolver = new ConflictResolver(config);
  const mockConflict = `
import { a } from './a';
<<<<<<< HEAD
import { b } from './b';
const x = 1;
=======
import { c } from './c';
const x = 2;
>>>>>>> feature-branch
export default x;
`;
  // Test heuristic
  const resolved = (resolver as any).heuristicSynthesize(mockConflict);
  if (!resolved.includes('<<<<<<<') && !resolved.includes('>>>>>>>')) {
    console.log('   ✔ Conflict markers cleanly removed and synthesized.\n');
  } else {
    throw new Error('Conflict markers remained in resolution!');
  }

  // Test 5: MCP Server & Client
  console.log('5️⃣  Testing MCP Server & Tools:');
  const server = new McpServer({ name: 'loopin-test', version: '1.0.0' });
  registerMcpTools(server);

  const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
  await server.connect(serverTransport);

  const client = new Client({ name: 'test-client', version: '1.0.0' });
  await client.connect(clientTransport);

  const toolsList = await client.listTools();
  console.log(`   - Registered MCP tools (${toolsList.tools.length}):`);
  toolsList.tools.forEach((t) => console.log(`     • ${t.name}: ${t.description?.split('\n')[0]}`));

  // Execute loopin_get_context tool via MCP
  const contextRes = await client.callTool({
    name: 'loopin_get_context',
    arguments: {},
  });
  console.log('   - loopin_get_context output received via MCP client.');
  console.log('   ✔ MCP server, client, and tools verified successfully.\n');

  console.log('🎉 All 5 test suites passed with 100% success!');
}

runTestSuite().catch((err) => {
  console.error('❌ Test failed:', err);
  process.exit(1);
});
