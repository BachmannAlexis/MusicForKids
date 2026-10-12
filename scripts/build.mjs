// Builds the public site into _site/: one minified JavaScript file instead of
// ~35 modules, minified CSS, and the offline cache (sw.js) stamped with a version.
import { execFileSync } from 'node:child_process';
import { cpSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';

const out = '_site';
const version = (process.env.GITHUB_SHA ?? Date.now().toString(36)).slice(0, 10);
const esbuild = (...args) => execFileSync('npx', ['--yes', 'esbuild@0.24.0', ...args], { stdio: 'inherit' });

rmSync(out, { recursive: true, force: true });
mkdirSync(out);
esbuild('js/app.js', '--bundle', '--minify', '--format=esm', '--target=es2020', '--define:__OFFLINE__=true', `--outfile=${out}/js/app.js`);
esbuild('css/styles.css', '--minify', `--outfile=${out}/css/styles.css`);
cpSync('index.html', `${out}/index.html`);
cpSync('manifest.webmanifest', `${out}/manifest.webmanifest`);
cpSync('icons', `${out}/icons`, { recursive: true });
writeFileSync(`${out}/sw.js`, readFileSync('sw.js', 'utf8').replace('__VERSION__', version));
console.log(`Built ${out}/ (version ${version})`);
