import { existsSync, readFileSync } from 'node:fs';

const failures = [];
const mustNotExist = [
  'src/core/ModuleManager.js',
  'src/core/bootstrap.js',
  'src/core/bootstrap-enhanced.js',
  'src/modules/features/TerminalRuntimeModule.js',
  'src/modules/features/ToolRuntimeModule.js',
];
for (const path of mustNotExist) {
  if (existsSync(path)) failures.push(`Disconnected modular runtime remains: ${path}`);
}

const contentEntry = readFileSync('src/content/index.js', 'utf8');
if (!contentEntry.includes('initRuntimeKernel')) {
  failures.push('src/content/index.js does not initialize the Runtime Kernel');
}

const catalog = readFileSync('src/runtime/local-bridge/command-catalog.js', 'utf8');
if (catalog.includes("['shell.exec'")) {
  failures.push('Local Bridge catalog exposes unrestricted shell execution');
}

const packageJson = JSON.parse(readFileSync('package.json', 'utf8'));
const manifest = JSON.parse(readFileSync('static/manifest.json', 'utf8'));
const multiManifest = JSON.parse(readFileSync('manifest-multiplatform.json', 'utf8'));
if (packageJson.version !== manifest.version || manifest.version !== multiManifest.version) {
  failures.push(`Version drift: package=${packageJson.version}, manifest=${manifest.version}, multiplatform=${multiManifest.version}`);
}

if (failures.length) {
  console.error(failures.map((failure) => `- ${failure}`).join('\n'));
  process.exit(1);
}

console.log('Runtime architecture checks passed.');
