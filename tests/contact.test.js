const test = require('node:test');
const assert = require('node:assert/strict');
const { createContactHandler } = require('../lib/contact');
const human = { isHuman: true, isBot: false, isVerifiedBot: false, bypassed: false };

async function invoke({ method = 'POST', origin = 'https://www.calebwieman.com', body,
  verification = human, botError, mailError, mailStatus = 200, key = 'test-only', contentType = 'application/json' } = {}) {
  let verified = 0, sent = 0, email, botOptions;
  const handler = createContactHandler({
    checkBotId: async (options) => { verified++; botOptions = options; if (botError) throw new Error('unavailable'); return verification; },
    fetchEmail: async (url, options) => { sent++; email = JSON.parse(options.body); if (mailError) throw new Error('timeout'); return { ok: mailStatus === 200, status: mailStatus }; },
    getApiKey: () => key
  });
  const headers = {};
  const response = { setHeader(k, v) { headers[k] = v; }, status(n) { this.statusCode = n; return this; }, json(data) { this.body = data; return this; } };
  await handler({ method, headers: { origin, 'content-type': contentType, 'x-is-human': 'untrusted-input' }, body: body === undefined ? { name: 'QA', email: 'qa@example.com', message: 'Test', company: '' } : body }, response);
  return { ...response, verified, sent, email, botOptions, headers };
}

test('verified human sends once to the fixed inbox', async () => {
  const r = await invoke(); assert.equal(r.statusCode, 200); assert.equal(r.sent, 1);
  assert.deepEqual(r.email.to, ['caleb@wiemansystems.com']);
  assert.equal(r.botOptions.advancedOptions.checkLevel, 'basic');
  assert.equal(r.botOptions.developmentOptions.isDevelopment, false);
  assert.equal(r.headers['Cache-Control'], 'no-store');
});
for (const [label, verification] of [
  ['bot', { ...human, isHuman: false, isBot: true }],
  ['verified crawler', { ...human, isVerifiedBot: true }],
  ['bypass', { ...human, bypassed: true }],
  ['malformed result', {}], ['missing result', null]
]) test(`${label} cannot send even with a spoofed allowed Origin`, async () => {
  const r = await invoke({ verification }); assert.equal(r.statusCode, 403); assert.equal(r.sent, 0);
});
test('verification outage fails closed', async () => {
  const r = await invoke({ botError: true }); assert.equal(r.statusCode, 503); assert.equal(r.sent, 0);
});
for (const origin of ['', 'https://attacker.example', 'https://personal-brand-evil.vercel.app', 'https://www.calebwieman.com.attacker.example']) {
  test(`reject origin ${origin || '(missing)'}`, async () => {
    const r = await invoke({ origin }); assert.equal(r.statusCode, 403); assert.equal(r.verified, 0); assert.equal(r.sent, 0);
  });
}
test('GET cannot send', async () => { const r = await invoke({ method: 'GET' }); assert.equal(r.statusCode, 405); assert.equal(r.sent, 0); });
test('honeypot silently discards', async () => { const r = await invoke({ body: { name: 'QA', email: 'qa@example.com', message: 'Test', company: 'spam' } }); assert.equal(r.statusCode, 200); assert.equal(r.verified, 1); assert.equal(r.sent, 0); });
for (const body of [null, [], {}, '{bad json', { name: {}, email: 'x', message: [] }, { name: 'QA\nInjected', email: 'qa@example.com', message: 'test' }]) {
  test(`invalid input does not call external services: ${JSON.stringify(body)}`, async () => {
    const r = await invoke({ body }); assert.equal(r.statusCode, 400); assert.equal(r.verified, 0); assert.equal(r.sent, 0);
  });
}
test('reject non-JSON content', async () => { const r = await invoke({ contentType: 'text/plain' }); assert.equal(r.statusCode, 415); assert.equal(r.sent, 0); });
test('reject excessive body', async () => { const r = await invoke({ body: { message: 'x'.repeat(17000) } }); assert.equal(r.statusCode, 413); assert.equal(r.sent, 0); });
test('missing email config fails closed', async () => { const r = await invoke({ key: '' }); assert.equal(r.statusCode, 503); assert.equal(r.sent, 0); });
test('provider error is not reported as success or retried', async () => { const r = await invoke({ mailStatus: 429 }); assert.equal(r.statusCode, 502); assert.equal(r.sent, 1); });
test('uncertain delivery is not automatically retried', async () => { const r = await invoke({ mailError: true }); assert.equal(r.statusCode, 502); assert.equal(r.sent, 1); });

test('honeypot cannot bypass bot verification', async () => { const r = await invoke({ body: { name: 'QA', email: 'qa@example.com', message: 'Test', company: 'spam' }, verification: { ...human, isBot: true } }); assert.equal(r.statusCode, 403); assert.equal(r.sent, 0); });
