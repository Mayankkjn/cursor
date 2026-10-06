# Whatfix Lens: feature launch film (Remotion)

This folder holds a 60s, 16:9 launch film for Whatfix Lens and a 33s, 9:16 social cutdown. It is built in React with [Remotion](https://www.remotion.dev) and uses the Lens product's own colour palette. There are two cuts on the same timeline and soundtrack:

- **Kinetic-type cut (primary):** `LensKinetic` / `LensKineticVertical` → `renders/whatfix-lens-kinetic-16x9.mp4`, `renders/whatfix-lens-kinetic-9x16.mp4`, `renders/poster-kinetic-16x9.png`
- **UI cut:** `LensLaunch` / `LensLaunchVertical` → `renders/whatfix-lens-launch-16x9.mp4`, `renders/whatfix-lens-launch-9x16.mp4`, `renders/poster-16x9.png`
- **Production package:** script, VO timing, motion spec, component map and sound design are in [PRODUCTION.md](PRODUCTION.md)
- **Timing source of truth:** [`src/timeline.json`](src/timeline.json). Scenes, beats, VO lines and SFX cues are all frame numbers in this file.

```bash
npm install
npm run studio            # preview / scrub both compositions
npm run render            # kinetic-type 16:9 master
npm run render:vertical   # kinetic-type 9:16 cutdown
npm run render:ui         # UI cut (render:ui-vertical for 9:16)
npm run audio             # regenerate the temp score (pip install numpy scipy pyloudnorm)
```

The composition props are:
- `ctaUrl`: on-screen URL, default `whatfix.com`
- `withAudio`
- `voSrc`: set it to `audio/vo.wav` once a VO is recorded; the music then ducks under it automatically

On machines without internet access to download Chrome, point Remotion at a local headless shell: `REMOTION_BROWSER=/path/to/headless_shell npm run render`.

**Before external use:**
- All figures on screen are illustrative.
- Remotion requires a company licence for organisations of more than 3 people.
- See the checklist at the end of PRODUCTION.md.
