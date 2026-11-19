// An isolated real API for Playwright. Never touches the developer's database or uploads.
const { spawn } = require('node:child_process');
const { mkdtempSync } = require('node:fs');
const { tmpdir } = require('node:os');
const path = require('node:path');

const directory = mkdtempSync(path.join(tmpdir(), 'boilerfound-e2e-'));
const backend = path.resolve(__dirname, '../../backend');
const python = process.env.BOILERFOUND_TEST_PYTHON || path.join(
  backend, '.venv', process.platform === 'win32' ? 'Scripts/python.exe' : 'bin/python',
);
const child = spawn(python, ['-m', 'uvicorn', 'app.main:app', '--host', '127.0.0.1', '--port', '8002'], {
  cwd: backend,
  stdio: 'inherit',
  env: {
    ...process.env,
    BOILERFOUND_DATABASE_URL: 'sqlite:///' + path.join(directory, 'test.db').replaceAll('\\', '/'),
    BOILERFOUND_UPLOAD_DIR: path.join(directory, 'uploads'),
    BOILERFOUND_ENABLE_DEV_AUTH: 'true',
    BOILERFOUND_CORS_ORIGINS: JSON.stringify(['http://127.0.0.1:8083', 'http://localhost:8083']),
  },
});
child.on('error', error => { console.error('Test API could not start:', error.message); process.exit(1); });
child.on('exit', code => process.exit(code ?? 1));
process.on('SIGTERM', () => child.kill('SIGTERM'));
process.on('SIGINT', () => child.kill('SIGINT'));
