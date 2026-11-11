// Express 應用：Groq API 代理（僅能呼叫固定 Groq 端點）
import express from 'express';
import path from 'node:path';
import fs from 'node:fs';

export const GROQ_BASE = 'https://api.groq.com/openai/v1';
const MODEL_RE = /^[A-Za-z0-9._:/-]{1,128}$/;
const KEY_RE = /^[A-Za-z0-9_\-.]{10,200}$/;

export function loadConfig(env = process.env) {
  const isProd = env.NODE_ENV === 'production';
  return {
    port: Number(env.PORT) || 8787,
    host: env.HOST || '127.0.0.1',
    isProd,
    serverKey: env.GROQ_API_KEY || '',
    // 本機示範預設允許使用者自帶金鑰；正式環境預設關閉
    allowClientKey: env.ALLOW_CLIENT_KEY ? env.ALLOW_CLIENT_KEY === 'true' : !isProd,
    allowedOrigins: (env.ALLOWED_ORIGINS || 'http://localhost:5173,http://127.0.0.1:5173,http://localhost:8787,http://127.0.0.1:8787')
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean),
    upstreamTimeoutMs: Number(env.UPSTREAM_TIMEOUT_MS) || 60000,
    maxBodyBytes: Number(env.MAX_BODY_BYTES) || 200 * 1024,
    maxMessageChars: Number(env.MAX_MESSAGE_CHARS) || 30000,
    rateLimitPerMin: Number(env.RATE_LIMIT_PER_MIN) || 30,
  };
}

/** 簡易記憶體限流（每 IP 每分鐘），正式環境請改用共享儲存 */
function rateLimiter(limit) {
  const hits = new Map();
  return (req, res, next) => {
    const now = Date.now();
    const ip = req.ip || 'unknown';
    const arr = (hits.get(ip) || []).filter((t) => now - t < 60000);
    if (arr.length >= limit) {
      res.set('Retry-After', String(Math.ceil((60000 - (now - arr[0])) / 1000)));
      return res.status(429).json({ error: { message: '本機代理限流：請稍後再試' } });
    }
    arr.push(now);
    hits.set(ip, arr);
    next();
  };
}

/** 移除錯誤訊息中可能出現的金鑰 */
export function scrub(text) {
  return String(text || '')
    .replace(/gsk_[A-Za-z0-9]{8,}/g, 'gsk_***')
    .replace(/Bearer\s+[A-Za-z0-9_\-.]+/gi, 'Bearer ***')
    .slice(0, 500);
}

export function validateChatBody(body, cfg) {
  if (!body || typeof body !== 'object') return '請求內容必須為 JSON 物件';
  const { model, messages, temperature, max_completion_tokens: mct } = body;
  if (typeof model !== 'string' || !MODEL_RE.test(model)) return 'model 格式不正確';
  if (!Array.isArray(messages) || messages.length < 1 || messages.length > 4) return 'messages 必須為 1～4 筆';
  let total = 0;
  for (const m of messages) {
    if (!m || !['system', 'user'].includes(m.role) || typeof m.content !== 'string') return 'messages 格式不正確（僅允許 system/user 文字）';
    total += m.content.length;
  }
  if (total > cfg.maxMessageChars) return `訊息總長度 ${total} 超過上限 ${cfg.maxMessageChars}`;
  if (temperature !== undefined && !(typeof temperature === 'number' && temperature >= 0 && temperature <= 2)) return 'temperature 範圍 0～2';
  if (mct !== undefined && !(Number.isInteger(mct) && mct > 0 && mct <= 32768)) return 'max_completion_tokens 範圍 1～32768';
  return null;
}

export function createApp({ config = loadConfig(), fetchImpl = globalThis.fetch, logger = console, distDir } = {}) {
  const app = express();
  app.disable('x-powered-by');
  app.set('trust proxy', false);

  // 安全標頭
  app.use((req, res, next) => {
    res.set('X-Content-Type-Options', 'nosniff');
    res.set('Referrer-Policy', 'no-referrer');
    res.set('X-Frame-Options', 'DENY');
    next();
  });

  // 只記錄方法、路徑、狀態，不記錄標頭與內容（避免金鑰入日誌）
  app.use((req, res, next) => {
    const t = Date.now();
    res.on('finish', () => {
      if (req.path.startsWith('/api/')) logger.log(`[api] ${req.method} ${req.path} ${res.statusCode} ${Date.now() - t}ms`);
    });
    next();
  });

  // 來源限制
  app.use('/api', (req, res, next) => {
    const origin = req.get('origin');
    if (origin && !config.allowedOrigins.includes(origin)) return res.status(403).json({ error: { message: '來源不被允許' } });
    next();
  });

  app.use('/api', express.json({ limit: config.maxBodyBytes }));
  app.use('/api', (err, req, res, next) => {
    if (err?.type === 'entity.too.large') return res.status(413).json({ error: { message: '請求資料過大' } });
    if (err) return res.status(400).json({ error: { message: 'JSON 格式錯誤' } });
    next();
  });

  app.get('/api/health', (req, res) => {
    res.json({ ok: true, serverKeyConfigured: Boolean(config.serverKey), allowClientKey: config.allowClientKey, mode: config.isProd ? 'production' : 'development' });
  });

  const limiter = rateLimiter(config.rateLimitPerMin);

  function resolveKey(req) {
    const clientKey = req.get('x-groq-key');
    if (clientKey && config.allowClientKey) {
      if (!KEY_RE.test(clientKey)) return { error: 'API Key 格式不正確' };
      return { key: clientKey };
    }
    if (config.serverKey) return { key: config.serverKey };
    return { error: config.allowClientKey ? '尚未提供 API Key' : '伺服器未設定 GROQ_API_KEY，且不允許前端自帶金鑰' };
  }

  async function forward(req, res, method, endpoint, body) {
    const k = resolveKey(req);
    if (k.error) return res.status(401).json({ error: { message: k.error } });
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(new Error('timeout')), config.upstreamTimeoutMs);
    let clientGone = false;
    res.on('close', () => {
      if (!res.writableFinished) {
        clientGone = true;
        ctrl.abort(new Error('client closed'));
      }
    });
    try {
      const upstream = await fetchImpl(`${GROQ_BASE}${endpoint}`, {
        method,
        headers: { Authorization: `Bearer ${k.key}`, 'Content-Type': 'application/json' },
        body: body ? JSON.stringify(body) : undefined,
        signal: ctrl.signal,
      });
      const ra = upstream.headers.get('retry-after');
      if (ra) res.set('Retry-After', ra);
      const text = await upstream.text();
      let json;
      try {
        json = JSON.parse(text);
      } catch {
        json = null;
      }
      if (!upstream.ok) {
        const msg = scrub(json?.error?.message || text || `上游錯誤 ${upstream.status}`);
        return res.status(upstream.status).json({ error: { message: msg, upstreamStatus: upstream.status } });
      }
      if (!json) return res.status(502).json({ error: { message: '上游回應不是有效 JSON' } });
      return res.status(200).json(json);
    } catch (e) {
      if (clientGone) return undefined;
      if (ctrl.signal.aborted) return res.status(504).json({ error: { message: `上游逾時（${config.upstreamTimeoutMs / 1000} 秒）` } });
      return res.status(502).json({ error: { message: `無法連線至 Groq：${scrub(e?.message)}` } });
    } finally {
      clearTimeout(timer);
    }
  }

  app.post('/api/groq/models', limiter, (req, res) => forward(req, res, 'GET', '/models'));

  app.post('/api/groq/chat', limiter, (req, res) => {
    const err = validateChatBody(req.body, config);
    if (err) return res.status(400).json({ error: { message: err } });
    const { model, messages, temperature = 0.3, max_completion_tokens: mct } = req.body;
    const body = { model, messages: messages.map(({ role, content }) => ({ role, content })), temperature, stream: false };
    if (mct) body.max_completion_tokens = mct;
    return forward(req, res, 'POST', '/chat/completions', body);
  });

  app.use('/api', (req, res) => res.status(404).json({ error: { message: '找不到 API 路徑' } }));

  // 正式模式：提供建置後靜態檔
  if (distDir && fs.existsSync(distDir)) {
    app.use((req, res, next) => {
      res.set(
        'Content-Security-Policy',
        "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; connect-src 'self'; worker-src 'self' blob:; font-src 'self' data:; object-src 'none'; base-uri 'self'; frame-ancestors 'none'",
      );
      next();
    });
    app.use(express.static(distDir, { index: 'index.html', maxAge: '1h' }));
    app.get('*', (req, res) => res.sendFile(path.join(distDir, 'index.html')));
  }
  return app;
}
