// Audio is opt-in. Saved preference only controls sound; it is separate from the game save.
const AUDIO_KEY = "plot-twist-sound-v1";
const MUSIC = "public/assets/audio/morning-air-retro.wav";
const STEP = "public/assets/audio/step-dirt.wav";
// CC0 Freesound previews are bundled so coffee sounds also work offline.
const POUR = "public/assets/audio/coffee-pour-freesound.mp3";
const CUP = "public/assets/audio/cup-set-down-freesound.mp3";

let enabled = false;
try { enabled = localStorage.getItem(AUDIO_KEY) === "on"; } catch { /* Storage can be disabled. */ }
let context;
let music;
const activeClips = new Set();

export const soundEnabled = () => enabled;

function getMusic() {
  if (!music) {
    music = new Audio(MUSIC);
    music.loop = true;
    music.volume = .12;
    music.preload = "none";
  }
  return music;
}

function tone(frequency, duration = .09, type = "square", volume = .025) {
  if (!enabled || document.hidden) return;
  try {
    context ||= new (window.AudioContext || window.webkitAudioContext)();
    if (context.state === "suspended") void context.resume();
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    oscillator.type = type;
    oscillator.frequency.setValueAtTime(frequency, context.currentTime);
    gain.gain.setValueAtTime(volume, context.currentTime);
    gain.gain.exponentialRampToValueAtTime(.001, context.currentTime + duration);
    oscillator.connect(gain).connect(context.destination);
    oscillator.start();
    oscillator.stop(context.currentTime + duration);
  } catch { /* Keep the game playable if audio is unavailable. */ }
}

function clip(source, volume, maximumMs) {
  if (!enabled || document.hidden) return;
  try {
    const player = new Audio(source);
    player.volume = volume;
    activeClips.add(player);
    player.addEventListener("ended", () => activeClips.delete(player), { once: true });
    void player.play().catch(() => activeClips.delete(player));
    if (maximumMs) setTimeout(() => { player.pause(); activeClips.delete(player); }, maximumMs);
  } catch { /* Keep the game playable if audio is unavailable. */ }
}

export function setSoundEnabled(value) {
  enabled = Boolean(value);
  try { localStorage.setItem(AUDIO_KEY, enabled ? "on" : "off"); } catch { /* Optional preference. */ }
  if (enabled) {
    void getMusic().play().catch(() => {});
    tone(660, .08, "triangle");
  } else {
    music?.pause();
    for (const player of activeClips) player.pause();
    activeClips.clear();
  }
}

export function resumeSound() {
  if (enabled && !document.hidden && getMusic().paused) void getMusic().play().catch(() => {});
}

export function playSound(kind, detail = {}) {
  if (!enabled) return;
  resumeSound();
  if (kind === "select") { tone(310, .035, "triangle", .014); return; }
  if (kind === "coffee-ingredient") { tone(detail.correct ? 520 : 170, .08, detail.correct ? "triangle" : "sawtooth"); return; }
  if (kind === "coffee-brew") { clip(POUR, .23, 1900); tone(detail.grade === 2 ? 800 : 410, .13, "triangle"); return; }
  if (kind === "coffee-deliver") { clip(CUP, .4, 1650); setTimeout(() => clip(STEP, .3, 280), 160); tone(detail.correct ? 740 : 210, .16, "triangle"); return; }
  if (kind === "twist") { tone(300, .3, "sawtooth", .035); setTimeout(() => tone(590, .2, "triangle"), 130); return; }
  if (kind === "buy" || kind === "sell" || kind === "build" || kind === "goal" || kind === "coffee-ready") {
    tone(kind === "goal" ? 880 : kind === "buy" ? 580 : 690, .16, "triangle");
    setTimeout(() => tone(kind === "goal" ? 1175 : 900, .18, "triangle"), 100);
    return;
  }
  if (kind === "no-money") { tone(180, .14, "sawtooth"); return; }
  tone(420, .045, "triangle", .018);
}

document.addEventListener("visibilitychange", () => {
  if (document.hidden) music?.pause();
  else resumeSound();
});
