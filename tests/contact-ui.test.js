const test = require('node:test');
const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const vm = require('node:vm');
const main = readFileSync(require.resolve('../js/main.js'), 'utf8');
const contactSection = main.slice(main.indexOf('  (function () {', main.indexOf('CONTACT FORM —')), main.indexOf('  /* ====================================================================\n     BOOK A CALL'));

async function submit({ status = 200, data = { ok: true }, mitigated = null, ready = true } = {}) {
  let requests = 0, reset = false, submit;
  const classes = { add() {}, remove() {} };
  const label = { textContent: 'Send message' };
  const button = { disabled: false, querySelector: () => label };
  const statusEl = { textContent: '', classList: classes };
  const form = { elements: Object.fromEntries(Object.entries({ name: 'QA', email: 'qa@example.com', message: 'Keep my draft', company: '' }).map(([k, value]) => [k, { value }])),
    classList: classes, querySelector: () => button, checkValidity: () => true,
    addEventListener: (_, handler) => { submit = handler; }, reset: () => { reset = true; }
  };
  vm.runInNewContext(contactSection, {
    doc: { getElementById: (id) => id === 'contactForm' ? form : statusEl },
    window: { wiemanBotProtectionReady: ready },
    fetch: async () => { requests++; return { ok: status >= 200 && status < 300, status, headers: { get: () => mitigated }, json: async () => data }; }
  });
  submit({ preventDefault() {} });
  await new Promise(setImmediate);
  return { message: statusEl.textContent, requests, reset, disabled: button.disabled, label: label.textContent };
}
test('Vercel WAF 403 shows wait guidance and preserves the draft', async () => {
  const r = await submit({ status: 403, mitigated: 'deny', data: { error: { code: '403' } } });
  assert.match(r.message, /wait ten minutes/); assert.equal(r.reset, false); assert.equal(r.disabled, false);
});
test('429 also shows wait guidance', async () => { assert.match((await submit({ status: 429, data: {} })).message, /wait ten minutes/); });
test('BotID rejection shows verification guidance', async () => { const r = await submit({ status: 403, data: { code: 'verification_failed' } }); assert.match(r.message, /Browser verification failed/); assert.equal(r.reset, false); });
test('unavailable protection offers direct email', async () => { const r = await submit({ status: 503, data: {} }); assert.match(r.message, /temporarily unavailable/); assert.match(r.message, /caleb@wiemansystems.com/); assert.equal(r.reset, false); });
test('missing browser protection never submits', async () => { const r = await submit({ ready: false }); assert.equal(r.requests, 0); assert.match(r.message, /verification didn't load/); });
test('successful response clears form and restores submit button', async () => { const r = await submit(); assert.equal(r.reset, true); assert.equal(r.disabled, false); assert.equal(r.label, 'Send message'); assert.match(r.message, /Message sent/); });
