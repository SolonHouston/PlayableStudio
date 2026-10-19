(() => {
  'use strict';

  const AUDIO_PATH = '../assets/audio/beat-blitz-2.mp3';
  const STORAGE_KEY = 'one-second-eight-blades:bgm-v1';
  const VOLUME = .45;
  const SAVE_INTERVAL_MS = 250;
  const audio = new Audio(AUDIO_PATH);
  audio.preload = 'auto';
  audio.loop = true;
  audio.volume = VOLUME;

  let started = false;
  let restored = false;
  let lastSavedAt = -Infinity;

  function readSavedState() {
    try {
      const value = JSON.parse(sessionStorage.getItem(STORAGE_KEY) || 'null');
      if (!value || !Number.isFinite(value.time) || value.time < 0) return null;
      return {started: Boolean(value.started), time: value.time};
    } catch (_) {
      return null;
    }
  }

  const savedState = readSavedState();
  started = Boolean(savedState?.started);

  function restorePosition() {
    if (restored || !savedState) return;
    const duration = Number.isFinite(audio.duration) && audio.duration > 0 ? audio.duration : null;
    try {
      audio.currentTime = duration ? savedState.time % duration : savedState.time;
      restored = true;
    } catch (_) {}
  }

  function persist(force = false) {
    if (!started) return;
    const now = performance.now();
    if (!force && now - lastSavedAt < SAVE_INTERVAL_MS) return;
    lastSavedAt = now;
    try {
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify({
        started: true,
        time: Number.isFinite(audio.currentTime) ? audio.currentTime : 0,
      }));
    } catch (_) {}
  }

  async function start() {
    started = true;
    if (audio.readyState >= 1) restorePosition();
    try {
      await audio.play();
      persist(true);
      return true;
    } catch (_) {
      persist(true);
      return false;
    }
  }

  function activate() {
    start();
  }

  audio.addEventListener('loadedmetadata', restorePosition, {once: true});
  audio.addEventListener('timeupdate', () => persist(false));
  for (const eventName of ['pointerdown', 'touchstart', 'mousedown', 'keydown'])
    document.addEventListener(eventName, activate, {capture: true, passive: true});
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) persist(true);
  });
  window.addEventListener('pagehide', () => persist(true));
  window.addEventListener('beforeunload', () => persist(true));

  if (started) {
    if (audio.readyState >= 2) start();
    else audio.addEventListener('canplay', start, {once: true});
  }

  window.__bgmController = Object.freeze({
    start,
    persist() { persist(true); },
    state() {
      return {
        source: AUDIO_PATH,
        storageKey: STORAGE_KEY,
        started,
        paused: audio.paused,
        currentTime: audio.currentTime,
        duration: audio.duration,
        readyState: audio.readyState,
        networkState: audio.networkState,
        errorCode: audio.error?.code || null,
        loop: audio.loop,
        volume: audio.volume,
      };
    },
  });
})();
