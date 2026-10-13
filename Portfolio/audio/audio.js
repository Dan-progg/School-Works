/* =============================================================
   audio.js — shared sound engine for the whole portfolio
   • portfolio background music (bgm.mp3) — loops quietly
   • Neon Courier difficulty tracks (4 mp3s in Difficulty bgm/) — loops per stage
   • sound effects via WebAudio (jump, land, hit, etc.)
   • corner dock + in-game mute buttons
   Exposes: window.CJ.audio
   ============================================================= */
(function () {
  'use strict';
  const CJ = (window.CJ = window.CJ || {});
  if (CJ.audio) return;
  const A = (CJ.audio = {});

  // ---- shared state ----
  let audioCtx = null;
  let soundOn = true;      // SFX (WebAudio)
  let musicOn = true;      // difficulty music
  let bgmOn = true;        // portfolio BGM

  // ---- DOM elements ----
  const gameModal = document.getElementById('gameModal');
  const bgmToggle = document.getElementById('bgmToggle');
  const bgmVolSlider = document.getElementById('bgmVolume');
  const soundToggle = document.getElementById('soundToggle'); // in game modal

  // ---- Portfolio BGM (bgm.mp3) ----
  const bgm = new Audio('bgm.mp3');
  bgm.loop = true;
  bgm.volume = 0.1;
  bgm.preload = 'auto';
  let bgmAllowed = false;

  function bgmPlay() { if (bgmAllowed && bgmOn) { const p = bgm.play(); if (p?.catch) p.catch(() => {}); } }
  function bgmPause() { try { bgm.pause(); } catch (e) {} }
  function bgmUnlock() { bgmAllowed = true; bgmPlay(); }
  ['pointerdown', 'keydown', 'touchstart', 'click'].forEach(ev => window.addEventListener(ev, bgmUnlock, { once: true }));

  // Pause portfolio BGM when game modal is open / tab hidden
  if (gameModal) {
    const syncBgm = () => { if (!bgmAllowed) return; gameModal.classList.contains('active') ? bgmPause() : bgmPlay(); };
    new MutationObserver(syncBgm).observe(gameModal, { attributes: true, attributeFilter: ['class'] });
  }
  document.addEventListener('visibilitychange', () => {
    if (!bgmAllowed) return;
    document.hidden ? bgmPause() : (gameModal?.classList.contains('active') ? bgmPause() : bgmPlay());
  });

  // ---- Difficulty Music (4 tracks for 5 stages) ----
  const difficultyTracks = [
    new Audio('Difficulty bgm/difficulty 1.mp3'), // stage 1 (levels 1-2)
    new Audio('Difficulty bgm/difficulty 2.mp3'), // stage 2 (levels 3-4)
    new Audio('Difficulty bgm/difficulty 3.mp3'), // stage 3 (levels 5-6)
    new Audio('Difficulty bgm/difficulty 4.mp3'), // stage 4 (levels 7-8) & stage 5 (9-10)
  ];
  difficultyTracks.forEach(a => { a.loop = true; a.volume = 0.35; a.preload = 'auto'; });
  let currentDiffTrack = null;
  let diffMusicAllowed = false;

  function diffMusicUnlock() {
    diffMusicAllowed = true;
    if (musicOn && currentDiffTrack) currentDiffTrack.play().catch(() => {});
  }
  ['pointerdown', 'keydown', 'touchstart', 'click'].forEach(ev => window.addEventListener(ev, diffMusicUnlock, { once: true }));

  function stopDiffMusic() { if (currentDiffTrack) { currentDiffTrack.pause(); currentDiffTrack.currentTime = 0; currentDiffTrack = null; } }

  function playDiffMusic(stage) {
    stopDiffMusic();
    if (!musicOn || !diffMusicAllowed) return;
    const idx = Math.min(Math.max(1, stage), 5) - 1;
    const trackIdx = idx >= 4 ? 3 : idx; // stage 5 uses track 4
    console.log(`[Audio] Switching to difficulty track ${trackIdx + 1} for stage ${stage}`);
    currentDiffTrack = difficultyTracks[trackIdx];
    currentDiffTrack.currentTime = 0;
    currentDiffTrack.play().catch(e => console.log('[Audio] Play failed:', e));
  }

  // Called by game.js when level loads
  function setMusicStage(stage) {
    console.log(`[Audio] setMusicStage called with stage: ${stage}`);
    playDiffMusic(stage);
  }

  // ---- WebAudio SFX ----
  function ensureAudioCtx() {
    if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    if (audioCtx.state === 'suspended') audioCtx.resume();
  }

  function tone(freq, dur, type, vol) {
    ensureAudioCtx(); if (!soundOn) return;
    try {
      const osc = audioCtx.createOscillator(), gain = audioCtx.createGain();
      osc.type = type || 'sine'; osc.frequency.value = freq;
      gain.gain.setValueAtTime(0.0001, audioCtx.currentTime);
      gain.gain.linearRampToValueAtTime(vol || 0.1, audioCtx.currentTime + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.0001, audioCtx.currentTime + dur);
      osc.connect(gain); gain.connect(audioCtx.destination);
      osc.start(audioCtx.currentTime); osc.stop(audioCtx.currentTime + dur + 0.05);
    } catch (e) {}
  }

  function noiseBurst(vol, dur, filterType, filterFreq, freq2, q) {
    ensureAudioCtx(); if (!soundOn) return;
    try {
      const buf = audioCtx.createBuffer(1, audioCtx.sampleRate * dur, audioCtx.sampleRate);
      const data = buf.getChannelData(0);
      for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
      const src = audioCtx.createBufferSource(); src.buffer = buf;
      const filt = audioCtx.createBiquadFilter(); filt.type = filterType || 'bandpass'; filt.frequency.value = filterFreq || 2000; filt.Q.value = q || 1;
      const gain = audioCtx.createGain();
      gain.gain.setValueAtTime(vol || 0.1, audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.0001, audioCtx.currentTime + dur);
      if (freq2) { filt.frequency.setValueAtTime(filterFreq, audioCtx.currentTime); filt.frequency.exponentialRampToValueAtTime(freq2, audioCtx.currentTime + dur); }
      src.connect(filt); filt.connect(gain); gain.connect(audioCtx.destination);
      src.start(audioCtx.currentTime); src.stop(audioCtx.currentTime + dur + 0.05);
    } catch (e) {}
  }

  function sweep(f1, f2, dur, vol, type) {
    ensureAudioCtx(); if (!soundOn) return;
    try {
      const osc = audioCtx.createOscillator(), gain = audioCtx.createGain(), filt = audioCtx.createBiquadFilter();
      osc.type = type || 'sawtooth'; osc.frequency.setValueAtTime(f1, audioCtx.currentTime); osc.frequency.exponentialRampToValueAtTime(f2, audioCtx.currentTime + dur);
      filt.type = 'lowpass'; filt.frequency.setValueAtTime(f2 * 4, audioCtx.currentTime); filt.frequency.exponentialRampToValueAtTime(f2 * 1.5, audioCtx.currentTime + dur); filt.Q.value = 3;
      gain.gain.setValueAtTime(0.0001, audioCtx.currentTime); gain.gain.linearRampToValueAtTime(vol || 0.1, audioCtx.currentTime + 0.01); gain.gain.exponentialRampToValueAtTime(0.0001, audioCtx.currentTime + dur);
      osc.connect(filt); filt.connect(gain); gain.connect(audioCtx.destination);
      osc.start(audioCtx.currentTime); osc.stop(audioCtx.currentTime + dur + 0.05);
    } catch (e) {}
  }

  // Main SFX dispatcher — called by game.js and fighter.js
  function sfx(name) {
    if (!soundOn) return;
    switch (name) {
      case 'jump':     sweep(400, 800, 0.12, 0.08, 'sine'); break;
      case 'land':     tone(150, 0.08, 'sine', 0.06); break;
      case 'pickup':   sweep(600, 1200, 0.1, 0.12, 'square'); break;
      case 'shoot':    noiseBurst(0.12, 0.06, 'bandpass', 1800, 400, 2); break;
      case 'hit':      noiseBurst(0.25, 0.08, 'bandpass', 1200, 300, 2); tone(60, 0.15, 'sine', 0.2); break;
      case 'fall':     sweep(300, 80, 0.3, 0.15, 'sawtooth'); break;
      case 'celebrate': sweep(800, 1600, 0.3, 0.15, 'square'); break;
      case 'complete': sweep(500, 2000, 0.5, 0.2, 'square'); break;
      default: break;
    }
  }

  // ---- UI sync ----
  function refreshAudio() {
    const sfxIcon = soundOn ? '<i class="fas fa-volume-up"></i>' : '<i class="fas fa-volume-mute"></i>';
    const musicIcon = musicOn ? '<i class="fas fa-music"></i>' : '<i class="fas fa-ban"></i>';
    const bgmIcon = bgmOn ? '<i class="fas fa-music"></i>' : '<i class="fas fa-ban"></i>';

    if (soundToggle) { soundToggle.innerHTML = sfxIcon; soundToggle.classList.toggle('muted', !soundOn); }
    if (bgmToggle) { bgmToggle.innerHTML = bgmIcon; bgmToggle.classList.toggle('muted', !bgmOn); }
    // in-game music toggle (uses same icon as musicOn)
    const inGameMusicBtn = document.getElementById('musicToggle');
    if (inGameMusicBtn) { inGameMusicBtn.innerHTML = musicIcon; inGameMusicBtn.classList.toggle('muted', !musicOn); }
  }

  // BGM toggle (portfolio)
  if (bgmToggle) {
    bgmToggle.addEventListener('click', () => {
      bgmOn = !bgmOn; bgmAllowed = true; bgmOn ? bgmPlay() : bgmPause(); refreshAudio();
    });
  }

  // BGM volume slider
  if (bgmVolSlider) {
    try { bgmVolSlider.value = String(bgm.volume); } catch (e) {}
    bgmVolSlider.addEventListener('input', () => { bgm.volume = Math.max(0, Math.min(1, parseFloat(bgmVolSlider.value))); bgmAllowed = true; if (bgmOn) bgmPlay(); });
    bgmVolSlider.addEventListener('change', () => { bgmAllowed = true; if (bgmOn) bgmPlay(); });
  }

  // SFX toggle (in game modal)
  if (soundToggle) {
    soundToggle.addEventListener('click', () => {
      soundOn = !soundOn; refreshAudio(); if (soundOn) sfx('pickup');
    });
  }

  // In-game music toggle
  const inGameMusicBtn = document.getElementById('musicToggle');
  if (inGameMusicBtn) {
    inGameMusicBtn.addEventListener('click', () => {
      musicOn = !musicOn;
      if (musicOn && diffMusicAllowed) playDiffMusic(CJ.game?.currentStage || 1);
      else stopDiffMusic();
      refreshAudio();
    });
  }

  // ---- public API ----
  A.sfx = sfx;
  A.startMusic = diffMusicUnlock; // kept for compat
  A.stopMusic = stopDiffMusic;
  A.setMusicStage = setMusicStage;
  A.isSoundOn = () => soundOn;
  A.isMusicOn = () => musicOn;
  A.isBgmOn = () => bgmOn;
  A.setBgmVolume = v => { try { bgm.volume = Math.max(0, Math.min(1, v)); } catch (e) {} };
  A.getBgmVolume = () => bgm.volume;
  A.refreshAudio = refreshAudio;
})();