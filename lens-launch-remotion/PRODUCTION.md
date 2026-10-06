# Whatfix Lens — Feature Launch Film · Production Package

**Deliverables:** 60s master, 16:9 (1920×1080, 30 fps), plus a 33s 9:16 social cutdown (1080×1920, 30 fps).
**Tone:** sleek, confident, enterprise-premium. The approach is calm precision, not hype: data-forward, minimal UI chrome, purposeful motion.
**Arc:** chaos (0–5s) → clarity (5–30s) → action (30–60s).
**Audience:**
- operations leaders
- process excellence / CoE teams
- transformation and automation leads
- business analysts in large enterprises (insurance, financial services, shared services)

Everything in this document is implemented in this folder: the Remotion project renders the film exactly as described. The single source of timing truth is [`src/timeline.json`](src/timeline.json). Scene boundaries, every visual beat, every VO line and every SFX cue are frame numbers in that file. The React scenes and the audio generator both read it, so picture and sound cannot drift.

> **Illustrative figures.** Every number on screen is an illustrative concept figure: 92/100, 18,420/mo, 87%, 12%, ~2,100 hrs/mo, 25%, 40%, 38%, 1 in 3, 34%, 485 hrs/wk and 12 FTE. The film carries a small "Illustrative figures" label throughout the demo and proof scenes. Before external use, replace the figures with real customer or pilot data, or keep the label. The coverage figures are derived from the brief's ~2,100 hrs/mo: ≈ 485 hrs/week ≈ 12 FTE at 40 h/week. 34% is a placeholder share of the process automated.

---

## 0 · Kinetic-type cut (primary): `LensKinetic` / `LensKineticVertical`

In this cut the picture *is* the type. Every UI moment is retold typographically, and every word lands on a VO syllable, a click or a beat of the 72 BPM score. It uses **the same timeline, VO script, score and SFX stems** as the UI cut (sections 2–4 below), so the audio carries over sample-for-sample.

| Scene | Frames | Type treatment |
|---|---|---|
| HOOK | 0–150 | **"process" × 100.** The word itself is scattered across the frame in grey, and the count runs 1→100 with the counter ticks. Every 8th copy is **"rework ↻"** in warm orange and swells on each beat. **"Same process."** rises in word by word (f10/18). **"100 ways"** *slams* in rework orange with the number still counting, then **"to run it."** follows. The lines lift away (f85), then **"Which one do you"** (f88–106) and a 220 px **"automate?"** *slam* in action orange (f112). |
| DEMO | 150–600 | **Chaos converges.** All 100 words fly into one point, where the Lens mark spirals in (f166). **"Whatfix Lens / shows how work really happens."** follows, word by word on the VO. **The path stack lands on the clicks**, each row with a tag pill and a line that draws under it, carrying a travelling dot (fastest moves fastest): **"Fastest path"** slams in green (f250, 1.9 days); **"Most common"** in muted grey with a dashed line (f300, 2.4 days · 46%); **"Rework"** letters *drop* and pile up in orange, with a spinning ↻ pulsing on the beat (f350, 38% repeat). **AI Summary** (f398) then types the full sentence at 74 px with semantic highlights, on the typing SFX. It recedes as **"Standardize Path B."** rises and slams (f505/515), followed by the reasons (40% faster · Zero rework · 1 in 3). A green comet underline runs under *Path B* (f552). |
| MORPH | 600–900 | **Type collapses into the golden line.** The recommendation flattens (scaleY → 0) into a glowing green rule that grows edge to edge on the collapse whoosh. **"From showing you how work happens, / to telling you / what to automate next."** sets word by word, with the last line slammed in action orange. **"Approval"** rises onto the line and **shatters letter by letter** (f700). The five micro-steps (① Approve request … ⑤ Log timestamp) land alternately above and below the line, then ride it into **Seek** (absorb notes f745–769). **The loop is one word per beat with full-bleed colour flips:** OBSERVE (canvas) · UNDERSTAND (ink) · DECIDE (canvas) · AUTOMATE (action orange) · MEASURE (green). The loop row lights up beneath, and ↺ closes it on f887. |
| PROOF | 900–1350 | **"92" at 420 px** counts up on the ticks and turns action orange on the ding (f1000). It docks top-right to make room for the **evidence ledger**: one row per beat (f1025–1125), each number *slams* while it counts — 18,420 · 87% · 3 · 12% (rework) · ~2,100 (action). **"Automate / with Seek →"** follows: a press on the click (f1175) and a fill bar. Then **impact** in three giant counters on the ticks: 34% · 485 · 12. Then the **principle**: "Every recommendation / shows its **evidence.**" with a green underline. |
| END | 1350–1800 | The golden line traces the octagon and resolves into the Lens mark (resolve hit, f1425). The wordmark wipes on. **"Know what to automate next."** sets word by word, with *automate* slammed in action orange (f1450–1476). Then **Book a demo** and the final line, **"Discovery only matters when it leads to a decision."**, at 7 frames per word on the VO, with *decision.* set in ink. |

**Type rules for this cut:**
- **Weights:** Inter 800 for display; 600–650 for supporting lines and labels; tracking −0.04em at display sizes.
- **Entrances:** `rise` (masked rise, tracking settles) for most words. `slam` (scale 1.32→1, blur 14→0, 9 f) is reserved for the stressed word in each line: *100 ways, automate?, Fastest path, Path B., what to automate next., 92, the ledger numbers, Automate, evidence.* `drop` (letters fall in on a 2-frame stagger) is used only for "Rework".
- **Colour:** carries meaning only — green is the path to take, warm orange-brown is the cost, deep orange is the action.

Code: `src/kinetic/`. That folder holds `type.tsx` (`KWord`, `KLine`, `seq`, `Label`), `Swarm.tsx` and the scenes `KHook`, `KDemo`, `KMorph`, `KProof`; the end scene reuses `EndCard` with `kinetic`.

---

## 1 · Visual system

### Colour: the Lens product palette

These colours are lifted from the product's own stylesheet (`process-map/styles.css`), so the film reads as the product.

| Role | Hex | Used for |
|---|---|---|
| Canvas | `#f6f6f9` | Background, with the product's faint `#e2e2ed` dot grid |
| Surface | `#ffffff` / border `#eaeaf2`, `#ebebf3` | Cards, panels, nodes (node stroke `#e2e2ed`) |
| Ink | `#2a2e45` / `#8b8fa6` / `#b2b5c6` | Primary, secondary and tertiary text |
| **Path accent: "golden" fastest path** | **`#1f9d5c`** (soft `#e4f6ec`, ink `#157a45`) | Path B, its glow, flow dots, the end-card line, positive deltas. The *only* path accent. |
| Most common path (muted) | `#9a9fb5` (soft `#eef0f6`) | Path A, thicker but desaturated |
| **Warning: rework** | **`#d17d2c`** (soft `#fbf0e2`, ink `#9a5613`) | Rework loops, hotspot badge, "38% repeat", "12% rework". The *only* warning colour. |
| UI accent / action | `#c74900` (soft `#fbe8dc`) | Active AI Summary button, "Automate with Seek", "Book a demo", the word *automate* |
| Logo | `#f45703` `#f98a20` `#fba351` | Whatfix Lens aperture mark, and "Lens" in the wordmark |

**Rule:** green means *the path to take*, warm orange-brown means *the cost*, and deep orange means *the action*. No other hues appear.

### Typography

Inter (OFL, bundled in `public/fonts`) stands in for the product's system UI stack, so renders are identical everywhere.

| Token | Size @1920 | Weight / tracking | Use |
|---|---|---|---|
| display | 112 px | 800 / −0.035em | Hook headline |
| kinetic | 132 px | 800 / settles from +0.09em to −0.03em | OBSERVE → MEASURE |
| h1 | 66–92 px | 750–800 / −0.03em | Shift line, principle, tagline |
| wordmark | 132 px | 800 / −0.045em | "Whatfix Lens" |
| body | 27–30 px | 500 | AI Summary text |
| ui | 16–22 px | 600–700 | Buttons, badges, node labels |
| caption | 15 px | 750 / +0.14em uppercase | AUTOMATION CANDIDATE, RECOMMENDATION, THE EVIDENCE |

The 9:16 cutdown keeps absolute sizes on a 1080-wide canvas, so type reads ~1.8× larger on a phone.

### Motion language

| Name | Curve | Where |
|---|---|---|
| `settle` | `cubic-bezier(0.16, 1, 0.3, 1)` (expo-out) | Everything entering: cards, badges, supers, counters |
| `camera` | `cubic-bezier(0.65, 0, 0.35, 1)` (in-out) | Push-ins, re-framing, rack focus, path collapse, line draw |
| `exit` | `cubic-bezier(0.7, 0, 0.84, 0)` (in) | Supers and words leaving |
| `SPRING.calm` | `{damping: 200, stiffness: 100}` (critically damped) | Default spring, with no overshoot |
| `SPRING.chip` | `{damping: 18, stiffness: 140, mass: 0.8}` | Evidence chips only; the one place a hint of overshoot is allowed |

**Rules:**
- No whip pans, no bounces, no shake.
- Camera moves are slow push-ins of ≤ 5% over 3–7 s.
- Focus shifts are rack-focus blurs of 1.6–3 px over 18–20 frames.
- Text enters by rising out of a mask while letter-spacing tightens (`<Super tracking>`).
- Rework loops pulse on the beat: every 25 frames, which is 72 BPM.

---

## 2 · Script, VO and picture, beat by beat

Total VO is **117 words**, in 17 lines, with room to breathe on the proof numbers. VO in/out times below are frame-accurate targets for the record and edit. If a read runs long, keep the **in** points; the music ducks on the timeline's windows.

### Scene 1 · HOOK: 0:00–0:05 (frames 0–150)

| Time | VO | On screen / motion |
|---|---|---|
| 0.00 | — | Canvas `#f6f6f9`. 46 grey strands draw on from a shared Start (left) to a shared End (right), staggered over 80 frames (`settle`). The strands curl, cross and backtrack: the same process run every possible way. 12 **rework loops** (`#d17d2c`, 3.6 px with arrowheads) spin slowly and **pulse on every beat** (opacity and radius, plus a soft halo). The camera pushes in 1.00 → 1.05 over the scene (`camera`). |
| 0.27–2.67 | "Every process runs a hundred different ways." | Super, centred at 112 px, rising from a mask with tracking settling: **"Same process."** (f10) / **"<span>100 ways</span> to run it."** (f30), with "100 ways" in rework orange. A soft radial scrim keeps the type legible over the tangle. |
| 0.60–2.60 | — | Product chip under the headline: `● Purchase to bind │ 1→100 variants │ 24,310 instances`. The counter runs expo-out with ticks; the rework dot pulses on the beat. |
| 2.87–4.67 | "Which one should you automate?" | Lines lift out (f85, `exit`); **"Which one do you <span>automate?</span>"** rises in (f91), with *automate* in action orange `#c74900`. |
| 3.50–5.00 | — | Riser builds under the drone. **Hard hit on f150.** |

### Scene 2 · DEMO: 0:05–0:20 (frames 150–600)

| Time | VO | On screen / motion |
|---|---|---|
| 5.00–6.67 | — | **The tangle resolves into the Lens map.** Each strand's points ease (`camera`, staggered) onto the real routes: a third onto Path B, a third onto Path A, the rest fade out as the long tail. The rework loops fly into the Verification node's loop. The Lens window fades up around it with minimal chrome: logo, "Purchase to bind · 24,310 instances · 5 apps · avg 3.2 days", and the Path Filter on the right. Nodes pop in left to right (5-frame stagger, `settle`). The camera settles 1.05 → 1.00. |
| 5.50–8.00 | "Whatfix Lens shows how work really happens." | Instance dots flow along both routes. 1 in 3 take Path B, and they travel faster (120 vs 165 frames per traversal). |
| 6.67–13.3 | — | Slow push-in 1.00 → 1.035 (f200–400, `camera`). A cursor glides (`camera`) to each filter. |
| 8.33 | "The fastest path." | **Click "Fastest path"** (f250): button press, ripple. **Path B draws on in green** (34 frames, `settle`) with a soft glow; its dots turn green; the Fast-track node outline turns green. Everything else dims 60%. Badge: `● Fastest path · 1.9 days`. |
| 10.0 | "The most common one." | **Click "Most common"** (f300): Path A draws on, thick and muted `#9a9fb5`. Badge: `● Most common · 2.4 days`. |
| 11.67 | "And where rework piles up." | **Click "Rework"** (f350): the Verification self-loop turns rework orange, thickens and **pulses on the beat** with a glow. The node outline turns warm. Badge: `↻ Rework hotspot · 38% repeat`. |
| 13.27 | — | **Click "AI Summary"** (f398); the button turns solid `#c74900`. |
| 13.33–14.7 | "Then it tells you, in plain language, which path to standardize, and why." | The map **re-frames** to the left (scale 1 → 0.69, `camera`, 40 f) while the **AI Summary panel** slides in from the right (`settle`). **Rack focus to the panel** (map blur 0 → 3 px, f410–430). |
| 14.17–16.67 | ″ | **AI Summary types in** at ~1.7 chars per frame: "The most common path is **25% slower** than <span>Path B</span>. **Approval** is the biggest time sink, and <span>38% of users repeat verification</span>." The highlights use the semantic colours (Path B green, rework warm). When the typing reaches "Approval", a dark `⏱ Biggest time sink` badge appears on the Approval node, and its outline darkens. |
| 16.67 | ″ | **Recommendation card** slides up (34 f, `settle`), with a green spine. RECOMMENDATION · **Standardize <span>Path B</span>**. Rows stagger in: ⚡ **40% faster** than the process average · ✓ **Zero rework** on this path · 👥 **Already used** by 1 in 3 users. |
| 18.27–18.87 | — | **Rack focus back to the map** (panels soften to 1.6 px). A bright **comet pulse travels down Path B** (f552, 40 f), so the recommendation lands on the map itself. |

### Scene 3 · MORPH: 0:20–0:30 (frames 600–900)

| Time | VO | On screen / motion |
|---|---|---|
| 20.00 | — | **Soft hit.** The UI chrome dissolves: panels exit right, the window fades, and the map re-frames to full size (`camera`, 30 f). |
| 20.13–22.2 | "From showing you how work happens…" | **All paths collapse into one golden path.** Path A's polyline morphs point by point onto Path B (`camera`, 60 f), with a collapse whoosh. Verification slides into Fast-track and fades, taking its rework loop with it. Path B's glow doubles. Super (ink-2): **"From showing how work happens…"** (f618). |
| 21.67–24.9 | "…to telling you what to automate next." | Super (ink): **"…to telling you <span>what to automate next.</span>"** (f650), in action orange. The path **straightens** onto one horizontal line (f660–700). Every node except Approval collapses into a green dot on the line. |
| 23.33 | — | **Approval breaks apart** into five automation-ready micro-steps that spread along the line (spring-free `settle`, 2-frame stagger), with a glass "fracture" SFX: ① Approve request ② Open record ③ Check threshold ④ Click Approve ⑤ Log timestamp. |
| 23.83 | — | The **Seek** node scales in at the end of the line: an orange disc with a white bolt and a halo that pulses on the beat. |
| 24.33–25.7 | — | The steps **flow right into Seek**, nearest first, 6 frames apart (`camera`, 15 f each), shrinking as they are absorbed. Each arrival has a rising "absorb" note, and Seek's halo swells on each. |
| 25.83–29.83 | "Observe. Understand. Decide. Automate. Measure." | **Kinetic typography, one word per beat** (f775/800/825/850/875). Each 132 px word rises from a mask while tracking tightens, then lifts away as the next arrives; AUTOMATE is in action orange. Underneath, the loop row lights up step by step with a green dot under the active word. On f887 a **green return arc draws from MEASURE back to OBSERVE**, closing the loop. A riser builds into the cut. |

### Scene 4 · PROOF: 0:30–0:45 (frames 900–1350)

| Time | VO | On screen / motion |
|---|---|---|
| 30.00 | — | **Hit.** The opportunity card rises in (24 f): AUTOMATION CANDIDATE · **Customer Verification** · Purchase to bind · step 3. |
| 30.50–33.33 | "Customer Verification scores ninety-two out of a hundred." | A 300° gauge fills in step with the **score counting 0 → 92/100** (85 f, expo-out), with ticks that thin out as the count slows. A **ding** lands on f1000. |
| 34.17–37.5 | "Eighteen thousand runs a month. Eighty-seven percent identical." | **Evidence chips stack in, one per beat** (f1025/1050/1075/1100/1125), each a `SPRING.chip` slide with a pop SFX and a 16-frame count-up: **18,420** executions/month · **87%** identical pattern · **3 apps** CRM · policy admin · email · **12%** rework rate (rework tone) · **~2,100 hrs** potential savings/month (highlighted in action-orange soft). |
| 37.40–39.67 | "Over two thousand hours a month, back." | Lands on the savings chip. **"Automate with Seek"** rises into the card (f1150). |
| 39.17 | — | A cursor glides in. **Click** (f1175): press, ripple, click SFX. |
| 39.33–42.07 | "Automate it with Seek, and watch coverage grow." | The camera **pulls back** (scale 1 → 0.8, `camera`, 34 f). The **Automation coverage** dashboard rises in. The toggle flips Before → **After** and the counters run (f1195–1255): **34%** of process automated (green bar) · **485** hours saved/week · **12** FTE capacity freed, each with "▲ from 0 before automation". |
| 42.50–44.67 | "Every recommendation shows its evidence." | **Principle.** Everything behind softens (blur 6 px, 12% opacity). Centred super, 92 px: **"Every recommendation / shows its evidence."** A green underline draws under *evidence*. |

### Scene 5 · END: 0:45–1:00 (frames 1350–1800)

| Time | VO | On screen / motion |
|---|---|---|
| 45.00 | — | **Hit, then a breath**: the music drops to a low pad and a downlifter. Clean canvas with a white centre glow. |
| 45.17–46.83 | — | **The golden path returns.** A green line (6 px plus glow) draws from the lower left, sweeps up and **traces the octagon** of the Lens mark (50 f, `camera`), with a rising "pen" shimmer. |
| 46.83–47.6 | — | **The line resolves into the logo.** The eight aperture blades spiral in (−120° → 0°, scale 0.2 → 1, 2-frame stagger, `settle`) as the line fades. **Resolve hit plus a C-major bell chord on f1425**, with a warm orange bloom behind the mark. |
| 47.60–50.67 | "Whatfix Lens. Know what to automate next." | The wordmark **"Whatfix <span>Lens</span>"** wipes on left to right (f1430). Tagline super (f1450): **"Know what to <span>automate</span> next."** The camera drifts 1.00 → 1.03 to the end. |
| 50.00 | — | CTA (f1500): a **[ Book a demo → ]** button (`#c74900`) and the URL `whatfix.com` (placeholder, see §6). |
| 51.87–55.0 | "Discovery only matters when it leads to a decision." | The final hook in small type (24 px, ink-2, f1550), with a green dot: **"Discovery only matters when it leads to a decision."** |
| 56.00–57.4 | "Book a demo." | Hold on the end card. The music tail fades over the last 2 s. |

### VO timing sheet

| # | Scene | In (s) | Out (s) | Frames | Words | Line |
|---|---|---|---|---|---|---|
| 1 | HOOK | 0.27 | 2.67 | 8–80 | 7 | Every process runs a hundred different ways. |
| 2 | HOOK | 2.87 | 4.67 | 86–140 | 5 | Which one should you automate? |
| 3 | DEMO | 5.50 | 8.00 | 165–240 | 7 | Whatfix Lens shows how work really happens. |
| 4 | DEMO | 8.40 | 9.47 | 252–284 | 3 | The fastest path. |
| 5 | DEMO | 10.07 | 11.20 | 302–336 | 4 | The most common one. |
| 6 | DEMO | 11.73 | 13.07 | 352–392 | 5 | And where rework piles up. |
| 7 | DEMO | 13.67 | 18.67 | 410–560 | 13 | Then it tells you, in plain language, which path to standardize, and why. |
| 8 | MORPH | 20.40 | 24.93 | 612–748 | 13 | From showing you how work happens, to telling you what to automate next. |
| 9 | MORPH | 25.83 | 29.83 | 775–895 | 5 | Observe. Understand. Decide. Automate. Measure. *(one word per beat)* |
| 10 | PROOF | 30.93 | 33.50 | 928–1005 | 8 | Customer Verification scores ninety-two out of a hundred. |
| 11 | PROOF | 34.07 | 37.00 | 1022–1110 | 8 | Eighteen thousand runs a month. Eighty-seven percent identical. |
| 12 | PROOF | 37.40 | 39.67 | 1122–1190 | 7 | Over two thousand hours a month, back. |
| 13 | PROOF | 39.87 | 42.07 | 1196–1262 | 8 | Automate it with Seek, and watch coverage grow. |
| 14 | PROOF | 42.50 | 44.67 | 1275–1340 | 5 | Every recommendation shows its evidence. |
| 15 | END | 47.60 | 50.67 | 1428–1520 | 7 | Whatfix Lens. Know what to automate next. |
| 16 | END | 51.87 | 55.00 | 1556–1650 | 9 | Discovery only matters when it leads to a decision. |
| 17 | END | 56.00 | 57.40 | 1680–1722 | 3 | Book a demo. |
| | | | | | **117** | |

**Direction for the read:**
- Measured, warm, mid-low register, about 150 wpm, no upspeak.
- Let the numbers sit: a small pause after each figure.
- Lines 4–6 should land *on* the clicks at 8.33 / 10.0 / 11.67 s.
- Line 9 should land one word per beat, on the kinetic words.

---

## 3 · Remotion build

```
lens-launch-remotion/
├─ remotion.config.ts        h264 CRF 18, yuv420p, AAC 320k, JPEG 95 frames
├─ src/
│  ├─ index.ts / Root.tsx    <Composition>s: LensLaunch (1920×1080, 1800f) · LensLaunchVertical (1080×1920, 1000f)
│  ├─ timeline.json          scenes · beats · vo · sfx · vertical segments (single source of truth)
│  ├─ theme.ts               palette (C), type scale, EASE, SPRING
│  ├─ LensLaunch.tsx         master: 5 scene <Sequence>s + <Soundtrack>
│  ├─ LensLaunchVertical.tsx 9:16 cutdown: master frame ranges re-sequenced
│  ├─ scenes/                HookScene · DemoScene · MorphScene · ProofScene · EndScene
│  ├─ components/
│  │  ├─ ProcessMap.tsx      nodes, edges, rework loop, flow dots, badges (both orientations)
│  │  ├─ PathHighlight.tsx   route draw-on, glow, comet pulse
│  │  ├─ Tangle.tsx          the hook's 100-ways chaos, and its convergence onto real routes
│  │  ├─ AppFrame.tsx        minimal Lens chrome, Path Filter, cursor, click ripples
│  │  ├─ AISummaryPanel.tsx  typewriter with semantic highlights
│  │  ├─ RecommendationCard.tsx
│  │  ├─ OpportunityScore.tsx   300° gauge, count-up, "Automate with Seek"
│  │  ├─ EvidenceChip.tsx
│  │  ├─ CoverageDashboard.tsx  before → after impact
│  │  ├─ KineticLoop.tsx     OBSERVE → MEASURE
│  │  ├─ EndCard.tsx         line → octagon → logo, wordmark, CTA
│  │  ├─ LensLogo.tsx        vector aperture mark with per-blade animation
│  │  ├─ Super.tsx · Camera.tsx · Background.tsx · Illustrative.tsx · Icons.tsx
│  │  └─ Soundtrack.tsx      music + SFX stems, optional VO, ducking
│  ├─ data/process.ts        the "Purchase to bind" process: nodes, edges, routes, both layouts
│  └─ lib/                   anim (prog, springAt, typed, beatPulse), geometry, mapGeometry
├─ audio/make_score.py       temp score + SFX stems from timeline.json, mastered
└─ public/                   fonts/, audio/music.wav, audio/sfx.wav
```

### Compositions and scene sequences

| `<Sequence>` | Frames | Seconds | Component |
|---|---|---|---|
| 1 · HOOK | 0–150 | 0–5 | `<HookScene>` |
| 2 · DEMO | 150–600 | 5–20 | `<DemoScene>` |
| 3 · MORPH | 600–900 | 20–30 | `<MorphScene>` |
| 4 · PROOF | 900–1350 | 30–45 | `<ProofScene>` |
| 5 · END | 1350–1800 | 45–60 | `<EndScene>` |

Each scene computes `f = useCurrentFrame() + scene.from`, so every beat in `timeline.json` is an absolute frame. Scene continuity is explicit:
- `DemoScene` renders `<Tangle resolve>` and picks up exactly where the hook left the strands.
- `MorphScene` starts from `demoState(599)`, an exported pure function of the frame that returns every animated value in the demo.

### Animation patterns used

```ts
// Eased, clamped progress — the workhorse (lib/anim.ts)
const prog = (f, start, dur, easing = EASE.settle) =>
  interpolate(f, [start, start + dur], [0, 1], { easing, extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });

// Calm entrance (no overshoot) vs. evidence chips (a hint of overshoot)
spring({ frame: f - B.proofChip1, fps, config: { damping: 200 } });             // SPRING.calm
spring({ frame: f - B.proofChip1, fps, config: { damping: 18, stiffness: 140, mass: 0.8 } }); // SPRING.chip

// Draw-on without measuring path length: normalise with pathLength
<path d={d} pathLength={1} strokeDasharray="1 2" strokeDashoffset={1 - draw} />

// Count-ups: interpolate the value with settle, render Math.round + toLocaleString
const score = interpolate(f, [915, 1000], [0, 92], { easing: EASE.settle, extrapolateRight: 'clamp' });

// Beat-locked pulse (72 BPM = 25 frames) — rework loops, Seek halo
const pulse = Math.pow(1 - ((f % 25) / 25), 3);

// Rack focus: blur the out-of-focus layer, never both
const focusPanel = prog(f, 410, 20, EASE.camera) - prog(f, 548, 18, EASE.camera);
<AbsoluteFill style={{ filter: `blur(${3 * focusPanel}px)` }}>{map}</AbsoluteFill>
```

**Guidance:**
- Prefer `interpolate` with the named curves for anything choreographed to VO or music, since it gives exact frame landings.
- Reserve `spring` for physical, self-timed entrances.
- Keep `damping: 200` unless overshoot is intended.
- Never use `Math.random()`: the tangle uses a seeded PRNG (`lib/geometry.ts → rng`), so every render is identical.

### 9:16 social cutdown (`LensLaunchVertical`)

The cutdown uses the **same scene components**. Each one reads the composition's aspect ratio (`useOrientation()`) and re-lays itself out for portrait:
- the map flows top → bottom with its own node layout (`LAYOUT.v`)
- panels dock as bottom sheets
- the filter row and badges reflow
- the hook type stacks under the tangle

The edit is a list of master frame ranges in `timeline.json → vertical.segments`, cut on beats:

| Segment | Master frames | Length | Content |
|---|---|---|---|
| 1 | 0–150 | 5.0 s | Hook |
| 2 | 150–400 | 8.3 s | Tangle → map, fastest / common / rework filters |
| 3 | 500–600 | 3.3 s | Recommendation card + Path B pulse |
| 4 | 900–1150 | 8.3 s | Score count-up + all five evidence chips |
| 5 | 1350–1600 | 8.3 s | Logo resolve, tagline, CTA, final line |
| | | **33.3 s** | |

The soundtrack is sliced from the **same master stems**, using `trimBefore` with 2-frame edge fades, so hits stay on their frames. The supers carry the message for sound-off viewing. If a captioned version is needed, `timeline.json → vo` already holds every line with frame timings.

### Run and render

```bash
npm install
npm run studio                       # scrub both compositions; props: ctaUrl, withAudio, voSrc
python3 audio/make_score.py          # regenerate stems after any timing change (numpy scipy pyloudnorm)
npm run render                       # renders/whatfix-lens-launch-16x9.mp4
npm run render:vertical              # renders/whatfix-lens-launch-9x16.mp4
```

---

## 4 · Sound design and audio sync

### Music bed: 72 BPM (1 beat = 25 frames exactly), A minor → C major

The tempo was chosen so that **every scene boundary falls on a beat**: f150, 600, 900 and 1350 are beats 6, 24, 36 and 54. The kinetic words, chip pops and Seek click all land on beats too.

| Section | Frames | Harmony / texture | Intent |
|---|---|---|---|
| Hook | 0–150 | Drone on A1 + A♯1 (minor 2nd) + E2. High E5/F5 shimmer beating against itself. Low "heartbeat" thump on every beat (two detuned sines). Noise + pitch **riser** f105→150. | Tense, dissonant, unresolved |
| Demo | 150–600 | Pad: Am(add9) → Am9 → Fmaj7 → Am9 → Dm9 (one chord per bar, 100 f). Plucked 8th-note arpeggio with a dotted-8th ping-pong delay. Sub on each bar, soft kick on downbeats. | Clarity arriving: calm, precise pulse |
| Morph | 600–900 | Fmaj7(♯11) → G6 → Esus. The filter opens (1.9 → 3.4 kHz), kicks move to half-notes, and a **riser** builds f840→900. | Build, the shift |
| Proof | 900–1350 | Am → F → C → G (G held). Kick on every beat, offbeat hats. Brightest arpeggio. | Confident groove under the numbers |
| End | 1350–1800 | **Breath**: a low Fmaj9 pad plus a downlifter (f1350–1425). **Resolve** on f1425: Cmaj9 (C2 G2 E3 B3 D4 G4) swell, sparse quarter-note plucks, 2 s fade out. | Resolved, warm |

### SFX cue sheet

All cues are frame-exact, from `timeline.json → sfx`.

| Frame | Time | Cue | Gain | Sync |
|---|---|---|---|---|
| 18 → 78 | 0.60 | counterTicks | −24 | Variants counter 1→100 (dense, then sparse: expo-out) |
| **150** | **5.00** | **hitBig** | −6 | **Cut: hook → demo** (sub boom + noise burst + reverb) |
| 250 / 300 / 350 | 8.33 / 10.0 / 11.67 | uiClick | −14 | Path Filter clicks |
| 398 | 13.27 | uiClick | −14 | AI Summary button |
| 400, 500 | 13.33, 16.67 | whooshSoft | −16 | Panel and card slide-ins (pre-rolled 6 frames) |
| 425 → 500 | 14.17 | typing | −26 | Soft key ticks under the typewriter |
| **600** | **20.00** | **hitSoft** | −10 | **Cut: demo → morph** |
| 604 | 20.13 | whooshCollapse | −9 | Paths collapse (1.4 s, downward sweep, R→L pan) |
| 700 | 23.33 | fracture | −14 | Approval breaks into micro-steps |
| 745–769 | 24.83–25.63 | absorb ×5 | −18 | Each micro-step entering Seek (rising pentatonic) |
| 775–875 | 25.83–29.17 | wordHit ×5 | −12 | OBSERVE … MEASURE (A4 → F♯5 mallet + low thud) |
| **900** | **30.00** | **hitMid** | −8 | **Cut: morph → proof** |
| 915 → 1000 | 30.50 | countTicks | −22 | Score count-up |
| 1000 | 33.33 | ding | −14 | Score lands on 92 |
| 1025–1125 | 34.17–37.50 | chipPop ×5 | −17 / −15 | Evidence chips (pitch steps up; the savings chip is loudest) |
| 1175 | 39.17 | uiClick | −12 | "Automate with Seek" |
| 1180 | 39.33 | whooshSoft | −16 | Pull-back to the dashboard |
| 1195 → 1255 | 39.83 | countTicks | −26 | Coverage counters |
| **1350** | **45.00** | **hitMid** | −9 | **Cut: proof → end** |
| 1355 → 1405 | 45.17 | lineDraw | −16 | Golden line tracing the octagon (pen shimmer + rising tone) |
| **1425** | **47.50** | **resolve** | −7 | Logo resolves: reverse swell into boom + C-major bell chord |
| 1500 | 50.00 | uiClick | −20 | CTA appears |

### VO ducking

Implemented in `Soundtrack.tsx → duckGain`. When a VO stem is supplied (`voSrc`), the **music stem only** ducks **−8 dB** under every line in `timeline.json → vo`:
- **6-frame (200 ms) attack** before the line
- **12-frame (400 ms) release** after it
- overlapping windows merge

SFX are never ducked, so hits and clicks stay crisp. To hand off: drop the recorded VO at `public/audio/vo.wav` (60.0 s, aligned to frame 0) and set `voSrc: 'audio/vo.wav'`.

### Mix target and verification

- **−14 LUFS integrated, −1 dBTP true peak.** `make_score.py` normalises the music + SFX sum, then applies a shared look-ahead true-peak limiter (4× oversampled, 3 ms look-ahead, 80 ms release) to both stems. The stems therefore still sum to the mastered mix. The ceiling is set to **−1.5 dBTP**, leaving 0.5 dB of headroom for the AAC encode. It iterates until both targets are met.
- **Per-scene loudness follows the arc:** hook −14.2, demo −15.2, morph −13.1, proof −13.7, end −14.1 LUFS.
- **After adding real VO,** re-master the final three-stem mix to the same targets. Use ffmpeg `loudnorm=I=-14:TP=-1:LRA=11` in two-pass mode, or your DAW's limiter, then verify with `ffmpeg -i out.mp4 -af ebur128=peak=true -f null -`.
- **Delivery:**
  - mastered stereo in the MP4 (AAC 320 kbps, 48 kHz)
  - music and SFX stems in `public/audio/` (16-bit / 48 kHz WAV, exactly 60.000 s)

The included score is a **temp score**: it is final-timed and mix-referenced, and a composer can replace either stem 1:1 against the same sync points.

---

## 5 · Brand and legal checklist

- [ ] Replace the illustrative figures with real customer or pilot data, or keep the "Illustrative figures" label (both 16:9 and 9:16).
- [ ] Confirm the CTA URL. The on-screen default is `whatfix.com`. Set the `ctaUrl` prop to the Lens landing page.
- [ ] Confirm product naming: "Seek" (the automation action) and "AI Summary".
- [ ] Record the VO against §2's timing sheet, and supply `vo.wav`.
- [ ] Remotion licence: Remotion is free for individuals and companies of up to 3 people. Larger organisations need a [company licence](https://www.remotion.dev/license) to render commercially.
- [ ] Logo: the Lens mark is rebuilt as vectors from a 57 px PNG. Swap in the official SVG if one exists (`components/LensLogo.tsx`).
