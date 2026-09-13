import { cpSync, existsSync } from 'node:fs';
import { spawn } from 'node:child_process';
import path from 'node:path';

const appRoot = process.cwd();
const standaloneRoot = path.join(appRoot, '.next', 'standalone', 'apps', 'web');
const serverFile = path.join(standaloneRoot, 'server.js');

if (!existsSync(serverFile)) {
  throw new Error('Standalone build is missing. Run `pnpm build` before starting it.');
}

const copyIfPresent = (source, destination) => {
  if (existsSync(source)) {
    cpSync(source, destination, { recursive: true, force: true });
  }
};

copyIfPresent(path.join(appRoot, 'public'), path.join(standaloneRoot, 'public'));
copyIfPresent(
  path.join(appRoot, '.next', 'static'),
  path.join(standaloneRoot, '.next', 'static'),
);

const child = spawn(process.execPath, [serverFile], {
  cwd: standaloneRoot,
  env: {
    ...process.env,
    PORT: process.env.PORT || process.env.PLAYWRIGHT_PORT || '3000',
  },
  stdio: 'inherit',
});

for (const signal of ['SIGINT', 'SIGTERM']) {
  process.on(signal, () => child.kill(signal));
}

child.on('exit', (code, signal) => {
  if (signal) process.kill(process.pid, signal);
  process.exit(code ?? 1);
});
