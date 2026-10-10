// The PROMUNCH Studio chat panel: an MCP App (ui:// resource) that Claude,
// ChatGPT and other MCP Apps hosts render inline under our tools. One bundle
// serves every view (results, composer, library, storyboard, memory); the tool
// result's `view` picks which. Source lives in mcp-app/ and is bundled into
// ui.gen.ts by `npm run build:mcp-ui`.

import type { McpServer } from 'npm:@modelcontextprotocol/sdk@1.31.0/server/mcp.js';
import { STUDIO_HTML } from './ui.gen.ts';
import { CDN_BASE, STORAGE_API } from '../_shared/site.ts';

// Versioned so hosts that cache resources by URI pick up a new bundle.
export const WIDGET_URI = 'ui://promunch/studio-v1.html';
const MIME = 'text/html;profile=mcp-app';

/** Where media loads from: our CDN, the preview Worker, and the providers' temporary hosts. */
const WIDGET_CSP = {
  resourceDomains: [
    CDN_BASE.replace(/\/$/, ''),
    STORAGE_API,
    'https://*.aiquickdraw.com',
    'https://*.redpandaai.co',
    'https://*.kie.ai',
    'https://*.supabase.co',
  ],
  connectDomains: [],
};

/** Tool `_meta` that attaches the panel (MCP Apps key, legacy key, and ChatGPT's own). */
export const WIDGET_TOOL_META = {
  ui: { resourceUri: WIDGET_URI },
  'ui/resourceUri': WIDGET_URI,
  'openai/outputTemplate': WIDGET_URI,
  'openai/widgetAccessible': true,
  'openai/toolInvocation/invoking': 'Working in PROMUNCH Studio…',
  'openai/toolInvocation/invoked': 'PROMUNCH Studio',
};

/** Tool `_meta` for tools only the panel calls: hidden from the model. */
export const APP_ONLY_META = {
  ui: { visibility: ['app'] },
  'openai/visibility': 'private',
  'openai/widgetAccessible': true,
};

export function registerWidget(server: McpServer) {
  const meta = { ui: { csp: WIDGET_CSP, prefersBorder: false } };
  server.registerResource(
    'studio-panel',
    WIDGET_URI,
    { title: 'PROMUNCH Studio', description: 'Interactive previews, composer, library, storyboard and memory', mimeType: MIME, _meta: meta },
    (uri: URL) => ({ contents: [{ uri: uri.href, mimeType: MIME, text: STUDIO_HTML, _meta: meta }] }),
  );
}
