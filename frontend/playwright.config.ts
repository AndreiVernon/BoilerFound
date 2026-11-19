import { defineConfig, devices } from '@playwright/test';
export default defineConfig({
  testDir: './tests',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: 2,
  reporter: [['list'], ['html', { open: 'never' }]],
  use: { baseURL: 'http://127.0.0.1:8083', trace: 'retain-on-failure', screenshot: 'only-on-failure' },
  projects: [
    { name: 'desktop-chromium', use: { ...devices['Desktop Chrome'] } },
    { name: 'mobile-chromium', use: { ...devices['Pixel 7'] } },
  ],
  webServer: [{
    command: 'node scripts/start-test-api.cjs',
    url: 'http://127.0.0.1:8002/health',
    reuseExistingServer: false,
    timeout: 60_000,
  }, {
    command: 'npm run web -- --host localhost --port 8083',
    url: 'http://127.0.0.1:8083',
    reuseExistingServer: false,
    timeout: 180_000,
    env: { CI: '1', EXPO_OFFLINE: '1', EXPO_PUBLIC_API_URL: 'http://127.0.0.1:8002', EXPO_PUBLIC_DEV_AUTH_TOKEN: 'dev-token-alice' },
  }],
});
