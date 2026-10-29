// Purpose: v0.4 — the Claude plugin's mod (docs/v0.4/plan.md). Two jobs; the rest is the plugin service's
// (plugin/src/plugin-server.ts, CAM_HOST=claude) and the engine's:
// 1. Routing. Claude Desktop starts Code sessions with ANTHROPIC_BASE_URL set and ignores settings files for it, so
//    the mod registers this process's original upstream with the engine, then points this process at that explicit
//    route with $.env.set, before the first request where it can. Official and Anthropic-compatible relay endpoints
//    both work; Bedrock, Vertex and Foundry keep their native transport. Process-local settings are restored only
//    while they still have the values this mod installed. Authentication stays with the registered upstream.
// 2. The way to the panel. The panel is the Codex panel itself (plugin/src/panel.html), served by the engine as a page
//    for this session (proxy.ts, /__cam/panel): a mod draws only its own simple elements (no web page), and Claude
//    Code opens no MCP app for the user. /cam opens the page in Claude Desktop's own browser, beside the conversation
//    (user 2026-10-10). A small pane comes up only when there is something to say: the page could not open there (the
//    terminal, VS Code, a failure), with a link to it and a button that copies it; or checks have no effect for this
//    session (its requests do not go through the engine).
// Also: the model's cam_view_image call gets this session's id (the service may outlive a /clear or /resume), and needs
// no permission prompt: it is the plugin's own read-only tool, approved as in Codex (default_tools_approval_mode
// "approve" there; user 2026-10-10 here). A deny or ask from the user's own hooks or settings still stands.
// v0.6 (user 2026-10-13): in Claude Desktop the page opens by itself once the session has images, without /cam, and
// again after Claude Desktop closed it; closed by the user, it stays closed in that session until /cam. Claude Desktop
// closes a session's browser preview, the page's tab with it, after 30 minutes without a turn (its log: "WarmLifecycle
// … Idle timeout reached"), while the Claude Code process goes on; under memory pressure it also stops a long-idle
// session's process and starts it again when the session is used ("CliGovernor … evicting"). So a tab gone before
// that limit was closed by the user, kept in the plugin's store for the session; one gone over a longer pause opens
// again with the next turn.
// Input: mod events. Output: env changes for this process, a pane, requests to the engine on 127.0.0.1, the page in
// Claude Desktop's browser.

const PLUGIN = 'codex-attachment-manager'
// The engine's port (engine.ts, DEFAULT_PORT); the plugin's MCP server starts the engine on it.
const ENGINE_PORT = 17891
// Registered routes use a separate listener that an older engine cannot mistake for a ChatGPT request.
const ROUTING_PORT = ENGINE_PORT + 1
const PANE = 'cam'
const ROUTING = { plugin: 'codex-attachment-manager', key: 'routing' }
// The model's image fetch, as Claude Code names the tool of this plugin's MCP server (.claude-plugin/plugin.json).
const FETCH_TOOL = 'mcp__plugin_codex-attachment-manager_codex_attachment_manager__cam_view_image'
// v0.6: the sessions where the user closed the page ($.store: session id → when), the newest kept.
const CLOSED = 'closedPanels'
const CLOSED_KEPT = 200
// v0.6: Claude Desktop's idle limit for a session's browser preview, and the check made a little before it.
const DESKTOP_IDLE_MS = 30 * 60 * 1000
const PAUSE_CHECK_MS = 25 * 60 * 1000

const WORDS = {
  zh: {
    title: '上下文素材',
    open: '打开素材面板', copy: '复制链接', copied: '已复制链接',
    opened: '面板已在 Claude 自带的浏览器里打开。',
    hint: '面板是本机引擎提供的网页，和 Codex 里的面板相同：勾选、预览、筛选、自动选图都在那里。点上面的链接在浏览器里打开，或复制链接粘贴到浏览器。',
    summary: (images, off) => `本会话 ${images} 张图片${off ? `，${off} 张不发送` : ''}`,
    routing: {
      on: (port) => `本会话的请求经过本机引擎（端口 ${port}）`,
      waiting: '正在等待本机引擎启动…',
      'other-endpoint': '本会话使用别的服务地址，没有接管：勾选不会生效',
      provider: '本会话使用第三方模型服务，没有接管：勾选不会生效',
      'engine-old': '运行中的引擎版本较旧，不支持独立线路：关掉 Codex 后运行 cam install，再开新会话',
      'no-engine': '本机引擎没有启动，本会话直连：勾选不会生效',
      failed: '切换请求地址没有成功，本会话直连：勾选不会生效',
    },
  },
  en: {
    title: 'Context Assets',
    open: 'Open the assets panel', copy: 'Copy link', copied: 'Link copied',
    opened: 'The panel is open in Claude\'s own browser.',
    hint: 'The panel is a page the local engine serves, the same as in Codex: checks, previews, filters and automatic selection are there. Open it in a browser with the link above, or copy the link into one.',
    summary: (images, off) => `${images} images in this session${off ? `, ${off} not sent` : ''}`,
    routing: {
      on: (port) => `This session's requests go through the local engine (port ${port})`,
      waiting: 'Waiting for the local engine…',
      'other-endpoint': 'This session uses another endpoint and is left alone: checks have no effect',
      provider: 'This session uses a third-party provider and is left alone: checks have no effect',
      'engine-old': 'The running engine is too old to use separate routes: close Codex, run cam install, then start a new session',
      'no-engine': 'The local engine is not running; this session connects directly: checks have no effect',
      failed: 'Switching the endpoint failed; this session connects directly: checks have no effect',
    },
  },
  ja: {
    title: 'コンテキスト素材',
    open: '素材パネルを開く', copy: 'リンクをコピー', copied: 'リンクをコピーしました',
    opened: 'Claude 内蔵のブラウザーでパネルを開きました。',
    hint: 'パネルはローカルエンジンが提供するページで、Codex のパネルと同じです。画像の選択、プレビュー、絞り込み、自動選択ができます。上のリンクを開くか、コピーしてブラウザーに貼り付けてください。',
    summary: (images, off) => `このセッションの画像 ${images} 枚${off ? `、未送信 ${off} 枚` : ''}`,
    routing: {
      on: (port) => `このセッションはローカルエンジン（ポート ${port}）に接続しています`,
      waiting: 'ローカルエンジンの起動を待っています…',
      'other-endpoint': 'このセッションは別の接続先を使用しています。画像の選択は反映されません',
      provider: 'このセッションは外部のモデルサービスを使用しています。画像の選択は反映されません',
      'engine-old': '実行中のエンジンが古く、個別の接続経路に対応していません。Codex を終了して cam install を実行し、新しいセッションを開始してください',
      'no-engine': 'ローカルエンジンが起動していないため、直接接続しています。画像の選択は反映されません',
      failed: '接続先の切り替えに失敗したため、直接接続しています。画像の選択は反映されません',
    },
  },
}

// What the pane shows, kept between redraws: the routing state, whether /cam opened the page in Claude's browser, and
// the engine's short answer about the session (read when the pane opens, then again after each turn and each /clear or
// /resume once it has been opened).
let routingState = null
let inBrowser = false
let overview = null
let paneOpened = false
let copied = false
// v0.6: the session whose page this process had open in Claude's browser (null: none); when the last turn ended
// (Claude Desktop's idle timer starts then; null while a turn runs); the check before its limit; the page's work,
// one step at a time (two checks at once could open two tabs).
let pageFor = null
let quietSince = null
let pauseCheck = null
let pageWork = Promise.resolve()

// The engine's panel API answers in JSON; the header marks a request as the panel's (a browser page cannot send it).
async function api($, path) {
  const response = await $.http.fetch(`http://127.0.0.1:${ENGINE_PORT}${path}`, { headers: { 'x-cam-panel': '1' } })
  let body = null
  try { body = response.text ? JSON.parse(response.text) : null } catch { body = null }
  if (!response.ok) throw new Error(body?.error ?? `HTTP ${response.status}`)
  return body
}

// ---- Routing ----

async function readRouting($) {
  return (await $.state.get(ROUTING)).value ?? null
}

async function writeRouting($, value) {
  routingState = value
  await $.state.set(ROUTING, value)
  await $.ui.invalidate('ui.render')
}

function loopbackAdded(original) {
  const entries = (original || '').split(',').map((value) => value.trim()).filter(Boolean)
  return [...new Set([...entries, '127.0.0.1', 'localhost', '::1'])].join(',')
}

const idle = (reason) => ({ active: false, port: null, originalBaseUrl: null, originalNoProxy: null, originalNoProxyLower: null, reason })

// `attempts` × 0.5 s at most for the engine to answer; false when it did not (yet).
async function startRouting($, attempts = 60) {
  const saved = await readRouting($)
  // Already switched in this process (the module was reloaded): keep what it saved.
  if (saved?.active && saved.managedBaseUrl) { routingState = saved; return true }
  // An older mod pointed at the bare engine URL. Recover its upstream before registering an explicit route.
  if (saved?.active) await restoreRouting($)
  const current = await $.env.get('ANTHROPIC_BASE_URL')
  const providers = [await $.env.get('CLAUDE_CODE_USE_BEDROCK'), await $.env.get('CLAUDE_CODE_USE_VERTEX'), await $.env.get('CLAUDE_CODE_USE_FOUNDRY')]
  if (providers.some((value) => value && value !== '0')) { await writeRouting($, idle('provider')); return true }
  await writeRouting($, idle('waiting'))
  // The plugin's MCP server starts the engine with the session; wait for it to answer. An engine started by an older
  // copy of the plugin may only guess the upstream from the URL path: leave the session alone then.
  let port = null
  let reason = 'no-engine'
  for (let attempt = 0; attempt < attempts && port === null && reason !== 'engine-old'; attempt++) {
    try {
      const health = await $.http.fetch(`http://127.0.0.1:${ENGINE_PORT}/__cam/health`)
      const body = health.ok ? JSON.parse(health.text) : null
      if (body?.service === PLUGIN && body.routingVersion >= 1 && body.routingPort === ROUTING_PORT) port = ENGINE_PORT
      else if (body?.service === PLUGIN) reason = 'engine-old'
    } catch { /* the engine is still starting */ }
    if (port === null && reason !== 'engine-old') await $.clock.sleep(500)
  }
  if (port === null) {
    if (reason === 'no-engine' && attempts < 60) return false
    await writeRouting($, idle(reason))
    return true
  }
  let route
  try {
    const response = await $.http.fetch(`http://127.0.0.1:${port}/__cam/routes`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-cam-panel': '1' },
      body: JSON.stringify({ platform: 'claude', baseUrl: current || 'https://api.anthropic.com' }),
    })
    if (!response.ok) throw new Error('route registration failed')
    route = JSON.parse(response.text)
    if (typeof route.id !== 'string' || !/^[a-zA-Z0-9_-]+$/.test(route.id) || route.baseUrl !== `http://127.0.0.1:${ROUTING_PORT}/__cam/routes/${route.id}`) throw new Error('invalid route response')
  } catch {
    await writeRouting($, idle('failed'))
    return true
  }
  const originalNoProxy = await $.env.get('NO_PROXY')
  const originalNoProxyLower = await $.env.get('no_proxy')
  const saving = {
    active: true, port: ROUTING_PORT,
    originalBaseUrl: current ?? null, originalNoProxy: originalNoProxy ?? null, originalNoProxyLower: originalNoProxyLower ?? null,
    managedBaseUrl: route.baseUrl, managedNoProxy: loopbackAdded(originalNoProxy), managedNoProxyLower: loopbackAdded(originalNoProxyLower),
    reason: null,
  }
  await writeRouting($, saving)
  try {
    // Requests to the engine must not go through a system proxy.
    await $.env.set('NO_PROXY', saving.managedNoProxy)
    await $.env.set('no_proxy', saving.managedNoProxyLower)
    await $.env.set('ANTHROPIC_BASE_URL', saving.managedBaseUrl)
  } catch {
    await restoreRouting($)
    await writeRouting($, { ...saving, active: false, reason: 'failed' })
  }
  return true
}

async function restoreRouting($) {
  const saved = await readRouting($)
  if (!saved?.active) return
  const restore = async (name, managed, original) => {
    if (await $.env.get(name) === managed) await $.env.set(name, original ?? undefined)
  }
  await restore('ANTHROPIC_BASE_URL', saved.managedBaseUrl ?? `http://127.0.0.1:${saved.port}`, saved.originalBaseUrl)
  await restore('NO_PROXY', saved.managedNoProxy ?? loopbackAdded(saved.originalNoProxy), saved.originalNoProxy)
  await restore('no_proxy', saved.managedNoProxyLower ?? loopbackAdded(saved.originalNoProxyLower), saved.originalNoProxyLower)
  routingState = { ...saved, active: false, reason: null }
  await $.state.set(ROUTING, routingState)
}

// ---- The panel page and the pane ----

const panelUrl = (sessionId) => `http://localhost:${ENGINE_PORT}/__cam/panel?session=${encodeURIComponent(sessionId)}`

// Claude Desktop's browser tools: the Claude_Browser server it gives each Code session, the one the model opens pages
// with. They are the desktop's, not a plugin interface: where they are missing or fail, the pane offers the link.
async function openInBrowser($, url) {
  try {
    const result = await $.mcp.call('Claude_Browser', 'preview_start', { url })
    return result?.isError !== true
  } catch {
    return false
  }
}

// v0.6: the JSON object a text answer starts with. The browser tools add a line of text after it, which may hold braces
// of its own (tabs_context while the pane is not open: '… navigate with {"url": …} to open it.').
function leadingJson(text) {
  const start = text.indexOf('{')
  let depth = 0
  let inString = false
  for (let i = Math.max(start, 0); start >= 0 && i < text.length; i++) {
    const c = text[i]
    if (inString) {
      if (c === '\\') i++
      else if (c === '"') inString = false
    } else if (c === '"') inString = true
    else if (c === '{') depth++
    else if (c === '}' && --depth === 0) return JSON.parse(text.slice(start, i + 1))
  }
  return null
}

// v0.6: the session's tabs in Claude's browser (tabs_context answers JSON, then a line of text), the page's told apart
// by the engine's origin; null when the browser tools are not there or fail.
const PAGE_ORIGIN = `http://localhost:${ENGINE_PORT}`
async function pageTabs($) {
  try {
    const result = await $.mcp.call('Claude_Browser', 'tabs_context', {})
    if (result?.isError) return null
    const tabs = leadingJson((result?.content ?? []).map((block) => block?.text ?? '').join('\n'))?.tabs
    return Array.isArray(tabs) ? tabs.filter((tab) => tab?.origin === PAGE_ORIGIN) : null
  } catch {
    return null
  }
}

async function closedHere($, sessionId) {
  const closed = (await $.store.get(CLOSED)) ?? {}
  return typeof closed[sessionId] === 'string'
}

async function markClosed($, sessionId, isClosed) {
  const closed = { ...((await $.store.get(CLOSED)) ?? {}) }
  if (isClosed) closed[sessionId] = new Date(await $.clock.now()).toISOString()
  else if (sessionId in closed) delete closed[sessionId]
  else return
  const newest = Object.entries(closed).sort((a, b) => String(b[1]).localeCompare(String(a[1]))).slice(0, CLOSED_KEPT)
  await $.store.set(CLOSED, Object.fromEntries(newest))
}

// The page's work, after whatever is under way.
function pageStep(work) {
  const step = pageWork.then(work)
  pageWork = step.catch(() => {})
  return step
}

// /cam: the user asked, so a close before no longer counts. One tab of the page: the new one replaces any open.
async function openPanel($) {
  routingState = (await readRouting($)) ?? routingState
  const sessionId = await $.session.id()
  await pageStep(async () => {
    await markClosed($, sessionId, false).catch(() => {})
    const before = (await pageTabs($)) ?? []
    inBrowser = await openInBrowser($, panelUrl(sessionId))
    if (!inBrowser) return
    pageFor = sessionId
    for (const tab of before) await $.mcp.call('Claude_Browser', 'tabs_close', { tabId: tab.tabId }).catch(() => {})
  })
  if (!inBrowser || !routingState?.active) await openPane($)
  else await $.ui.invalidate('ui.render')
}

// v0.6: in Claude Desktop (its browser tools answer), with the requests going through the engine, the page opens by
// itself in a session with images, unless the user closed it there. `when`: the process started ('start'), a turn
// starts ('turn', or 'after-pause' once Claude Desktop's idle limit has passed since the last one) or ended ('end'),
// or the check before that limit ('pause').
async function keepPage($, when) {
  if (!routingState?.active) return
  const sessionId = await $.session.id()
  const open = await pageTabs($)
  if (open === null) return
  if (open.length) { pageFor = sessionId; return }
  if (pageFor === sessionId) {
    // Open in this process and gone: Claude Desktop closes it only after a longer pause; else the user closed it.
    pageFor = null
    if (when !== 'after-pause') { await markClosed($, sessionId, true); return }
  }
  if (when === 'pause' || (await closedHere($, sessionId))) return
  const state = await api($, `/__cam/claude/panel?session=${encodeURIComponent(sessionId)}`).catch(() => null)
  if (!state?.totals?.images) return
  if (await openInBrowser($, panelUrl(sessionId))) pageFor = sessionId
}

// v0.6: after /clear or /resume the page follows the new session: the open tab is pointed at it, or it opens as above.
async function followSession($) {
  const sessionId = await $.session.id()
  const open = await pageTabs($)
  if (!open?.length) { pageFor = null; return keepPage($, 'start') }
  await $.mcp.call('Claude_Browser', 'navigate', { url: panelUrl(sessionId), tabId: open[0].tabId })
  pageFor = sessionId
}

// After the event that asked, so it is never held up.
const pageLater = ($, work) => $.clock.after(0, () => { pageStep(work).catch(() => {}) })
const keepPageLater = ($, when) => pageLater($, () => keepPage($, when))

// v0.6: a turn starts: Claude Desktop may have closed the page during the pause before it.
async function pageTurnStarts($) {
  pauseCheck?.cancel()
  pauseCheck = null
  const paused = quietSince !== null && (await $.clock.now()) - quietSince >= DESKTOP_IDLE_MS
  quietSince = null
  keepPageLater($, paused ? 'after-pause' : 'turn')
}

// v0.6: a turn ended: Claude Desktop's idle timer starts; a close before its limit is the user's.
async function pageTurnEnds($) {
  quietSince = await $.clock.now()
  pauseCheck?.cancel()
  pauseCheck = $.clock.after(PAUSE_CHECK_MS, () => { pauseCheck = null; keepPageLater($, 'pause') })
  keepPageLater($, 'end')
}

async function loadOverview($, redraw = true) {
  try {
    const state = await api($, `/__cam/claude/panel?session=${encodeURIComponent(await $.session.id())}`)
    overview = { lang: state.lang, images: state.totals.images, off: state.totals.unchecked }
  } catch {
    overview = null
  }
  if (redraw) await $.ui.invalidate('ui.render')
}

// New images come with a turn, and /clear or /resume brings another session: the count follows, without holding up
// the event.
function reloadOverview($) {
  if (paneOpened) $.clock.after(0, () => { loadOverview($).catch(() => {}) })
}

async function openPane($) {
  routingState = (await readRouting($)) ?? routingState
  copied = false
  paneOpened = true
  await loadOverview($, false)
  await $.ui.open({ id: PANE, title: (WORDS[overview?.lang] ?? WORDS.en).title, focus: true, closeOnEscape: true })
}

async function drawPane($, e) {
  const { Box, Text, Button, Link } = $.ui.resolve(e)
  const w = WORDS[overview?.lang] ?? WORDS.en
  const url = panelUrl(await $.session.id())
  const routing = routingState
  const status = routing?.active ? w.routing.on(routing.port) : w.routing[routing?.reason ?? 'waiting'] ?? w.routing.waiting
  return Box({
    flexDirection: 'column', rowGap: 1,
    children: [
      Text({ bold: true, children: [w.title] }),
      Text(routing?.active ? { dimColor: true, children: [status] } : { color: 'yellow', children: [status] }),
      ...(overview ? [Text({ children: [w.summary(overview.images, overview.off)] })] : []),
      ...(inBrowser ? [Text({ children: [w.opened] })] : []),
      Box({
        flexDirection: 'row', columnGap: 2,
        children: [
          Link({ href: url, label: w.open }),
          Button({ key: 'copy', label: copied ? w.copied : w.copy, onPress: async (press) => {
            await $.ui.copy({ text: url, surface: press.surface })
            copied = true
            await $.ui.invalidate('ui.render')
          } }),
        ],
      }),
      Text({ dimColor: true, children: [w.hint] }),
    ],
  })
}

export function register(on) {
  on('session.start', async ($, e, next) => {
    await $.command.register({ name: 'cam', description: 'Context assets: open the panel to choose which images go to the model (Context Attachment Manager)', immediate: true })
    // Before the first request where possible: a resumed session's unchecked images must not go out with it. The
    // engine usually answers at once; one the plugin's MCP server is still starting gets a few seconds here, then the
    // rest of the wait goes on in the background.
    const done = await startRouting($, 12).catch(() => true)
    if (!done) $.clock.after(0, () => { startRouting($).catch(() => {}) })
    // v0.6: the page, once routing is settled (a process Claude Desktop started again included); when it is still
    // waiting for the engine, with the first turn instead.
    else keepPageLater($, 'start')
    return next(e)
  })

  // /clear, /resume and /branch end a session but not this process: its requests keep going through the engine, and
  // the session state the pane reads is written again for the new session.
  on('classic.SessionStart', { source: ['clear', 'resume', 'fork'] }, async ($, e, next) => {
    if (routingState) await $.state.set(ROUTING, routingState).catch(() => {})
    reloadOverview($)
    pageLater($, () => followSession($))
    return next(e)
  })

  // v0.6: the page is a convenience: whatever happens to it, the turn goes on.
  on('turn.start', async ($, e, next) => {
    await pageTurnStarts($).catch(() => {})
    return next(e)
  })

  on('turn.complete', async ($, e, next) => {
    const result = await next(e)
    reloadOverview($)
    await pageTurnEnds($).catch(() => {})
    return result
  })

  on('session.end', async ($, e, next) => {
    if (e.reason !== 'clear' && e.reason !== 'resume') await restoreRouting($).catch(() => {})
    return next(e)
  })

  on('command.run', { command: 'cam' }, async ($) => {
    await openPanel($)
    return {}
  })

  // The model's fetch call is about this session, whichever the plugin service was started for. A failure here must
  // not stop the call: it then goes on unchanged (the service falls back to the session it was started for).
  on('tool.call', async ($, e, next) => {
    if (typeof e.tool === 'string' && e.tool.endsWith('__cam_view_image')) return next({ ...e, sessionId: await $.session.id() })
    return next(e)
  }).catch(($, e, next) => (next.called ? undefined : next(e)))

  on('classic.PreToolUse', { tool: FETCH_TOOL }, async ($, e, next) => {
    const result = await next(e)
    if (result?.deny !== undefined || result?.ask !== undefined) return result
    return { ...result, allow: true }
  }).catch(($, e, next) => (next.called ? undefined : next(e)))

  on('ui.render', { component: 'Pane' }, async ($, e, next) => {
    if (e.requestId === PANE) return drawPane($, e)
    return next(e)
  })
}
