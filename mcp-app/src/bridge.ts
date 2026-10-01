// Talks to the chat host that renders this panel.
//
// MCP Apps hosts (Claude and others) speak JSON-RPC over postMessage
// (spec 2026-01-26). ChatGPT also exposes `window.openai`; it is used when the
// MCP Apps handshake gets no answer. Everything degrades: if the host can't
// proxy tool calls, the panels say so instead of breaking.

type Json = Record<string, unknown>;

export interface ToolResult {
  structuredContent?: Json;
  content?: Array<{ type: string; text?: string }>;
  isError?: boolean;
}

export type DisplayMode = 'inline' | 'fullscreen' | 'pip';

interface OpenAiGlobals {
  toolOutput?: Json;
  toolInput?: Json;
  theme?: 'light' | 'dark';
  displayMode?: DisplayMode;
  callTool?: (name: string, args: Json) => Promise<ToolResult>;
  sendFollowUpMessage?: (args: { prompt: string }) => Promise<void>;
  openExternal?: (args: { href: string }) => void;
  requestDisplayMode?: (args: { mode: DisplayMode }) => Promise<{ mode: DisplayMode }>;
}

declare global {
  interface Window { openai?: OpenAiGlobals }
}

const PROTOCOL = '2026-01-26';

type Listener<T> = (value: T) => void;

class Bridge {
  kind: 'mcp' | 'openai' | 'none' = 'none';
  caps: Json = {};
  theme: 'light' | 'dark' | null = null;
  displayMode: DisplayMode = 'inline';
  availableModes: DisplayMode[] = ['inline'];

  private nextId = 1;
  private waiting = new Map<number, { resolve: (v: unknown) => void; reject: (e: unknown) => void }>();
  private resultListeners = new Set<Listener<ToolResult>>();
  private inputListeners = new Set<Listener<Json>>();
  private contextListeners = new Set<Listener<void>>();
  private lastResult: ToolResult | null = null;
  private lastHeight = 0;

  constructor() {
    window.addEventListener('message', (e) => this.onMessage(e.data));
  }

  /** Handshake with the host; resolves once we know what it can do. */
  async init(): Promise<void> {
    try {
      const res = await Promise.race([
        this.request('ui/initialize', {
          protocolVersion: PROTOCOL,
          appInfo: { name: 'oltaflock-studio', version: '2.0.0' },
          appCapabilities: { availableDisplayModes: ['inline', 'fullscreen'] },
        }),
        new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), 1500)),
      ]) as Json;
      this.kind = 'mcp';
      this.caps = (res.hostCapabilities as Json) ?? {};
      this.applyContext(res.hostContext as Json | undefined);
      this.notify('ui/notifications/initialized', {});
    } catch {
      if (window.openai) {
        this.kind = 'openai';
        this.readOpenAi();
        window.addEventListener('openai:set_globals', () => this.readOpenAi());
      }
    }
    new ResizeObserver(() => this.reportSize()).observe(document.body);
    this.reportSize();
  }

  get canCallTools() {
    return this.kind === 'mcp' ? !!this.caps.serverTools : this.kind === 'openai' && !!window.openai?.callTool;
  }
  get canMessage() {
    return this.kind === 'mcp' ? !!this.caps.message : this.kind === 'openai' && !!window.openai?.sendFollowUpMessage;
  }
  get canFullscreen() {
    return this.availableModes.includes('fullscreen');
  }

  onToolResult(cb: Listener<ToolResult>) {
    this.resultListeners.add(cb);
    if (this.lastResult) cb(this.lastResult);
    return () => { this.resultListeners.delete(cb); };
  }
  onToolInput(cb: Listener<Json>) {
    this.inputListeners.add(cb);
    return () => { this.inputListeners.delete(cb); };
  }
  onContextChange(cb: Listener<void>) {
    this.contextListeners.add(cb);
    return () => { this.contextListeners.delete(cb); };
  }

  /** Calls one of our server's tools and returns its structuredContent; throws with the tool's message on error. */
  async callTool<T = Json>(name: string, args: Json = {}): Promise<T> {
    if (!this.canCallTools) throw new Error('This chat app can’t run actions from the panel. Ask in the chat instead.');
    const res = (this.kind === 'mcp'
      ? await this.request('tools/call', { name, arguments: args })
      : await window.openai!.callTool!(name, args)) as ToolResult;
    if (res?.isError) {
      throw new Error((res.content ?? []).map((c) => c.text ?? '').join(' ').trim() || 'Something went wrong');
    }
    return (res?.structuredContent ?? {}) as T;
  }

  /** Posts a user message into the chat, so the model picks it up and acts. */
  async sendMessage(text: string): Promise<void> {
    if (this.kind === 'mcp') {
      const res = await this.request('ui/message', { role: 'user', content: [{ type: 'text', text }] }) as Json;
      if (res?.isError) throw new Error('The chat did not accept the message');
    } else if (this.kind === 'openai' && window.openai?.sendFollowUpMessage) {
      await window.openai.sendFollowUpMessage({ prompt: text });
    } else {
      throw new Error('This chat app can’t receive messages from the panel. Copy the request into the chat.');
    }
  }

  /** Quietly tells the model what happened in the panel (read on the user's next message). */
  updateContext(text: string, structured?: Json) {
    if (this.kind !== 'mcp' || !this.caps.updateModelContext) return;
    this.request('ui/update-model-context', { content: [{ type: 'text', text }], structuredContent: structured }).catch(() => {});
  }

  openLink(url: string) {
    if (this.kind === 'mcp') this.request('ui/open-link', { url }).catch(() => window.open(url, '_blank', 'noopener'));
    else if (window.openai?.openExternal) window.openai.openExternal({ href: url });
    else window.open(url, '_blank', 'noopener');
  }

  download(url: string, name: string, mimeType?: string) {
    if (this.kind === 'mcp' && this.caps.downloadFile) {
      this.request('ui/download-file', { contents: [{ type: 'resource_link', uri: url, name, mimeType }] })
        .catch(() => this.openLink(url));
    } else {
      this.openLink(url);
    }
  }

  async setDisplayMode(mode: DisplayMode): Promise<DisplayMode> {
    try {
      const res = this.kind === 'mcp'
        ? await this.request('ui/request-display-mode', { mode }) as { mode: DisplayMode }
        : window.openai?.requestDisplayMode ? await window.openai.requestDisplayMode({ mode }) : { mode: this.displayMode };
      this.displayMode = res?.mode ?? this.displayMode;
    } catch { /* host refused */ }
    this.contextListeners.forEach((cb) => cb());
    return this.displayMode;
  }

  // ── internals ──

  private send(msg: Json) {
    window.parent.postMessage({ jsonrpc: '2.0', ...msg }, '*');
  }
  private notify(method: string, params: Json) {
    this.send({ method, params });
  }
  private request(method: string, params: Json): Promise<unknown> {
    const id = this.nextId++;
    return new Promise((resolve, reject) => {
      this.waiting.set(id, { resolve, reject });
      this.send({ id, method, params });
    });
  }

  private onMessage(m: Json) {
    if (!m || m.jsonrpc !== '2.0') return;
    const id = m.id as number | undefined;
    if (id !== undefined && !m.method && this.waiting.has(id)) {
      const w = this.waiting.get(id)!;
      this.waiting.delete(id);
      if (m.error) w.reject(m.error); else w.resolve(m.result);
      return;
    }
    switch (m.method) {
      case 'ui/notifications/tool-result':
        this.emitResult(m.params as ToolResult);
        break;
      case 'ui/notifications/tool-input':
        this.inputListeners.forEach((cb) => cb(((m.params as Json)?.arguments as Json) ?? {}));
        break;
      case 'ui/notifications/host-context-changed':
        this.applyContext(m.params as Json);
        break;
      default:
        // Answer any request we don't handle (e.g. ui/resource-teardown) so the host isn't left waiting.
        if (id !== undefined && m.method) this.send({ id, result: {} });
    }
  }

  private emitResult(result: ToolResult) {
    this.lastResult = result;
    this.resultListeners.forEach((cb) => cb(result));
  }

  private applyContext(ctx?: Json) {
    if (!ctx) return;
    if (ctx.theme === 'light' || ctx.theme === 'dark') this.theme = ctx.theme;
    if (typeof ctx.displayMode === 'string') this.displayMode = ctx.displayMode as DisplayMode;
    if (Array.isArray(ctx.availableDisplayModes)) this.availableModes = ctx.availableDisplayModes as DisplayMode[];
    if (this.theme) document.documentElement.dataset.theme = this.theme;
    document.documentElement.dataset.display = this.displayMode;
    this.contextListeners.forEach((cb) => cb());
  }

  private readOpenAi() {
    const o = window.openai;
    if (!o) return;
    if (o.theme) { this.theme = o.theme; document.documentElement.dataset.theme = o.theme; }
    if (o.displayMode) { this.displayMode = o.displayMode; document.documentElement.dataset.display = o.displayMode; }
    this.availableModes = ['inline', 'fullscreen'];
    if (o.toolOutput && (!this.lastResult || this.lastResult.structuredContent !== o.toolOutput)) {
      this.emitResult({ structuredContent: o.toolOutput });
    }
    this.contextListeners.forEach((cb) => cb());
  }

  private reportSize() {
    if (this.kind !== 'mcp') return;
    const h = Math.ceil(document.documentElement.getBoundingClientRect().height);
    if (h === this.lastHeight) return;
    this.lastHeight = h;
    this.notify('ui/notifications/size-changed', { width: document.documentElement.scrollWidth, height: h });
  }
}

export const host = new Bridge();
