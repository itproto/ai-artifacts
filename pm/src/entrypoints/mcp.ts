#!/usr/bin/env bun
import { access } from "node:fs/promises";
import { join } from "node:path";
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
	CallToolRequestSchema,
	ErrorCode,
	ListToolsRequestSchema,
	McpError,
} from "@modelcontextprotocol/sdk/types.js";
import { findActiveSprint, readSprintItems } from "../services/board.ts";
import { VERSION } from "../version.ts";

const server = new Server(
	{ name: "itproto/pm", version: VERSION },
	{ capabilities: { tools: {} } },
);

server.setRequestHandler(ListToolsRequestSchema, async () => ({
	tools: [
		{
			name: "pm_ls",
			description:
				"List all stories and tasks in the active sprint. Returns id, title, status, assignee, and points for each item.",
			inputSchema: {
				type: "object" as const,
				properties: {
					cwd: {
						type: "string",
						description:
							"Path to repo root containing .pm/ board. Defaults to process.cwd().",
					},
				},
				required: [],
			},
		},
	],
}));

server.setRequestHandler(CallToolRequestSchema, async (request) => {
	if (request.params.name !== "pm_ls") {
		throw new McpError(ErrorCode.MethodNotFound, `Unknown tool: ${request.params.name}`);
	}

	const cwd = (request.params.arguments?.cwd as string | undefined) ?? process.cwd();

	try {
		await access(join(cwd, ".pm"));
	} catch {
		throw new McpError(ErrorCode.InvalidRequest, `.pm/ board not found at ${cwd}`);
	}

	const sprint = await findActiveSprint(cwd);

	if (!sprint) {
		return {
			content: [{ type: "text" as const, text: JSON.stringify({ sprint: null, items: [] }) }],
		};
	}

	const items = await readSprintItems(cwd, sprint);

	return {
		content: [
			{
				type: "text" as const,
				text: JSON.stringify({ sprint, items }),
			},
		],
	};
});

const transport = new StdioServerTransport();
await server.connect(transport);
