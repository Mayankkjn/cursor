// Renders stills at given frames for quick visual review.
//   node scripts/stills.mjs <CompositionId> <outDir> <frame> [frame...]
import path from 'node:path';
import { bundle } from '@remotion/bundler';
import { renderStill, selectComposition } from '@remotion/renderer';

const [id = 'LensLaunch', outDir = 'out/stills', ...frames] = process.argv.slice(2);
const serveUrl = await bundle({ entryPoint: path.resolve('src/index.ts') });
const browserExecutable = process.env.REMOTION_BROWSER || null;
const inputProps = { ctaUrl: 'whatfix.com', withAudio: false };
const composition = await selectComposition({ serveUrl, id, browserExecutable, inputProps });
for (const f of frames.map(Number)) {
  const output = path.join(outDir, `${id}-${String(f).padStart(4, '0')}.png`);
  await renderStill({ composition, serveUrl, output, frame: f, browserExecutable, overwrite: true, inputProps });
  console.log('wrote', output);
}
