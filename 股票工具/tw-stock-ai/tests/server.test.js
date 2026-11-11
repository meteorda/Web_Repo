import { describe, it, expect, vi } from 'vitest';
import request from 'supertest';
import { createApp, loadConfig, scrub, GROQ_BASE } from '../server/app.js';

const silent = { log: () => {} };
const cfg = (over = {}) => ({ ...loadConfig({}), ...over });

function upstream(status, body, headers = {}) {
  return new Response(typeof body === 'string' ? body : JSON.stringify(body), { status, headers });
}

describe('Groq 代理', () => {
  it('health 不洩漏金鑰', async () => {
    const app = createApp({ config: cfg({ serverKey: 'gsk_abcdefghijklmnop' }), logger: silent });
    const r = await request(app).get('/api/health');
    expect(r.body.serverKeyConfigured).toBe(true);
    expect(JSON.stringify(r.body)).not.toContain('gsk_');
  });
  it('只呼叫固定 Groq 端點並以 Bearer 認證', async () => {
    const fetchImpl = vi.fn(async () => upstream(200, { data: [{ id: 'm1' }] }));
    const app = createApp({ config: cfg(), fetchImpl, logger: silent });
    const r = await request(app).post('/api/groq/models').set('X-Groq-Key', 'gsk_testkey1234567890').send({ url: 'https://evil.example' });
    expect(r.status).toBe(200);
    expect(fetchImpl.mock.calls[0][0]).toBe(`${GROQ_BASE}/models`);
    expect(fetchImpl.mock.calls[0][1].headers.Authorization).toBe('Bearer gsk_testkey1234567890');
  });
  it('無金鑰回 401', async () => {
    const app = createApp({ config: cfg(), fetchImpl: vi.fn(), logger: silent });
    const r = await request(app).post('/api/groq/models');
    expect(r.status).toBe(401);
  });
  it('正式模式預設不接受前端金鑰', async () => {
    const c = loadConfig({ NODE_ENV: 'production' });
    expect(c.allowClientKey).toBe(false);
    const fetchImpl = vi.fn();
    const app = createApp({ config: c, fetchImpl, logger: silent });
    const r = await request(app).post('/api/groq/models').set('X-Groq-Key', 'gsk_testkey1234567890');
    expect(r.status).toBe(401);
    expect(fetchImpl).not.toHaveBeenCalled();
  });
  it('輸入驗證', async () => {
    const app = createApp({ config: cfg(), fetchImpl: vi.fn(), logger: silent });
    const bad = await request(app).post('/api/groq/chat').set('X-Groq-Key', 'gsk_testkey1234567890').send({ model: 'm', messages: [{ role: 'assistant', content: 'x' }] });
    expect(bad.status).toBe(400);
    const big = await request(app)
      .post('/api/groq/chat')
      .set('X-Groq-Key', 'gsk_testkey1234567890')
      .send({ model: 'm', messages: [{ role: 'user', content: 'x'.repeat(31000) }] });
    expect(big.status).toBe(400);
  });
  it('轉送 429 與 Retry-After，錯誤訊息遮蔽金鑰', async () => {
    const fetchImpl = vi.fn(async () => upstream(429, { error: { message: 'limit for gsk_abcdefghijklmnopqrst' } }, { 'retry-after': '7' }));
    const app = createApp({ config: cfg(), fetchImpl, logger: silent });
    const r = await request(app).post('/api/groq/chat').set('X-Groq-Key', 'gsk_testkey1234567890').send({ model: 'm', messages: [{ role: 'user', content: 'hi' }] });
    expect(r.status).toBe(429);
    expect(r.headers['retry-after']).toBe('7');
    expect(r.body.error.message).not.toMatch(/gsk_abcdef/);
  });
  it('上游逾時回 504', async () => {
    const fetchImpl = vi.fn((url, { signal }) => new Promise((_, rej) => signal.addEventListener('abort', () => rej(new Error('aborted')))));
    const app = createApp({ config: cfg({ upstreamTimeoutMs: 50 }), fetchImpl, logger: silent });
    const r = await request(app).post('/api/groq/chat').set('X-Groq-Key', 'gsk_testkey1234567890').send({ model: 'm', messages: [{ role: 'user', content: 'hi' }] });
    expect(r.status).toBe(504);
  });
  it('拒絕不允許的來源', async () => {
    const app = createApp({ config: cfg(), fetchImpl: vi.fn(), logger: silent });
    const r = await request(app).get('/api/health').set('Origin', 'https://evil.example');
    expect(r.status).toBe(403);
  });
  it('日誌不含金鑰', async () => {
    const logs = [];
    const fetchImpl = vi.fn(async () => upstream(200, { data: [] }));
    const app = createApp({ config: cfg(), fetchImpl, logger: { log: (s) => logs.push(s) } });
    await request(app).post('/api/groq/models').set('X-Groq-Key', 'gsk_testkey1234567890');
    expect(logs.join('\n')).not.toContain('gsk_');
  });
  it('scrub', () => {
    expect(scrub('Bearer abc.def gsk_1234567890abc')).toBe('Bearer *** gsk_***');
  });
});
