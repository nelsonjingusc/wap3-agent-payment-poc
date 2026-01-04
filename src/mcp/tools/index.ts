/**
 * MCP Tools Index - Export all MCP tool definitions
 */

export * from './register_agent';
export * from './create_task';
export * from './claim_task';
export * from './submit_evidence';
export * from './verify_evidence';
export * from './settle_task';

import { registerAgentTool } from './register_agent';
import { createTaskTool } from './create_task';
import { claimTaskTool } from './claim_task';
import { submitEvidenceTool } from './submit_evidence';
import { verifyEvidenceTool } from './verify_evidence';
import { settleTaskTool } from './settle_task';

/**
 * All MCP tool definitions for Model Payment Protocol
 */
export const MCP_TOOLS = [
    registerAgentTool,
    createTaskTool,
    claimTaskTool,
    submitEvidenceTool,
    verifyEvidenceTool,
    settleTaskTool,
];

export default MCP_TOOLS;
