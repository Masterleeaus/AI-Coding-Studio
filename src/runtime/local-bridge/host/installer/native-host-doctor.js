import { lstat, readFile } from 'node:fs/promises';
import { isDeepStrictEqual } from 'node:util';
import { loadHostConfig } from '../host-config.js';

function finding(id, status, message) {
  return Object.freeze({ id, status, message });
}

async function inspectFile(fs, path) {
  try {
    const info = await fs.lstat(path);
    if (info.isSymbolicLink?.() || !info.isFile?.()) {
      return { ok: false, reason: 'not a regular file', info };
    }
    return { ok: true, info };
  } catch {
    return { ok: false, reason: 'missing' };
  }
}

export async function inspectNativeHostInstallation(options = {}) {
  const plan = options.plan;
  const fs = options.fs || { lstat, readFile };
  const registry = options.registry || null;
  if (!plan || plan.version !== 1 || plan.operation === 'uninstall') {
    throw new TypeError('A registration plan is required.');
  }
  const findings = [];

  const executable = await inspectFile(fs, plan.hostPath);
  findings.push(finding(
    'host.executable',
    executable.ok ? 'pass' : 'fail',
    executable.ok
      ? 'Host executable exists.'
      : `Host executable ${executable.reason}.`,
  ));
  if (
    executable.ok
    && plan.platform !== 'win32'
    && (executable.info.mode & 0o111) === 0
  ) {
    findings.push(finding(
      'host.executable_mode',
      'fail',
      'Host executable is not marked executable.',
    ));
  }

  const manifestFile = await inspectFile(fs, plan.manifestPath);
  if (!manifestFile.ok) {
    findings.push(finding(
      'manifest.file',
      'fail',
      `Native manifest ${manifestFile.reason}.`,
    ));
  } else {
    findings.push(finding('manifest.file', 'pass', 'Native manifest exists.'));
    try {
      const parsed = JSON.parse(await fs.readFile(plan.manifestPath, 'utf8'));
      const matches = isDeepStrictEqual(parsed, plan.manifest);
      findings.push(finding(
        'manifest.content',
        matches ? 'pass' : 'fail',
        matches
          ? 'Native manifest matches the plan.'
          : 'Native manifest differs from the plan.',
      ));
    } catch {
      findings.push(finding(
        'manifest.content',
        'fail',
        'Native manifest is invalid JSON.',
      ));
    }
  }

  if (options.configPath) {
    const configFile = await inspectFile(fs, options.configPath);
    if (!configFile.ok) {
      findings.push(finding(
        'config.file',
        'fail',
        `Host configuration ${configFile.reason}.`,
      ));
    } else {
      const configLoader = options.loadConfig || loadHostConfig;
      try {
        const config = await configLoader(options.configPath);
        findings.push(finding(
          'config.file',
          'pass',
          'Host configuration is valid.',
        ));
        const allowlist = await inspectFile(fs, config.repositoryAllowlistFile);
        findings.push(finding(
          'repository.allowlist',
          allowlist.ok ? 'pass' : 'fail',
          allowlist.ok
            ? 'Repository allowlist exists.'
            : `Repository allowlist ${allowlist.reason}.`,
        ));
      } catch {
        findings.push(finding(
          'config.file',
          'fail',
          'Host configuration is invalid.',
        ));
      }
    }
  } else {
    findings.push(finding(
      'config.file',
      'warning',
      'Host configuration was not checked.',
    ));
  }

  const registryAction = plan.actions.find(
    (action) => action.type === 'registry-set',
  );
  if (registryAction) {
    if (!registry || typeof registry.get !== 'function') {
      findings.push(finding(
        'registry.value',
        'warning',
        'Windows registry was not checked.',
      ));
    } else {
      const value = await registry.get(registryAction);
      const matches = value === registryAction.value;
      findings.push(finding(
        'registry.value',
        matches ? 'pass' : 'fail',
        matches
          ? 'Registry value matches the plan.'
          : 'Registry value is missing or mismatched.',
      ));
    }
  }

  const counts = Object.freeze({
    pass: findings.filter((entry) => entry.status === 'pass').length,
    warning: findings.filter((entry) => entry.status === 'warning').length,
    fail: findings.filter((entry) => entry.status === 'fail').length,
  });
  return Object.freeze({
    ok: counts.fail === 0,
    counts,
    findings: Object.freeze(findings),
  });
}
