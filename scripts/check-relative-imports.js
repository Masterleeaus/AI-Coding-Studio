import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { dirname, extname, resolve } from 'node:path';

const roots = ['src', 'scripts'];
const sourceExtensions = new Set(['.js', '.mjs', '.svelte']);
const importPatterns = [
  /\b(?:import|export)\s+(?:[^'"()]*?\s+from\s+)?["']([^"']+)["']/g,
  /\bimport\(\s*["']([^"']+)["']\s*\)/g,
];

function walk(path, output = []) {
  if (!existsSync(path)) return output;
  for (const name of readdirSync(path)) {
    const child = resolve(path, name);
    const stat = statSync(child);
    if (stat.isDirectory()) walk(child, output);
    else if (sourceExtensions.has(extname(child))) output.push(child);
  }
  return output;
}

function resolveImport(importer, specifier) {
  const absolute = resolve(dirname(importer), specifier);
  const candidates = [
    absolute,
    `${absolute}.js`,
    `${absolute}.mjs`,
    `${absolute}.svelte`,
    resolve(absolute, 'index.js'),
    resolve(absolute, 'index.mjs'),
  ];
  return candidates.find(existsSync) || null;
}

const failures = [];
for (const file of roots.flatMap((root) => walk(root))) {
  const text = readFileSync(file, 'utf8');
  for (const pattern of importPatterns) {
    pattern.lastIndex = 0;
    let match;
    while ((match = pattern.exec(text))) {
      const specifier = match[1];
      if (!specifier.startsWith('.')) continue;
      if (!resolveImport(file, specifier)) {
        failures.push(`${file}: unresolved relative import ${specifier}`);
      }
    }
  }
}

if (failures.length) {
  console.error(failures.map((failure) => `- ${failure}`).join('\n'));
  process.exit(1);
}

console.log('Relative import checks passed.');
