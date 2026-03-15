const { spawn } = require('child_process');
const path = require('path');

const basePath = path.join(__dirname, 'ai-agent');
const srcEntry = path.join(basePath, 'src/index.ts');
const testFile = path.join(basePath, 'test-cases/approved/send-invite-email.md');

const agentEnv = { ...process.env, BROWSER_HEADLESS: 'true' };

console.log('Spawning:', 'npx', ['--yes', 'ts-node', '--transpile-only', srcEntry, testFile].join(' '));

const useShell = process.platform === 'win32';

const p = spawn('npx', ['--yes', 'ts-node', '--transpile-only', srcEntry, testFile], {
  cwd: basePath,
  env: agentEnv,
  shell: useShell
});

p.stdout.on('data', d => console.log('STDOUT:', d.toString()));
p.stderr.on('data', d => console.log('STDERR:', d.toString()));
p.on('error', e => console.log('ERROR:', e));
p.on('close', code => console.log('EXIT:', code));
