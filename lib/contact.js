const TO = 'caleb@wiemansystems.com';
const FROM = 'Wieman Systems <noreply@wiemansystems.com>';
const ORIGINS = ['https://calebwieman.com', 'https://www.calebwieman.com'];
const PREVIEW_ORIGIN = /^https:\/\/personal-brand-[a-z0-9-]+-wieman-systems\.vercel\.app$/;

function createContactHandler({ checkBotId, fetchEmail = fetch, getApiKey = () => process.env.RESEND_API_KEY }) {
  return async function contact(req, res) {
    res.setHeader('Cache-Control', 'no-store');
    res.setHeader('Allow', 'POST');
    if (req.method !== 'POST') return res.status(405).json({ ok: false, error: 'Method not allowed' });

    // Browser CSRF guard only. BotID and the deployed WAF rule protect automation.
    const origin = req.headers.origin;
    if (typeof origin !== 'string' || !(ORIGINS.includes(origin) || PREVIEW_ORIGIN.test(origin))) {
      return res.status(403).json({ ok: false, code: 'origin', error: 'Forbidden' });
    }
    if (!/^application\/json(?:\s*;|$)/i.test(req.headers['content-type'] || '')) {
      return res.status(415).json({ ok: false, error: 'Expected JSON' });
    }
    let body = req.body;
    if (typeof body === 'string') {
      if (Buffer.byteLength(body) > 16384) return res.status(413).json({ ok: false, error: 'Message too large' });
      try { body = JSON.parse(body); } catch { body = null; }
    }
    if (!body || typeof body !== 'object' || Array.isArray(body)) {
      return res.status(400).json({ ok: false, error: 'Invalid input' });
    }
    if (Buffer.byteLength(JSON.stringify(body)) > 16384) {
      return res.status(413).json({ ok: false, error: 'Message too large' });
    }
    const value = (key) => typeof body[key] === 'string' ? body[key].trim() : '';
    const name = value('name'), email = value('email'), message = value('message');
    const fields = [];
    if (!name || name.length > 100 || /[\r\n]/.test(name)) fields.push('name');
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 200) fields.push('email');
    if (!message || message.length > 5000) fields.push('message');
    if (fields.length) return res.status(400).json({ ok: false, error: 'Invalid input', fields });

    let verification;
    try {
      verification = await checkBotId({
        // Never accept the SDK's automatic local-development bypass.
        developmentOptions: { isDevelopment: false },
        advancedOptions: { checkLevel: 'basic', headers: req.headers }
      });
    } catch {
      console.error('contact: bot verification unavailable');
      return res.status(503).json({ ok: false, code: 'verification_unavailable', error: 'Verification unavailable' });
    }
    if (verification?.isHuman !== true || verification?.isBot !== false ||
        verification?.isVerifiedBot !== false || verification?.bypassed !== false) {
      return res.status(403).json({ ok: false, code: 'verification_failed', error: 'Browser verification failed' });
    }

    // Discard only after verification: honeypots never bypass the bot gate.
    if (body.company) return res.status(200).json({ ok: true });

    const apiKey = getApiKey();
    if (!apiKey) return res.status(503).json({ ok: false, error: 'Contact service unavailable' });
    try {
      const result = await fetchEmail('https://api.resend.com/emails', {
        method: 'POST',
        signal: AbortSignal.timeout(10000),
        headers: { Authorization: 'Bearer ' + apiKey, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          from: FROM, to: [TO], reply_to: email,
          subject: 'calebwieman.com — message from ' + name,
          text: 'New message from calebwieman.com\n\nName:  ' + name + '\nEmail: ' + email + '\n\n' + message + '\n'
        })
      });
      if (!result.ok) {
        console.error('contact: email provider rejected request', result.status);
        return res.status(502).json({ ok: false, error: 'Could not send message' });
      }
      return res.status(200).json({ ok: true });
    } catch {
      console.error('contact: email provider unavailable');
      return res.status(502).json({ ok: false, error: 'Could not confirm delivery' });
    }
  };
}
module.exports = { createContactHandler };
