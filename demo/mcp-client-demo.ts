/**
 * MCP Client Demo
 * 
 * Demonstrates connecting to the WAP3 MCP server
 * and using tools via the Model Context Protocol.
 */

import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import { spawn } from 'child_process';

async function runMCPClientDemo() {
    console.log('╔══════════════════════════════════════════════════════════╗');
    console.log('║  MCP Client Demo - WAP3 on Sui                           ║');
    console.log('║  Model Context Protocol Integration                      ║');
    console.log('╚══════════════════════════════════════════════════════════╝\n');

    // Start MCP server as subprocess
    console.log('📡 Starting MCP server...\n');
    const serverProcess = spawn('node', ['-r', 'ts-node/register', 'src/mcp/server.ts']);

    // Create MCP client transport
    const transport = new StdioClientTransport({
        command: 'node',
        args: ['-r', 'ts-node/register', 'src/mcp/server.ts'],
    });

    const client = new Client(
        {
            name: 'wap3-client',
            version: '1.0.0',
        },
        {
            capabilities: {},
        }
    );

    try {
        await client.connect(transport);
        console.log('✓ Connected to MCP server\n');

        // Discover available tools
        console.log('🔍 Discovering available tools...\n');
        const toolsResult = await client.listTools();

        console.log(`Found ${toolsResult.tools.length} tools:`);
        toolsResult.tools.forEach((tool, i) => {
            console.log(`  ${i + 1}. ${tool.name} - ${tool.description}`);
        });
        console.log();

        const createResult = await client.callTool({
            name: 'create_task',
            arguments: {
                taskType: 'text_summarization',
                requirements: 'Summarize research papers on blockchain consensus',
                rewardAmountSUI: 0.08,
                deadlineHours: 48,
                maxWorkers: 1,
            },
        });

        const createResultContent = createResult.content as Array<{ type: string; text: string }>;
        const createData = JSON.parse(createResultContent[0].text);
        console.log('✓ Tool result:', createData);
        console.log(`  Task ID: ${createData.taskId}\n`);

        // Call claim_task tool
        console.log('👷 Calling claim_task tool...\n');
        const claimResult = await client.callTool({
            name: 'claim_task',
            arguments: {
                taskId: createData.taskId,
            },
        });

        const claimResultContent = claimResult.content as Array<{ type: string; text: string }>;
        const claimData = JSON.parse(claimResultContent[0].text);
        console.log('✓ Tool result:', claimData);
        console.log(`  Claim ID: ${claimData.claimId}\n`);

        console.log('╔══════════════════════════════════════════════════════════╗');
        console.log('║  ✓ MCP Demo Completed Successfully!                      ║');
        console.log('╚══════════════════════════════════════════════════════════╝\n');

        console.log('MCP Integration Benefits:');
        console.log('  ✓ Standardized protocol for tool discovery');
        console.log('  ✓ Language-agnostic client/server architecture');
        console.log('  ✓ Easy integration with any MCP-compatible agent');
        console.log('  ✓ Automatic schema validation');
        console.log('  ✓ Support for streaming and progress updates\n');

        console.log('Use Cases:');
        console.log('  • Claude Desktop MCP integration');
        console.log('  • Custom agent frameworks');
        console.log('  • Multi-agent systems');
        console.log('  • Cross-platform tool sharing\n');

    } catch (error: any) {
        console.error('\n❌ Demo failed:', error.message);
        console.error('\nTroubleshooting:');
        console.error('  1. Ensure @modelcontextprotocol/sdk is installed');
        console.error('  2. Check .env configuration');
        console.error('  3. Verify MCP server starts correctly');
        console.error('  4. Check node version compatibility\n');
        process.exit(1);
    } finally {
        await client.close();
    }
}

// Run demo
if (require.main === module) {
    runMCPClientDemo().catch(console.error);
}

export default runMCPClientDemo;
