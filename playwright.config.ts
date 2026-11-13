import { defineConfig, devices } from '@playwright/test'

const crossBrowser = process.env.CINELAB_CROSS_BROWSER === '1'

export default defineConfig({
  testDir: './e2e',
  workers: 2,
  use: {
    baseURL: 'http://127.0.0.1:4173/cinelab/',
    trace: 'retain-on-failure',
  },
  webServer: {
    command: 'npm run preview -- --host 127.0.0.1 --port 4173 --strictPort',
    url: 'http://127.0.0.1:4173/cinelab/',
  },
  projects: [
    { name: 'desktop', use: { ...devices['Desktop Chrome'], channel: process.env.CINELAB_BROWSER_CHANNEL } },
    { name: 'mobile', use: { ...devices['Pixel 7'], channel: process.env.CINELAB_BROWSER_CHANNEL } },
    ...(crossBrowser ? [
      { name: 'firefox', use: { ...devices['Desktop Firefox'] } },
      { name: 'webkit', use: { ...devices['iPhone 13'] } },
      { name: 'edge', use: { ...devices['Desktop Edge'], channel: 'msedge' } },
    ] : []),
  ],
})
