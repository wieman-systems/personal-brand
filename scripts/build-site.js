const { cpSync, mkdirSync, rmSync } = require('node:fs');
const { buildSync } = require('esbuild');
const { resolve } = require('node:path');

const root = resolve(__dirname, '..');
const out = resolve(root, 'dist');
rmSync(out, { recursive: true, force: true });
mkdirSync(out, { recursive: true });
// Explicit public assets only: never publish server code, tests, or dependencies.
for (const name of ['index.html', 'work.html', 'privacy.html', 'terms.html',
  'robots.txt', 'sitemap.xml', '.well-known', 'assets', 'css', 'js']) {
  cpSync(resolve(root, name), resolve(out, name), { recursive: true });
}
buildSync({
  entryPoints: [resolve(root, 'client/bot-protection.js')],
  bundle: true,
  minify: true,
  platform: 'browser',
  target: ['safari16', 'chrome110', 'firefox115'],
  outfile: resolve(out, 'js/bot-protection.js')
});
