/* =============================================================
   audio.js — shared sound engine for the whole portfolio
   • fight + game sound effects  (window.CJ.audio.sfx)
   • looping portfolio background music (bgm.mp3)
   • Neon Courier trap soundtrack
   • the always-visible corner dock + mute buttons
   Exposes: window.CJ.audio
   ============================================================= */
(function () {
  'use strict';
  const CJ = (window.CJ = window.CJ || {});
  if (CJ.audio) return;
  const A = (CJ.audio = {});

  // ---- shared audio state ----
  let audioCtx = null;
  let soundOn = true;
  let musicOn = true;

  // ---- elements used by the mute buttons ----
  const gameModal = document.getElementById('gameModal');
  const soundToggle = null;
  const musicToggle = null;

  // ---- Neon Courier soundtrack state ----

  // ===== PORTFOLIO BACKGROUND MUSIC =====
  // Loops the uploaded track quietly so the fight sound effects stay dominant.
  // Browsers block autoplay until the first gesture, so we arm it then.
  const bgm = new Audio('bgm.mp3');
  bgm.loop = true;         // play on a continuous loop
  bgm.volume = 0.1;        // 10%: a quiet bed under the fight SFX
  bgm.preload = 'auto';
  let bgmAllowed = false;  // becomes true once the user has interacted
  let bgmOn = true;        // user preference: is the BGM turned on?

  // Preload real fight SFX samples (if present). Paths are relative to audio.js
  
  const sfxSamples = {};
  function loadSample(key, fileName) {
    try {
      const a = new Audio(sfxPath(fileName));
      a.preload = 'auto';
      a.volume = 0.9;
      sfxSamples[key] = a;
    } catch (e) {}
  }
  // Map common fight events to uploaded samples
  loadSample('punch', 'Punch.mp3');
  loadSample('punchHeavy', 'Punch.mp3');
  loadSample('slash', 'Katana Swing.mp3');
  loadSample('fireball', 'fireball.mp3');
  loadSample('fireSlash', 'fire slash.mp3');
  loadSample('santoryu', 'Purgatory Onigiri.mp3');

  function bgmPlay() {
    if (!bgmAllowed || !bgmOn) return;
    const p = bgm.play();
    if (p && p.catch) p.catch(function () { /* autoplay still blocked — ignore */ });
  }
  function bgmPause() {
    try { bgm.pause(); } catch (e) { /* ignore */ }
  }
  function bgmUnlock() {
    bgmAllowed = true;
    bgmPlay();
  }
  ['pointerdown', 'keydown', 'touchstart', 'click'].forEach(function (ev) {
    window.addEventListener(ev, bgmUnlock, { once: true });
  });

  // ===== duck the BGM while the courier game is open / tab hidden =====
  // Duck the portfolio BGM whenever the courier game is open (it has its own track)
  if (gameModal) {
    const syncBgm = function () {
      if (!bgmAllowed) return;
      if (gameModal.classList.contains('active')) bgmPause();
      else bgmPlay();
    };
    new MutationObserver(syncBgm).observe(gameModal, { attributes: true, attributeFilter: ['class'] });
  }
  // Pause the BGM while the tab is hidden, resume when it returns
  document.addEventListener('visibilitychange', function () {
    if (!bgmAllowed) return;
    if (document.hidden) bgmPause();
    else if (!(gameModal && gameModal.classList.contains('active'))) bgmPlay();
  });
  const music = {
    playing: false,
    timer: null,
    step: 0,
    nextTime: 0,
    master: null,
    noiseBuffer: null,
    distCurve: null,
    bassCurve: null,
    track: null,
    prevBass: null,
    stage: 1,
    intensity: 0,
    bpm: 116
  };
  // ---- Tiny WebAudio sound effects (self-contained, no asset files) ----
  function tone() { }

  // a short filtered noise burst — the body of a punch, slash or explosion.
  // freq2 + q are optional: a moving cutoff + resonance is what makes a burst
  // read as a real impact instead of a flat hiss.
  function noiseBurst() { }

  // A pitched "voice" that slides from f1 → f2 and is softened by a closing
  // lowpass. Sweeping + filtering is what keeps a tone from sounding buzzy.
  function sweep() { }

  // A layered percussive hit: transient click + sweeping noise "thwack" + a
  // low sub thud. weight 0 (light jab) → 1 (ground-shaking smash).
  function impact() { }

  // Air being sliced: bandpass noise whose centre swells up then falls away.
  function whoosh() { }

  let lastPlay = {};
  // Global sample volume multiplier (0.0 - 1.0) for fine-tuning
  let sfxSampleVol = 0.8;
  function setSfxSampleVolume(v) {
    sfxSampleVol = Math.max(0, Math.min(1, v));
  }
  function getSfxSampleVolume() {
    return sfxSampleVol;
  }

  let globalSfxBlockUntil = 0;
  function playSample() { return false; }


    if (!soundOn) return;
    // Try to use the uploaded samples where applicable for more accuracy
    switch (name) {

      case 'land':  tone(150, 0.08, 'sine', 0.04); break;








  }
  const MUSIC_TRACKS = [
    // -------- STAGE 1 · "NEON DAWN" — moody cloud-trap (A minor) --------
    {
      name: 'NEON DAWN',
      bpm: 138,
      volume: 0.34,
      bright: 0.20,
      drive: 0.12,
      pad: true,
      prog: [
        { bass: 45, chord: [57, 60, 64, 69] }, // Am
        { bass: 41, chord: [53, 57, 60, 65] }, // F
        { bass: 48, chord: [55, 60, 64, 67] }, // C
        { bass: 43, chord: [55, 59, 62, 67] }  // G
      ],
      kick: [0, 7, 10],
      snare: [8],
      rim: [14],
      hat: [0, 2, 4, 6, 8, 10, 12, 14],
      rolls: [{ at: 14, hits: 3, span: 1, type: 'hat' }],
      bassSteps: [0, 6, 10],
      bassOff: { 10: 3 },
      bassGlide: true,
      lead: [null, null, null, null, 69, null, null, null, 65, null, null, null, 64, null, null, null],
      leadWave: 'square'
    },
    // -------- STAGE 2 · "NIGHT DRIVE" — dark sliding-808 trap (D minor) --------
    {
      name: 'NIGHT DRIVE',
      bpm: 143,
      volume: 0.36,
      bright: 0.35,
      drive: 0.30,
      pad: true,
      prog: [
        { bass: 38, chord: [50, 53, 57, 62] }, // Dm
        { bass: 34, chord: [46, 50, 53, 58] }, // Bb
        { bass: 41, chord: [53, 57, 60, 65] }, // F
        { bass: 33, chord: [45, 49, 52, 57] }  // A
      ],
      kick: [0, 6, 10, 13],
      snare: [8],
      rim: [3, 11],
      hat: [0, 2, 3, 4, 6, 8, 10, 11, 12, 14],
      rolls: [{ at: 7, hits: 2, span: 1, type: 'hat' }, { at: 15, hits: 4, span: 1, type: 'hat' }],
      bassSteps: [0, 3, 6, 10, 12],
      bassOff: { 3: -2, 12: 3 },
      bassGlide: true,
      lead: [null, null, 62, null, null, null, 65, null, null, 69, null, null, 67, null, null, null],
      leadWave: 'square'
    },
    // -------- STAGE 3 · "DATA CHASE" — drill (F minor) --------
    {
      name: 'DATA CHASE',
      bpm: 147,
      volume: 0.38,
      bright: 0.50,
      drive: 0.50,
      pad: true,
      prog: [
        { bass: 41, chord: [53, 56, 60, 65] }, // Fm
        { bass: 37, chord: [49, 53, 56, 61] }, // Db
        { bass: 44, chord: [56, 60, 63, 68] }, // Ab
        { bass: 39, chord: [51, 55, 58, 63] }  // Eb
      ],
      kick: [0, 3, 8, 11],
      snare: [8],
      rim: [5, 13],
      hat: [0, 1, 2, 4, 5, 6, 8, 9, 10, 12, 13, 14],
      rolls: [
        { at: 6, hits: 3, span: 1, type: 'hat' },
        { at: 7, hits: 2, span: 1, type: 'hat' },
        { at: 14, hits: 3, span: 1, type: 'hat' }
      ],
      bassSteps: [0, 3, 6, 10, 13],
      bassOff: { 6: -3, 13: 4 },
      bassGlide: true,
      lead: [null, null, null, 65, null, null, 68, null, null, null, 72, null, 70, null, 68, null],
      leadWave: 'square'
    },
    // -------- STAGE 4 · "RIOT PROTOCOL" — hard distorted trap (C minor) --------
    {
      name: 'RIOT PROTOCOL',
      bpm: 150,
      volume: 0.40,
      bright: 0.72,
      drive: 0.72,
      pad: true,
      finale: true,
      prog: [
        { bass: 36, chord: [48, 51, 55, 60] }, // Cm
        { bass: 32, chord: [44, 48, 51, 56] }, // Ab
        { bass: 39, chord: [51, 55, 58, 63] }, // Eb
        { bass: 34, chord: [46, 50, 53, 58] }  // Bb
      ],
      kick: [0, 3, 6, 10, 13],
      snare: [8],
      rim: [4, 12],
      hat: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15],
      rolls: [
        { at: 3, hits: 2, span: 1, type: 'hat' },
        { at: 7, hits: 4, span: 1, type: 'hat' },
        { at: 11, hits: 2, span: 1, type: 'hat' },
        { at: 15, hits: 4, span: 1, type: 'hat' }
      ],
      bassSteps: [0, 3, 6, 10, 13],
      bassOff: { 13: 3 },
      bassGlide: true,
      lead: [60, null, 63, null, 67, null, 63, null, 60, null, 63, null, 70, null, 67, null],
      leadWave: 'sawtooth'
    },
    // -------- STAGE 5 · "BLACK ICE" — distorted trap-metal (G minor Phrygian) --------
    {
      name: 'BLACK ICE',
      bpm: 154,
      volume: 0.42,
      bright: 1.00,
      drive: 1.00,
      pad: true,
      finale: true,
      prog: [
        { bass: 43, chord: [55, 58, 62, 67] }, // Gm
        { bass: 41, chord: [53, 57, 60, 65] }, // F
        { bass: 39, chord: [51, 55, 58, 63] }, // Eb
        { bass: 38, chord: [50, 54, 57, 62] }  // D (Phrygian)
      ],
      kick: [0, 2, 5, 8, 11, 14],
      snare: [8],
      rim: [4, 12],
      hat: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15],
      rolls: [
        { at: 3, hits: 3, span: 1, type: 'hat' },
        { at: 7, hits: 4, span: 1, type: 'hat' },
        { at: 11, hits: 3, span: 1, type: 'hat' },
        { at: 15, hits: 6, span: 2, type: 'hat' }
      ],
      bassSteps: [0, 2, 5, 7, 8, 10, 13, 15],
      bassOff: { 7: 5, 15: 3 },
      bassGlide: true,
      lead: [67, 70, 74, 70, 72, 74, 77, 74, 79, 77, 74, 72, 70, 72, 74, 70],
      leadWave: 'sawtooth'
    }
  ];

  function midiToFreq(m) {
    return 440 * Math.pow(2, (m - 69) / 12);
  }

  // 808 sub-bass with an optional pitch slide (glide) and a distorted
  // harmonic layer — the defining sound of aggressive trap.
  function music808(time, fromFreq, toFreq, dur, vol, drive) {
    const glide = Math.abs(fromFreq - toFreq) > 0.5;
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(fromFreq, time);
    if (glide) osc.frequency.exponentialRampToValueAtTime(toFreq, time + 0.14);
    gain.gain.setValueAtTime(0.0001, time);
    gain.gain.linearRampToValueAtTime(vol, time + 0.008);
    gain.gain.setValueAtTime(vol, time + 0.09);
    gain.gain.exponentialRampToValueAtTime(0.0001, time + dur);
    osc.connect(gain);
    gain.connect(music.master);
    osc.start(time);
    osc.stop(time + dur + 0.05);

    // Aggressive overtone layer (saturates with drive)
    if (drive > 0.05) {
      const osc2 = audioCtx.createOscillator();
      osc2.type = 'sawtooth';
      osc2.frequency.setValueAtTime(fromFreq, time);
      if (glide) osc2.frequency.exponentialRampToValueAtTime(toFreq, time + 0.14);
      const shaper = audioCtx.createWaveShaper();
      shaper.curve = music.bassCurve;
      shaper.oversample = '2x';
      const filt = audioCtx.createBiquadFilter();
      filt.type = 'lowpass';
      filt.frequency.setValueAtTime(260 + drive * 1100, time);
      filt.Q.value = 5;
      const g2 = audioCtx.createGain();
      g2.gain.setValueAtTime(0.0001, time);
      g2.gain.linearRampToValueAtTime(0.04 + drive * 0.07, time + 0.012);
      g2.gain.exponentialRampToValueAtTime(0.0001, time + dur * 0.8);
      osc2.connect(shaper);
      shaper.connect(filt);
      filt.connect(g2);
      g2.connect(music.master);
      osc2.start(time);
      osc2.stop(time + dur + 0.05);
    }
  }

  // Punchy trap snare / clap: filtered noise crack + a short tonal snap
  function musicSnare(time, vol) {
    const src = audioCtx.createBufferSource();
    src.buffer = music.noiseBuffer;
    const filt = audioCtx.createBiquadFilter();
    filt.type = 'bandpass';
    filt.frequency.value = 1900;
    filt.Q.value = 0.7;
    const gain = audioCtx.createGain();
    gain.gain.setValueAtTime(vol, time);
    gain.gain.exponentialRampToValueAtTime(0.0001, time + 0.15);
    src.connect(filt);
    filt.connect(gain);
    gain.connect(music.master);
    src.start(time);
    src.stop(time + 0.18);

    const osc = audioCtx.createOscillator();
    const og = audioCtx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(210, time);
    osc.frequency.exponentialRampToValueAtTime(120, time + 0.08);
    og.gain.setValueAtTime(vol * 0.6, time);
    og.gain.exponentialRampToValueAtTime(0.0001, time + 0.1);
    osc.connect(og);
    og.connect(music.master);
    osc.start(time);
    osc.stop(time + 0.12);
  }

  function musicKick(time, vol) {
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(160, time);
    osc.frequency.exponentialRampToValueAtTime(45, time + 0.13);
    gain.gain.setValueAtTime(vol, time);
    gain.gain.exponentialRampToValueAtTime(0.0001, time + 0.32);
    osc.connect(gain);
    gain.connect(music.master);
    osc.start(time);
    osc.stop(time + 0.35);
  }

  function musicNoiseHit(time, vol, dur, filterType, filterFreq) {
    const src = audioCtx.createBufferSource();
    src.buffer = music.noiseBuffer;
    const filt = audioCtx.createBiquadFilter();
    filt.type = filterType;
    filt.frequency.value = filterFreq;
    const gain = audioCtx.createGain();
    gain.gain.setValueAtTime(vol, time);
    gain.gain.exponentialRampToValueAtTime(0.0001, time + dur);
    src.connect(filt);
    filt.connect(gain);
    gain.connect(music.master);
    src.start(time);
    src.stop(time + dur + 0.02);
  }

  function musicPad(time, freqs, dur) {
    const bright = music.track ? music.track.bright : 0.3;
    freqs.forEach(f => {
      [-7, 7].forEach(det => {
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(f, time);
        osc.detune.setValueAtTime(det, time);
        const filt = audioCtx.createBiquadFilter();
        filt.type = 'lowpass';
        filt.frequency.setValueAtTime(600 + bright * 1200, time);
        filt.frequency.linearRampToValueAtTime(1000 + bright * 1800, time + dur * 0.5);
        filt.Q.value = 4;
        gain.gain.setValueAtTime(0.0001, time);
        gain.gain.linearRampToValueAtTime(0.012, time + 0.35);
        gain.gain.linearRampToValueAtTime(0.0001, time + dur);
        osc.connect(filt);
        filt.connect(gain);
        gain.connect(music.master);
        osc.start(time);
        osc.stop(time + dur + 0.05);
      });
    });
  }

  // Overdriven lead synth — the "aggression" layer
  function musicLead(time, freq, dur, vol, bright, wave) {
    const osc = audioCtx.createOscillator();
    osc.type = wave || 'sawtooth';
    osc.frequency.setValueAtTime(freq, time);
    const shaper = audioCtx.createWaveShaper();
    shaper.curve = music.distCurve;
    shaper.oversample = '2x';
    const filt = audioCtx.createBiquadFilter();
    filt.type = 'lowpass';
    filt.frequency.setValueAtTime(1500 + (bright || 0) * 3000, time);
    filt.Q.value = 7;
    const gain = audioCtx.createGain();
    gain.gain.setValueAtTime(0.0001, time);
    gain.gain.linearRampToValueAtTime(vol, time + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.0001, time + dur);
    osc.connect(shaper);
    shaper.connect(filt);
    filt.connect(gain);
    gain.connect(music.master);
    osc.start(time);
    osc.stop(time + dur + 0.05);
  }

  function scheduleMusicStep(step, time) {
    const track = music.track || MUSIC_TRACKS[0];
    const bar = Math.floor(step / 16) % track.prog.length;
    const s = step % 16;
    const prog = track.prog[bar];
    const bright = track.bright;
    const sixteenth = 60 / track.bpm / 4;

    // --- Drums: sparse syncopated kick, half-time snare on the "3" ---
    if (track.kick.indexOf(s) !== -1) musicKick(time, 0.55);
    if (track.snare.indexOf(s) !== -1) musicSnare(time, 0.34);
    if (track.rim.indexOf(s) !== -1) musicNoiseHit(time, 0.05, 0.04, 'bandpass', 3200);

    // --- Hi-hats on 16ths (accented on the beat) ---
    if (track.hat.indexOf(s) !== -1) {
      musicNoiseHit(time, s % 4 === 0 ? 0.04 : 0.065, 0.022, 'highpass', 9000);
    }
    // --- Trap rolls: 32nd/triplet flurries that define the genre ---
    track.rolls.forEach(r => {
      if (r.at !== s) return;
      const span = (r.span || 1) * sixteenth;
      const gap = span / r.hits;
      for (let i = 0; i < r.hits; i++) {
        const v = 0.06 * (1 - (i / r.hits) * 0.7);
        if (r.type === 'snare') musicSnare(time + i * gap, v);
        else musicNoiseHit(time + i * gap, v, 0.018, 'highpass', 9600);
      }
    });

    // --- 808 bass, sliding from the previous note ---
    if (track.bassSteps.indexOf(s) !== -1) {
      const note = prog.bass + (track.bassOff[s] || 0);
      const freq = midiToFreq(note);
      const fromFreq = (track.bassGlide && music.prevBass) ? music.prevBass : freq;
      music808(time, fromFreq, freq, 0.46, 0.30, track.drive);
      music.prevBass = freq;
    }

    // --- Dark atmospheric pad at the start of each bar ---
    if (track.pad && s === 0) {
      musicPad(time, prog.chord.slice(0, 3).map(m => midiToFreq(m + 12)), (60 / track.bpm) * 4 * 0.98);
    }

    // --- Dark lead melody ---
    if (track.lead && track.lead[s] != null) {
      musicLead(time, midiToFreq(track.lead[s]), 0.13, 0.035 + bright * 0.03, bright, track.leadWave);
    }

    // --- Snare build over the final bar of every 4-bar phrase ---
    if (track.finale && (Math.floor(step / 16) % 4) === 3 && s >= 12) {
      musicSnare(time, 0.1 + (s - 12) * 0.03);
    }
  }

  function musicScheduler() {
    if (!music.playing || !audioCtx) return;
    const track = music.track || MUSIC_TRACKS[0];
    const lookahead = 0.12;
    const sixteenth = 60 / track.bpm / 4;
    while (music.nextTime < audioCtx.currentTime + lookahead) {
      scheduleMusicStep(music.step, music.nextTime);
      music.nextTime += sixteenth;
      music.step += 1;
    }
  }

  function ensureNoiseBuffer() {
    if (music.noiseBuffer) return;
    const len = Math.floor(audioCtx.sampleRate * 0.5);
    const buf = audioCtx.createBuffer(1, len, audioCtx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
    music.noiseBuffer = buf;
  }

  function ensureDistortionCurve() {
    if (music.distCurve) return;
    const n = 1024;
    const hard = new Float32Array(n);
    const soft = new Float32Array(n);
    for (let i = 0; i < n; i++) {
      const x = (i * 2) / n - 1;
      hard[i] = Math.tanh(x * 10);
      soft[i] = Math.tanh(x * 5);
    }
    music.distCurve = hard;
    music.bassCurve = soft;
  }

  // Master volume comes from the active track
  function musicTargetVolume() {
    return music.track ? music.track.volume : 0.32;
  }

  // Called when a level loads — swaps to that stage's track
  function setMusicStage(stage) {
    stage = Math.max(1, Math.min(5, stage));
    const changed = music.stage !== stage;
    music.stage = stage;
    music.track = MUSIC_TRACKS[stage - 1];
    music.bpm = music.track.bpm;
    music.intensity = (stage - 1) / 4;
    // A brand-new track starts from the top of its pattern
    if (changed && music.playing) { music.step = 0; music.prevBass = null; }
    if (music.master && audioCtx) {
      try {
        music.master.gain.cancelScheduledValues(audioCtx.currentTime);
        music.master.gain.setValueAtTime(music.master.gain.value, audioCtx.currentTime);
        music.master.gain.linearRampToValueAtTime(musicTargetVolume(), audioCtx.currentTime + 0.8);
      } catch (e) { /* ignore */ }
    }
  }

  function startMusic() {
    if (!musicOn || music.playing) return;
    try {
      if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      if (audioCtx.state === 'suspended') audioCtx.resume();
      ensureNoiseBuffer();
      ensureDistortionCurve();
      if (!music.track) music.track = MUSIC_TRACKS[music.stage - 1] || MUSIC_TRACKS[0];
      if (!music.master) {
        music.master = audioCtx.createGain();
        const comp = audioCtx.createDynamicsCompressor();
        music.master.connect(comp);
        comp.connect(audioCtx.destination);
        music.master.gain.setValueAtTime(0.0001, audioCtx.currentTime);
        music.master.gain.linearRampToValueAtTime(musicTargetVolume(), audioCtx.currentTime + 1.5);
      } else {
        music.master.gain.cancelScheduledValues(audioCtx.currentTime);
        music.master.gain.setValueAtTime(Math.max(0.0001, music.master.gain.value), audioCtx.currentTime);
        music.master.gain.linearRampToValueAtTime(musicTargetVolume(), audioCtx.currentTime + 0.5);
      }
      music.step = 0;
      music.prevBass = null;
      music.nextTime = audioCtx.currentTime + 0.08;
      music.playing = true;
      music.timer = setInterval(musicScheduler, 25);
    } catch (e) { /* audio unavailable — ignore */ }
  }

  function stopMusic() {
    if (!music.playing) return;
    music.playing = false;
    if (music.timer) { clearInterval(music.timer); music.timer = null; }
    try {
      if (music.master && audioCtx) {
        music.master.gain.cancelScheduledValues(audioCtx.currentTime);
        music.master.gain.setValueAtTime(music.master.gain.value, audioCtx.currentTime);
        music.master.gain.linearRampToValueAtTime(0.0001, audioCtx.currentTime + 0.4);
      }
    } catch (e) { /* ignore */ }
  }

  // ===== corner dock + mute buttons =====
  if (soundToggle) {
    soundToggle.addEventListener('click', function () {
      soundOn = !soundOn;
      refreshAudio();
      if (soundOn) sfx('pickup');
    });
  }

  if (musicToggle) {
    musicToggle.addEventListener('click', function () {
      musicOn = !musicOn;
      musicToggle.innerHTML = musicOn ? '<i class="fas fa-music"></i>' : '<i class="fas fa-ban"></i>';
      musicToggle.classList.toggle('muted', !musicOn);
      if (musicOn) {
        if (CJ.game && CJ.game.isActive && CJ.game.isActive()) startMusic();
      } else {
        stopMusic();
      }
    });
  }

  // ===== Corner dock: one place to mute the portfolio BGM or the fight SFX =====
  const bgmDockBtn = document.getElementById('bgmToggle');
  const sfxDockBtn = document.getElementById('sfxToggle');
  const bgmVolSlider = document.getElementById('bgmVolume');
  const sfxVolSlider = document.getElementById('sfxVolume');

  // Keep the corner dock and the in-game buttons showing the same state
  function refreshAudio() {
    const sfxIcon = soundOn ? '<i class="fas fa-volume-up"></i>' : '<i class="fas fa-volume-mute"></i>';
    if (soundToggle) {
      soundToggle.innerHTML = sfxIcon;
      soundToggle.classList.toggle('muted', !soundOn);
    }
    if (sfxDockBtn) {
      sfxDockBtn.innerHTML = sfxIcon;
      sfxDockBtn.classList.toggle('muted', !soundOn);
    }
    if (bgmDockBtn) {
      bgmDockBtn.innerHTML = bgmOn ? '<i class="fas fa-music"></i>' : '<i class="fas fa-ban"></i>';
      bgmDockBtn.classList.toggle('muted', !bgmOn);
    }
  }

  if (bgmDockBtn) {
    bgmDockBtn.addEventListener('click', function() {
      bgmOn = !bgmOn;
      bgmAllowed = true;              // the click itself is the user gesture
      if (bgmOn) bgmPlay(); else bgmPause();
      refreshAudio();
    });
  }



  if (bgmVolSlider) {
    try { bgmVolSlider.value = String(bgm.volume); } catch (e) {}
    bgmVolSlider.addEventListener('input', function() {
      A.setBgmVolume(parseFloat(bgmVolSlider.value));
      bgmAllowed = true;
      if (bgmOn) bgmPlay();
    });
    bgmVolSlider.addEventListener('change', function() {
      bgmAllowed = true;
      if (bgmOn) bgmPlay();
    });
  }


  refreshAudio();
  // ---- public API ----
  A.tone = tone;
  A.noiseBurst = noiseBurst;
  A.sweep = sweep;
  A.impact = impact;
  A.whoosh = whoosh;
  A.sfx = sfx;
  A.startMusic = startMusic;
  A.stopMusic = stopMusic;
  A.setMusicStage = setMusicStage;
  A.isSoundOn = function () { return soundOn; };
  A.isMusicOn = function () { return musicOn; };
  A.isBgmOn = function () { return bgmOn; };
  A.trackName = function () { return music.track ? music.track.name : ''; };
  A.bgmPlay = bgmPlay;
  A.bgmPause = bgmPause;
  A.setSfxSampleVolume = setSfxSampleVolume;
  A.getSfxSampleVolume = getSfxSampleVolume;
  A.setBgmVolume = function(v) { try { bgm.volume = Math.max(0, Math.min(1, v)); } catch (e) {} };
  A.getBgmVolume = function() { return bgm.volume; };
  A.refreshAudio = refreshAudio;
})();
