// Skleja moduły z src/ w jeden zwykły skrypt dist/snake-brawl.js.
// Dzięki temu gra działa też po dwukliku w index.html (file://), gdzie przeglądarki
// blokują ES modules. Bez zależności: obsługuje tylko formy importu/eksportu,
// których używamy w projekcie, a na każdą inną rzuca błąd.
//
//   npm run build

import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join, posix, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ROOT = resolve(fileURLToPath(new URL('..', import.meta.url)));
const ENTRY = 'src/main.js';
export const OUT = 'dist/snake-brawl.js';

const IMPORT_RE = /^import\s+([\s\S]*?)\s+from\s+['"](.+?)['"];?[ \t]*$/gm;
const EXPORT_DECL_RE = /^export\s+(function|class|const|let)\s+([A-Za-z_$][\w$]*)/gm;
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
}
