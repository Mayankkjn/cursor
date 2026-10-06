"""Temp score + SFX for the Whatfix Lens launch film, generated from src/timeline.json.

Writes two stems that Remotion mixes (src/components/Soundtrack.tsx):
  public/audio/music.wav  music bed — tense/dissonant hook → resolved C major end card
  public/audio/sfx.wav    hits on scene cuts, UI clicks, whooshes, count-up ticks, ...

Everything is placed on exact video frames from timeline.json, so picture and sound
cannot drift. The two stems share one limiter gain curve, so their sum is mastered to
-14 LUFS integrated / -1 dBTP (with 0.5 dB headroom for the AAC encode).

This is a temp score for timing and mix reference; a composer/sound designer can
replace either stem 1:1 (same length, same sync points).

    python3 audio/make_score.py
"""
import json
import pathlib

import numpy as np
import pyloudnorm
from scipy import signal
from scipy.ndimage import maximum_filter1d
from scipy.io import wavfile

ROOT = pathlib.Path(__file__).resolve().parent.parent
TL = json.loads((ROOT / "src" / "timeline.json").read_text())
SR = 48000
FPS = TL["fps"]
DUR = TL["durationInFrames"] / FPS
N = int(round(DUR * SR))
BEAT = TL["beatFrames"]  # 25 frames = 72 BPM
TARGET_LUFS = -14.0
CEILING_DBTP = -1.5  # -1 dBTP spec, minus 0.5 dB margin for lossy encoding

rng = np.random.default_rng(42)
t_all = np.arange(N) / SR


def fr(frame):
    """video frame -> sample index"""
    return int(round(frame / FPS * SR))


def db(x):
    return 10 ** (x / 20)


def midi(m):
    return 440.0 * 2 ** ((m - 69) / 12)


NOTE = {n: i for i, n in enumerate(["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"])}


def m(name):  # "A2" -> midi
    return 12 * (int(name[-1]) + 1) + NOTE[name[:-1]]


def stereo(x, pan=0.0):
    l = np.cos((pan + 1) * np.pi / 4)
    r = np.sin((pan + 1) * np.pi / 4)
    return np.stack([x * l * 1.414, x * r * 1.414])


def add(bus, sig, start):
    """add a (2, n) signal into bus at sample start (clipped to bounds)"""
    if start >= bus.shape[1]:
        return
    if start < 0:
        sig = sig[:, -start:]
        start = 0
    n = min(sig.shape[1], bus.shape[1] - start)
    bus[:, start : start + n] += sig[:, :n]


def lp(x, hz, order=2):
    sos = signal.butter(order, hz, "low", fs=SR, output="sos")
    return signal.sosfilt(sos, x)


def hp(x, hz, order=2):
    sos = signal.butter(order, hz, "high", fs=SR, output="sos")
    return signal.sosfilt(sos, x)


def bp(x, lo, hi, order=2):
    sos = signal.butter(order, [lo, hi], "band", fs=SR, output="sos")
    return signal.sosfilt(sos, x)


def sweep_filter(x, f0, f1, kind="band", q=0.35, block=512):
    """block-wise time-varying filter (exponential cutoff sweep)"""
    out = np.zeros_like(x)
    nblk = int(np.ceil(len(x) / block))
    zi = None
    for b in range(nblk):
        c = f0 * (f1 / f0) ** (b / max(1, nblk - 1))
        if kind == "band":
            sos = signal.butter(2, [c * (1 - q), min(c * (1 + q), SR / 2 - 100)], "band", fs=SR, output="sos")
        else:
            sos = signal.butter(2, min(c, SR / 2 - 100), "low", fs=SR, output="sos")
        if zi is None or zi.shape[0] != sos.shape[0]:
            zi = np.zeros((sos.shape[0], 2))
        seg = x[b * block : (b + 1) * block]
        y, zi = signal.sosfilt(sos, seg, zi=zi)
        out[b * block : b * block + len(seg)] = y
    return out


def env_adsr(n, a, r, sustain_n=None):
    a_n = max(1, int(a * SR))
    r_n = max(1, int(r * SR))
    e = np.ones(n)
    e[:a_n] = np.linspace(0, 1, min(a_n, n))[: min(a_n, n)] if n >= a_n else np.linspace(0, 1, n)
    if n > r_n:
        e[-r_n:] *= np.linspace(1, 0, r_n) ** 2
    return e


def saw(freq, n, harmonics=14):
    t = np.arange(n) / SR
    out = np.zeros(n)
    for k in range(1, harmonics + 1):
        if freq * k > 12000:
            break
        out += np.sin(2 * np.pi * freq * k * t + rng.uniform(0, 2 * np.pi)) / k
    return out


def reverb_ir(seconds=2.4, damp=5000):
    n = int(seconds * SR)
    t = np.arange(n) / SR
    decay = np.exp(-t * 6.9 / seconds)
    ir = np.stack([lp(rng.standard_normal(n), damp) * decay, lp(rng.standard_normal(n), damp) * decay])
    ir[:, : int(0.012 * SR)] *= np.linspace(0, 1, int(0.012 * SR))  # pre-delay softening
    return ir / np.sqrt(np.sum(ir**2) / 2)


def reverb(bus, wet, seconds=2.4):
    ir = reverb_ir(seconds)
    out = np.stack([signal.fftconvolve(bus[c], ir[c])[: bus.shape[1]] for c in range(2)])
    return bus + out * wet


# ---------------------------------------------------------------------------- music

music = np.zeros((2, N))

# 1) HOOK — dissonant drone (A + B♭ minor second, high E/F shimmer), heartbeat on the beat, riser.
hook_end = fr(150)
n = hook_end + int(0.25 * SR)
t = np.arange(n) / SR
drone = 0.5 * saw(midi(m("A1")), n, 10) + 0.42 * saw(midi(m("A#1")), n, 10) + 0.25 * saw(midi(m("E2")), n, 8)
drone = lp(drone, 520) * np.minimum(1, t / 1.2)
shimmer = (np.sin(2 * np.pi * midi(m("E5")) * t) + 0.8 * np.sin(2 * np.pi * midi(m("F5")) * t)) * (0.5 + 0.5 * np.sin(2 * np.pi * 0.7 * t))
shimmer *= np.minimum(1, t / 2.5) * db(-14)
tail = np.ones(n)
tail[hook_end:] = np.linspace(1, 0, n - hook_end)
add(music, stereo(drone * db(-13) * tail, -0.15) + stereo(shimmer * tail, 0.3), 0)
for b in range(0, 150, BEAT):  # heartbeat: the rework loops pulse on these
    k = int(0.32 * SR)
    tt = np.arange(k) / SR
    f = 38 + 34 * np.exp(-tt * 18)
    thump = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-tt * 11)
    thump += 0.5 * np.sin(2 * np.pi * np.cumsum(f * 1.06) / SR) * np.exp(-tt * 11)  # beating = unease
    add(music, stereo(thump * db(-11)), fr(b))
r0, r1 = fr(TL["beats"]["hookRiser"]), fr(150)
k = r1 - r0
tt = np.arange(k) / SR
riser = sweep_filter(rng.standard_normal(k), 300, 7000) * (tt / tt[-1]) ** 2.2
riser += 0.25 * np.sin(2 * np.pi * np.cumsum(np.geomspace(220, 880, k)) / SR) * (tt / tt[-1]) ** 2
add(music, stereo(riser * db(-11)), r0)

# 2) Harmony from 5s on: A minor colour, tension through the morph, groove in proof, C major resolve.
CHORDS = [
    (150, 200, ["A2", "E3", "B3", "C4"], 1400, -21),
    (200, 300, ["A2", "E3", "G3", "C4", "B4"], 1500, -20),
    (300, 400, ["F2", "C3", "E3", "A3", "G4"], 1500, -20),
    (400, 500, ["A2", "E3", "G3", "C4", "B4"], 1600, -20),
    (500, 600, ["D3", "F3", "A3", "C4", "E4"], 1700, -20),
    (600, 700, ["F2", "C3", "E3", "A3", "B3"], 1900, -19),
    (700, 800, ["G2", "D3", "E3", "B3", "D4"], 2500, -19),
    (800, 900, ["E2", "B2", "E3", "A3", "B3"], 3400, -18),
    (900, 1000, ["A2", "E3", "A3", "C4", "E4"], 2600, -19),
    (1000, 1100, ["F2", "C3", "F3", "A3", "C4"], 2600, -19),
    (1100, 1200, ["C3", "G3", "C4", "E4", "G4"], 2600, -19),
    (1200, 1350, ["G2", "D3", "G3", "B3", "D4"], 2800, -19),
    (1350, 1425, ["F2", "C3", "A3", "E4"], 900, -24),
    (1425, 1800, ["C2", "G2", "E3", "B3", "D4", "G4"], 3200, -19.5),
]
pads = np.zeros((2, N))
for f0, f1, notes, cutoff, gain in CHORDS:
    start = fr(f0)
    rel = 0.9 if f1 < 1800 else 0.01
    n = fr(f1) - start + int(rel * SR)
    chord = np.zeros((2, n))
    for i, name in enumerate(notes):
        base = midi(m(name))
        v = sum(saw(base * 2 ** (c / 1200), n, 12) for c in (-7, 0, 7)) / 3
        chord += stereo(v, (-0.5 + i / max(1, len(notes) - 1)) * 0.7)
    attack = 0.05 if f0 in (900, 1425) else 0.5
    e = env_adsr(n, attack, rel if f1 < 1800 else 0.01)
    chord = np.stack([lp(chord[c], cutoff) for c in range(2)]) * e * db(gain)
    add(pads, chord, start)

# End-card tail: hold the resolve, fade over the last two seconds.
fade = np.ones(N)
fade[fr(1740) :] = np.linspace(1, 0, N - fr(1740)) ** 1.5
pads *= fade

# 3) Plucked arpeggio on 8ths (12.5 frames) — the "calm precision" pulse.
plucks = np.zeros((2, N))
pattern = [0, 2, 1, 3, 2, 4, 3, 1]


def chord_at(frame):
    for f0, f1, notes, _, _ in CHORDS:
        if f0 <= frame < f1:
            return notes
    return CHORDS[-1][2]


def pluck(freq, dur=0.5, bright=0.35):
    k = int(dur * SR)
    tt = np.arange(k) / SR
    x = np.sin(2 * np.pi * freq * tt) + bright * np.sin(2 * np.pi * 2 * freq * tt) * np.exp(-tt * 14)
    return x * np.exp(-tt * 7) * np.minimum(1, tt / 0.003)


step = 0
for start, end, every, gain in [(200, 600, 12.5, -24), (600, 900, 12.5, -22), (900, 1350, 12.5, -21), (1450, 1740, 25, -25)]:
    f = start
    while f < end:
        notes = chord_at(int(f))
        name = notes[pattern[step % len(pattern)] % len(notes)]
        p = pluck(midi(m(name) + 12))
        add(plucks, stereo(p * db(gain), 0.35 if step % 2 else -0.35), fr(f))
        step += 1
        f += every
# dotted-8th ping-pong delay on the plucks
d = int(0.625 * SR)
echo = np.zeros_like(plucks)
echo[0, d:] = plucks[1, :-d] * 0.32
echo[1, d:] = plucks[0, :-d] * 0.32
echo[0, 2 * d :] += plucks[0, : -2 * d] * 0.12
plucks = plucks + np.stack([lp(echo[0], 3500), lp(echo[1], 3500)])

# 4) Low end: sub on each bar, soft kick on downbeats (demo) and every beat (proof), offbeat hats in proof.
low = np.zeros((2, N))
for f0, f1, notes, _, _ in CHORDS:
    if f0 < 200 or f0 == 1350:
        continue
    root = midi(m(notes[0]) - 12)
    k = fr(f1) - fr(f0)
    tt = np.arange(k) / SR
    sub = np.sin(2 * np.pi * root * tt) * env_adsr(k, 0.08, 0.4) * db(-17)
    add(low, stereo(sub), fr(f0))


def kick(gain):
    k = int(0.28 * SR)
    tt = np.arange(k) / SR
    f = 45 + 70 * np.exp(-tt * 30)
    return stereo(np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-tt * 13) * db(gain))


for f in range(200, 600, 100):
    add(low, kick(-17), fr(f))
for f in range(600, 900, 50):
    add(low, kick(-17), fr(f))
for f in range(900, 1350, BEAT):
    add(low, kick(-14), fr(f))
for f in np.arange(912.5, 1350, BEAT):
    k = int(0.05 * SR)
    hat = hp(rng.standard_normal(k), 7500) * np.exp(-np.arange(k) / SR * 70)
    add(low, stereo(hat * db(-31), 0.25), fr(f))

# 5) Build into the proof cut, downlifter into the end-card "breath".
k = fr(900) - fr(840)
tt = np.arange(k) / SR
add(music, stereo(sweep_filter(rng.standard_normal(k), 400, 8000) * (tt / tt[-1]) ** 2 * db(-16)), fr(840))
k = int(1.6 * SR)
tt = np.arange(k) / SR
add(music, stereo(sweep_filter(rng.standard_normal(k), 5000, 200) * np.exp(-tt * 2.2) * db(-18)), fr(1350))

bed = reverb(pads + plucks, 0.28, 2.6)
music += bed + low

# ---------------------------------------------------------------------------- sfx

sfx = np.zeros((2, N))


def boom(dur, f_hi, f_lo, decay):
    k = int(dur * SR)
    tt = np.arange(k) / SR
    f = f_lo + (f_hi - f_lo) * np.exp(-tt * 9)
    return np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-tt * decay)


def noise_burst(dur, cutoff, decay):
    k = int(dur * SR)
    tt = np.arange(k) / SR
    return lp(rng.standard_normal(k), cutoff) * np.exp(-tt * decay)


def bell(freq, dur=1.6, decay=3.2):
    k = int(dur * SR)
    tt = np.arange(k) / SR
    x = sum(a * np.sin(2 * np.pi * freq * r * tt) * np.exp(-tt * decay * r**0.5) for r, a in [(1, 1), (2.0, 0.45), (3.01, 0.25), (4.2, 0.12)])
    return x * np.minimum(1, tt / 0.002)


def whoosh(dur, f0, f1, pan0=-0.7, pan1=0.7):
    k = int(dur * SR)
    tt = np.arange(k) / SR
    x = sweep_filter(rng.standard_normal(k), f0, f1, q=0.5) * np.sin(np.pi * tt / tt[-1]) ** 1.6
    pan = np.linspace(pan0, pan1, k)
    return np.stack([x * np.cos((pan + 1) * np.pi / 4) * 1.414, x * np.sin((pan + 1) * np.pi / 4) * 1.414])


def click():
    k = int(0.03 * SR)
    tt = np.arange(k) / SR
    x = hp(rng.standard_normal(k), 2500) * np.exp(-tt * 900) * 0.8 + np.sin(2 * np.pi * 2300 * tt) * np.exp(-tt * 260) * 0.5
    return x


def tick(freq):
    k = int(0.025 * SR)
    tt = np.arange(k) / SR
    return np.sin(2 * np.pi * freq * tt) * np.exp(-tt * 220)


def tick_times(f0, f1, count=26):
    """ticks at equal value steps of an expo-out count-up: dense early, sparse late"""
    v = np.linspace(0, 0.995, count)
    u = -np.log2(1 - v) / 10 * 1.3
    return f0 + np.clip(u, 0, 1) * (f1 - f0)


def mixn(*parts):
    """sum mono signals of different lengths (zero-padded)"""
    n = max(len(x) for x in parts)
    out = np.zeros(n)
    for x in parts:
        out[: len(x)] += x
    return out


chip_n = absorb_n = 0
for cue in TL["sfx"]:
    f, kind, g = cue["frame"], cue["type"], db(cue.get("gain", -12))
    s = fr(f)
    if kind == "hitBig":
        x = mixn(boom(1.8, 110, 32, 2.2), 0.5 * noise_burst(0.6, 3000, 7), 0.25 * noise_burst(0.12, 9000, 30))
        add(sfx, reverb(stereo(x * g), 0.35, 2.0), s)
    elif kind == "hitMid":
        x = mixn(boom(1.1, 100, 38, 3.4), 0.35 * noise_burst(0.35, 2500, 10))
        add(sfx, reverb(stereo(x * g), 0.3, 1.6), s)
    elif kind == "hitSoft":
        x = mixn(boom(0.8, 90, 40, 5), 0.2 * noise_burst(0.3, 1800, 12))
        add(sfx, stereo(x * g), s)
    elif kind == "uiClick":
        add(sfx, stereo(click() * g, 0.15), s)
    elif kind == "whooshSoft":
        add(sfx, whoosh(0.55, 500, 2600) * g, s - int(0.18 * SR))
    elif kind == "whooshCollapse":
        w = whoosh(1.4, 3200, 180, 0.8, -0.1) + 0.6 * whoosh(1.4, 900, 120, -0.6, 0.1)
        sw = boom(1.4, 70, 40, 2.0)
        add(sfx, w * g + stereo(sw * g * 0.6), s)
    elif kind == "typing":
        ff = float(f)
        while ff < cue["until"]:
            k = int(0.008 * SR)
            x = bp(rng.standard_normal(k), 1800, 5200) * np.exp(-np.arange(k) / SR * 600)
            add(sfx, stereo(x * g * rng.uniform(0.6, 1.0), rng.uniform(-0.2, 0.2)), fr(ff))
            ff += rng.uniform(1.6, 3.2)
    elif kind in ("countTicks", "counterTicks"):
        times = tick_times(f, cue["until"])
        for i, tf in enumerate(times):
            add(sfx, stereo(tick(1500 + 1100 * i / len(times)) * g, 0.1), fr(tf))
    elif kind == "ding":
        add(sfx, reverb(stereo(mixn(bell(midi(m("E6"))), 0.6 * bell(midi(m("B6")))) * g), 0.25, 1.8), s)
    elif kind == "chipPop":
        k = int(0.09 * SR)
        tt = np.arange(k) / SR
        base = midi(m("A5") + [0, 2, 4, 7, 9][chip_n % 5])
        x = np.sin(2 * np.pi * np.cumsum(base * (0.75 + 0.25 * np.minimum(1, tt / 0.02))) / SR) * np.exp(-tt * 38)
        c = click()
        x[: len(c)] += 0.3 * c
        add(sfx, stereo(x * g, 0.2), s)
        chip_n += 1
    elif kind == "fracture":
        k = int(0.6 * SR)
        x = np.zeros(k)
        for _ in range(16):
            o = int(rng.uniform(0, 0.25) * SR)
            fq = rng.uniform(2200, 6500)
            kk = int(0.25 * SR)
            tt = np.arange(kk) / SR
            ping = np.sin(2 * np.pi * fq * tt) * np.exp(-tt * rng.uniform(18, 35)) * rng.uniform(0.3, 0.8)
            x[o : o + kk] += ping[: k - o]
        x = mixn(x, 0.5 * hp(noise_burst(0.6, 12000, 14), 3000))
        add(sfx, reverb(stereo(x * g * 0.5), 0.3, 1.4), s)
    elif kind == "absorb":
        k = int(0.14 * SR)
        tt = np.arange(k) / SR
        f_hi = midi(m("E5") + [0, 2, 4, 7, 9][absorb_n % 5])
        fq = f_hi * (1 - 0.45 * tt / tt[-1])
        x = np.sin(2 * np.pi * np.cumsum(fq) / SR) * np.exp(-tt * 20) * np.minimum(1, tt / 0.004)
        add(sfx, stereo(x * g, 0.5), s)
        absorb_n += 1
    elif kind == "wordHit":
        base = midi(m("A4") + cue.get("pitch", 0))
        x = mixn(bell(base, 1.4, 4.0), 0.6 * boom(0.4, 90, 50, 9))
        add(sfx, reverb(stereo(x * g), 0.3, 1.8), s)
    elif kind == "lineDraw":
        k = fr(cue["until"]) - s + int(0.3 * SR)
        tt = np.arange(k) / SR
        fq = np.geomspace(500, 1500, k)
        x = np.sin(2 * np.pi * np.cumsum(fq) / SR) * (0.6 + 0.4 * np.sin(2 * np.pi * 9 * tt))
        x += 0.5 * sweep_filter(rng.standard_normal(k), 1500, 6000)
        x *= np.sin(np.pi * np.minimum(1, tt / tt[-1])) ** 1.2
        add(sfx, whoosh(len(tt) / SR, 1200, 4000, -0.8, 0.0) * g * 0.6 + stereo(x * g * 0.5), s)
    elif kind == "resolve":
        lead = int(0.45 * SR)
        swell = sweep_filter(rng.standard_normal(lead), 800, 9000) * np.linspace(0, 1, lead) ** 3
        add(sfx, stereo(swell * g * 0.7), s - lead)
        x = mixn(boom(2.2, 100, 33, 1.8) * 0.9, *[bell(midi(m(name)), 2.2, 1.6) * 0.35 for name in ["C5", "E5", "G5", "B5", "D6"]])
        add(sfx, reverb(stereo(x * g), 0.4, 2.8), s)

# ---------------------------------------------------------------------------- master

meter = pyloudnorm.Meter(SR)


def lufs(x):
    return meter.integrated_loudness(x.T)


def true_peak_env(x):
    up = np.stack([signal.resample_poly(x[c], 4, 1) for c in range(2)])
    env = np.max(np.abs(up), axis=0).reshape(-1, 4).max(axis=1)
    return env[: x.shape[1]]


def limiter_gain(x, ceiling_db, lookahead=0.003, release=0.08):
    ceil = db(ceiling_db)
    env = true_peak_env(x)
    req = np.minimum(1.0, ceil / np.maximum(env, 1e-9))
    red = maximum_filter1d(1 - req, size=int(lookahead * SR) * 2 + 1)
    a = np.exp(-1 / (release * SR))
    smooth = signal.lfilter([1 - a], [1, -a], red)
    red = np.maximum(red, smooth)
    return 1 - red


for it in range(6):
    mix = music + sfx
    g = db(TARGET_LUFS - lufs(mix))
    music *= g
    sfx *= g
    lim = limiter_gain(music + sfx, CEILING_DBTP)
    music *= lim
    sfx *= lim

print(f"limiter: max gain reduction {-20 * np.log10(lim.min()):.1f} dB, active on {np.mean(lim < 0.999) * 100:.1f}% of samples")
mix = music + sfx
tp = 20 * np.log10(np.max(true_peak_env(mix)))
print(f"mix: {lufs(mix):.2f} LUFS integrated, {tp:.2f} dBTP true peak, {N / SR:.2f}s")

out = ROOT / "public" / "audio"
out.mkdir(parents=True, exist_ok=True)


def write(path, x):
    dither = (rng.uniform(-1, 1, x.shape) + rng.uniform(-1, 1, x.shape)) / 32768
    pcm = np.clip((x + dither) * 32767, -32768, 32767).astype(np.int16)
    wavfile.write(path, SR, pcm.T)
    print("wrote", path.relative_to(ROOT))


write(out / "music.wav", music)
write(out / "sfx.wav", sfx)
