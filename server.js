import { McpServer } from 'tmcp';
import { ValibotJsonSchemaAdapter } from '@tmcp/adapter-valibot';
import { HttpTransport } from '@tmcp/transport-http';
import * as v from 'valibot';
import { tool } from 'tmcp/utils';
import { serve } from 'srvx';
import { readFileSync } from 'node:fs';

const adapter = new ValibotJsonSchemaAdapter();

const server = new McpServer(
	{
		name: 'reproduction-server',
		version: '1.0.0',
		description: 'Simple MCP server for reproduction',
	},
	{
		adapter,
		capabilities: {
			tools: { listChanged: true },
			resources: { listChanged: true },
		},
	},
);

// Read the HTML content for the UI resource
const appHtml = readFileSync(new URL('./app.html', import.meta.url), 'utf-8');

// Define a UI resource (MCP Apps spec)
server.resource(
	{
		name: 'example-app',
		description: 'An example MCP App UI',
		uri: 'ui://reproduction-server/example-app',
		mimeType: 'text/html;profile=mcp-app',
	},
	async (uri) => ({
		contents: [
			{
				uri,
				mimeType: 'text/html;profile=mcp-app',
				text: appHtml,
			},
		],
	}),
);

// Define a tool that returns a UI resource
server.tool(
	{
		name: 'show-example',
		description: 'A tool that returns a UI resource',
		schema: v.object({
			message: v.pipe(v.string(), v.title('Message'), v.description('Message to display')),
		}),
		_meta: {
			ui: {
				resourceUri: 'ui://reproduction-server/example-app',
			},
		},
	},
	async ({ message }) => {
		return tool.text(message || 'Hello from the MCP App!');
	},
);

// Create HTTP transport
const transport = new HttpTransport(server, {
	path: '/mcp',
});

// Start server using srvx for cross-runtime compatibility
serve({
	port: 3000,
	async fetch(req) {
		const response = await transport.respond(req);
		if (response === null) {
			return new Response('Not Found', { status: 404 });
		}
		return response;
	},
});

console.log('MCP HTTP server listening on http://localhost:3000/mcp');
