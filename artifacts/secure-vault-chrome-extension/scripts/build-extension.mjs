import { execFileSync } from 'node:child_process';
import { cpSync, existsSync, mkdirSync, rmSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const distRoot = resolve(projectRoot, 'dist/public');
const packageRoot = resolve(projectRoot, 'release-package');
const viteBin = resolve(projectRoot, 'node_modules/.bin/vite');

rmSync(distRoot, { recursive: true, force: true });
execFileSync(viteBin, ['build', '--config', 'vite.config.ts'], {
  cwd: projectRoot,
  stdio: 'inherit',
});

execFileSync(viteBin, ['build', '--config', 'vite.config.ts'], {
  cwd: projectRoot,
  env: { ...process.env, BUILD_TARGET: 'content-script' },
  stdio: 'inherit',
});

const manifestPath = resolve(distRoot, 'manifest.json');
if (!existsSync(manifestPath)) {
  throw new Error('Manifest was not copied into the extension build.');
}

mkdirSync(packageRoot, { recursive: true });
const archivePath = resolve(packageRoot, 'secure-vault-chrome-extension-1.0.0.zip');
rmSync(archivePath, { force: true });
execFileSync('zip', ['-X', '-r', archivePath, '.'], {
  cwd: distRoot,
  stdio: 'inherit',
});

console.log(`Extension package ready: ${archivePath}`);