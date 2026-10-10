// PROMUNCH Studio MCP server — lets Claude, ChatGPT and other MCP clients
// generate images/videos, read the library, and use the user's creative memory
// and elements, all as the signed-in user.
//
// Transport: MCP Streamable HTTP, stateless (a fresh server per request).
// Auth: Supabase Auth's OAuth 2.1 server issues the access tokens; every tool
// call runs through a user-scoped client, so RLS applies exactly as in the app.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.91.0';
import { McpServer } from 'npm:@modelcontextprotocol/sdk@1.31.0/server/mcp.js';
import { WebStandardStreamableHTTPServerTransport } from 'npm:@modelcontextprotocol/sdk@1.31.0/server/webStandardStreamableHttp.js';
import { registerTools, type Ctx } from './tools.ts';
import { INSTRUCTIONS, registerPrompts } from './prompts.ts';
import { registerWidget } from './widget.ts';
import { registerAppTools } from './app-tools.ts';
import { APP_URL } from '../_shared/site.ts';
import { BRAND } from '../_shared/brand/index.ts';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? '';
const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY') ?? '';
/** Public URL of this server — override when it is proxied behind a custom domain. */
const MCP_URL = (Deno.env.get('MCP_PUBLIC_URL') ?? `${SUPABASE_URL}/functions/v1/mcp`).replace(/\/$/, '');
const METADATA_PATH = '/.well-known/oauth-protected-resource';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'authorization, content-type, mcp-session-id, mcp-protocol-version, last-event-id',
  'Access-Control-Expose-Headers': 'mcp-session-id, www-authenticate',
};

function withCors(res: Response): Response {
  const headers = new Headers(res.headers);
  for (const [k, v] of Object.entries(corsHeaders)) headers.set(k, v);
  return new Response(res.body, { status: res.status, statusText: res.statusText, headers });
}

/** RFC 9728 metadata: tells MCP clients which authorization server issues tokens for us. */
function protectedResourceMetadata(): Response {
  return Response.json({
    resource: MCP_URL,
    authorization_servers: [`${SUPABASE_URL}/auth/v1`],
    bearer_methods_supported: ['header'],
    resource_name: `${BRAND.name} Studio`,
    resource_documentation: APP_URL,
  }, { headers: corsHeaders });
}

function unauthorized(message: string): Response {
  return Response.json(
    { jsonrpc: '2.0', error: { code: -32001, message }, id: null },
    {
      status: 401,
      headers: {
        ...corsHeaders,
        'WWW-Authenticate': `Bearer resource_metadata="${MCP_URL}${METADATA_PATH}"`,
      },
    },
  );
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: corsHeaders });

  const { pathname } = new URL(req.url);
  if (pathname.endsWith(METADATA_PATH)) return protectedResourceMetadata();

  // Stateless server: no standalone SSE stream and no sessions to delete.
  if (req.method !== 'POST') {
    return Response.json(
      { jsonrpc: '2.0', error: { code: -32000, message: 'Method not allowed' }, id: null },
      { status: 405, headers: { ...corsHeaders, Allow: 'POST, OPTIONS' } },
    );
  }

  const authorization = req.headers.get('Authorization') ?? '';
  if (!authorization.toLowerCase().startsWith('bearer ')) return unauthorized(`Sign in to ${BRAND.name} Studio to continue`);

  const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    global: { headers: { Authorization: authorization } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data, error } = await supabase.auth.getUser();
  if (error || !data?.user) return unauthorized(`Your ${BRAND.name} Studio session expired — reconnect the connector`);

  const ctx: Ctx = {
    userId: data.user.id,
    email: data.user.email ?? null,
    authorization,
    supabase,
    supabaseUrl: SUPABASE_URL,
    anonKey: SUPABASE_ANON_KEY,
  };

  const server = new McpServer(
    { name: 'promunch-studio', title: `${BRAND.name} Studio`, version: '1.0.0' },
    { instructions: INSTRUCTIONS },
  );
  registerTools(server, ctx);
  registerAppTools(server, ctx);
  registerPrompts(server);
  registerWidget(server);

  const transport = new WebStandardStreamableHTTPServerTransport({
    sessionIdGenerator: undefined,
    enableJsonResponse: true,
  });

  try {
    await server.connect(transport);
    return withCors(await transport.handleRequest(req));
  } catch (err) {
    console.error('[mcp] request failed', err);
    return Response.json(
      { jsonrpc: '2.0', error: { code: -32603, message: 'Internal server error' }, id: null },
      { status: 500, headers: corsHeaders },
    );
  }
});
