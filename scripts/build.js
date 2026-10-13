// Skleja moduły z src/ w jeden zwykły skrypt dist/snake-brawl.js.
// Dzięki temu gra działa też po dwukliku w index.html (file://), gdzie przeglądarki
// blokują ES modules. Bez zależności: obsługuje tylko formy importu/eksportu,
// których używamy w projekcie, a na każdą inną rzuca błąd.
//
//   npm run build
//   node scripts/build.js --site   dodatkowo folder site/ z plikami gry (wystawienie na Cloudflare)

import { copyFileSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join, posix, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ROOT = resolve(fileURLToPath(new URL('..', import.meta.url)));
const ENTRY = 'src/main.js';
export const OUT = 'dist/snake-brawl.js';
/** Pliki gry potrzebne w przeglądarce (reszta repo nie trafia do internetu). */
export const SITE_FILES = ['index.html', 'pokoje.html', 'style.css', OUT];
export const SITE_DIR = 'site';

const IMPORT_RE = /^import\s+([\s\S]*?)\s+from\s+['"](.+?)['"];?[ \t]*$/gm;
const EXPORT_DECL_RE = /^export\s+(async\s+function|function|class|const|let)\s+([A-Za-z_$][\w$]*)/gm;
const EXPORT_EMPTY_RE = /^export\s*\{\s*\};?[ \t]*$/gm;

function transform(id, source) {
  const deps = [];
  let code = source.replace(IMPORT_RE, (_, clause, spec) => {
    if (!clause.startsWith('{')) throw new Error(`${id}: obsługiwane są tylko importy nazwane`);
    const dep = posix.normalize(posix.join(posix.dirname(id), spec));
    deps.push(dep);
    const names = clause.replace(/\s+as\s+/g, ': ');
    return `const ${names} = __require(${JSON.stringify(dep)});`;
  });

  const exported = [];
  code = code.replace(EXPORT_DECL_RE, (_, kind, name) => {
    exported.push(name);
    return `${kind} ${name}`;
  });
  code = code.replace(EXPORT_EMPTY_RE, '');
  if (/^export\b/m.test(code)) throw new Error(`${id}: nieobsługiwana forma eksportu`);

  if (exported.length) code += `\nObject.assign(__exports, { ${exported.join(', ')} });\n`;
  return { code, deps };
}

/** Zwraca treść sklejonego skryptu. */
export function bundle() {
  const modules = new Map();
  const visit = (id) => {
    if (modules.has(id)) return;
    const source = readFileSync(join(ROOT, id), 'utf8').replace(/\r\n/g, '\n');
    const mod = transform(id, source);
    modules.set(id, mod);
    mod.deps.forEach(visit);
  };
  visit(ENTRY);

  const parts = [
    '// WYGENEROWANE przez scripts/build.js z plików w src/. Nie edytuj ręcznie: `npm run build`.',
    '(function () {',
    "'use strict';",
    'const __factories = {};',
    'const __cache = {};',
    'function __require(id) {',
    '  if (__cache[id]) return __cache[id];',
    '  const exports = (__cache[id] = {});',
    '  __factories[id](exports);',
    '  return exports;',
    '}',
  ];
  for (const [id, { code }] of modules) {
    parts.push('', `// ---- ${id} ----`, `__factories[${JSON.stringify(id)}] = function (__exports) {`, code.trimEnd(), '};');
  }
  parts.push('', `__require(${JSON.stringify(ENTRY)});`, '})();', '');
  return parts.join('\n');
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  const out = join(ROOT, OUT);
  mkdirSync(dirname(out), { recursive: true });
  writeFileSync(out, bundle());
  console.log(`Zapisano ${OUT}`);

  if (process.argv.includes('--site')) {
    const site = join(ROOT, SITE_DIR);
    rmSync(site, { recursive: true, force: true });
    for (const file of SITE_FILES) {
      mkdirSync(dirname(join(site, file)), { recursive: true });
      copyFileSync(join(ROOT, file), join(site, file));
    }
    console.log(`Zapisano ${SITE_DIR}/ (${SITE_FILES.join(', ')})`);
  }
}
