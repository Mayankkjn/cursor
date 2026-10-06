// Screenshots the built video at a handful of timestamps, for checking
// layout scene by scene before committing to a full render.
//   node preview.js <outDir> [t1 t2 ...]
const path = require('path');
const { chromium } = require(process.env.PLAYWRIGHT_PATH || 'playwright');

(async () => {
  const outDir = process.argv[2] || path.join(__dirname, 'build', 'preview');
  const times = process.argv.slice(3).map(Number);
  const ts = times.length ? times : [2.5, 6, 12.6, 19.8, 27.8, 31.6, 37.6, 47.6, 49, 55.2, 65.4, 74.4, 80.6, 87.6, 92.6];
  require('fs').mkdirSync(outDir, { recursive: true });
  const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined });
  const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto('file://' + path.join(__dirname, 'build', 'lens-launch-video.html') + '?render=1');
  await page.waitForFunction(() => window.__ready === true);
  for (const t of ts) {
    await page.evaluate((tt) => window.__seek(tt), t);
    await page.screenshot({ path: path.join(outDir, `t${String(t).replace('.', '_')}.png`) });
  }
  console.log('errors:', JSON.stringify(errors));
  await browser.close();
})();
