// Renders build/lens-launch-video.html to an MP4, frame by frame.
//
// The page exposes window.__seek(t), which puts every animation in the video
// at exactly time t — so each frame is captured deterministically, with no
// dropped frames regardless of how fast this machine is.
//
//   FFMPEG=/path/to/ffmpeg node render.js [out.mp4] [fps]
const path = require('path');
const { spawn } = require('child_process');
const { chromium } = require(process.env.PLAYWRIGHT_PATH || 'playwright');

(async () => {
  const out = process.argv[2] || path.join(__dirname, 'build', 'lens-launch-video.mp4');
  const fps = Number(process.argv[3] || 30);
  const ffmpegPath = process.env.FFMPEG || 'ffmpeg';

  const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined });
  const page = await browser.newPage({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 1 });
  await page.goto('file://' + path.join(__dirname, 'build', 'lens-launch-video.html') + '?render=1');
  await page.waitForFunction(() => window.__ready === true);
  const duration = await page.evaluate(() => window.__duration);
  const frames = Math.round(duration * fps);

  const ff = spawn(ffmpegPath, [
    '-y', '-loglevel', 'error',
    '-f', 'image2pipe', '-framerate', String(fps), '-c:v', 'mjpeg', '-i', '-',
    '-c:v', 'libx264', '-preset', 'slow', '-crf', '18', '-pix_fmt', 'yuv420p',
    '-movflags', '+faststart', out,
  ], { stdio: ['pipe', 'inherit', 'inherit'] });
  const ffDone = new Promise((resolve, reject) => ff.on('close', (code) => (code === 0 ? resolve() : reject(new Error(`ffmpeg exited ${code}`)))));

  const started = Date.now();
  for (let i = 0; i < frames; i++) {
    await page.evaluate((t) => window.__seek(t), i / fps);
    const buf = await page.screenshot({ type: 'jpeg', quality: 95 });
    if (!ff.stdin.write(buf)) await new Promise((r) => ff.stdin.once('drain', r));
    if (i % (fps * 5) === 0) {
      const secs = ((Date.now() - started) / 1000).toFixed(0);
      console.log(`frame ${i}/${frames} (${(i / fps).toFixed(1)}s of video, ${secs}s elapsed)`);
    }
  }
  ff.stdin.end();
  await ffDone;
  await browser.close();
  console.log(`wrote ${out} — ${frames} frames, ${duration}s at ${fps}fps`);
})().catch((err) => { console.error(err); process.exit(1); });
