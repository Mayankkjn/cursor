import { loadFont } from '@remotion/fonts';
import { staticFile } from 'remotion';

// Inter (OFL) stands in for the product's system UI stack so renders are identical on every machine.
[400, 500, 600, 700, 800].forEach((weight) => {
  loadFont({ family: 'Inter', url: staticFile(`fonts/inter-${weight}.woff2`), weight: String(weight), display: 'block' });
});
