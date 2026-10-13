/* =============================================================
   game.js — NEON COURIER (2D platformer, 10 levels)
   Depends on window.CJ.audio for sound effects + trap soundtrack.
   ============================================================= */
(function () {
  'use strict';
  const CJ = (window.CJ = window.CJ || {});
  const Audio = CJ.audio || {};
  const sfx = Audio.sfx || function () {};
  const startMusic = Audio.startMusic || function () {};
  const stopMusic = Audio.stopMusic || function () {};
  const setMusicStage = Audio.setMusicStage || function () {};

  // ===== NEON COURIER — 2D PLATFORMER WITH 10 LEVELS =====
  const gameModal = document.getElementById('gameModal');
  const gameCard = document.getElementById('gameCard');
  const gameClose = document.getElementById('gameClose');
  const gameCanvas = document.getElementById('gameCanvas');
  const ctx = gameCanvas.getContext('2d');
  const gameStartBtn = document.getElementById('gameStartBtn');
  const gameMessage = document.getElementById('gameMessage');
  const traceBar = document.getElementById('traceBar');
  const gameScoreEl = document.getElementById('gameScore');
  const gameLevelEl = document.getElementById('gameLevel');
  const parGoalEl = document.getElementById('parGoal');
  const creditEl = document.getElementById('creditBar');
  const speedBar = document.getElementById('speedBar');

  const W = gameCanvas.width;
  const H = gameCanvas.height;
  const GRAVITY = 0.55;
  const SPEED_STAGES = [3.6, 4.2, 4.9, 5.6, 6.4]; // player run speed, stage 1 (slow) → 5 (fast)
  const JUMP_POWER = -11.5;
  const GROUND_Y = H - 40;
  const AUTO_RETRY_DELAY = 1800;
  const MAX_LEVEL = 10;
  const MAX_STEP = 3;            // clamp so physics stays stable on lag or tab-switch
  const COYOTE_TIME = 0.1;       // grace period to jump after leaving a ledge
  const JUMP_BUFFER_TIME = 0.12; // remember a jump press made just before landing
  const JUMP_CUT = 0.45;         // releasing jump early gives a shorter hop

  let keys = {};
  let gameActive = false;
  let animId = null;
  let lastTime = 0;
  let elapsedTime = 0;
  let hasPackage = false;
  let delivered = false;
  let player, platforms, packageItem, dropZone, particles;
  let enemies = [];
  let bullets = [];
  let cameraX = 0;
  let autoRetryTimeout = null;
  let isDead = false;
  let currentLevel = 1;
  let levelTransitioning = false;
  let coyote = 0;
  let jumpBuffer = 0;
  let shake = 0;
  let jumpsUsed = 0;
  let checkpoint = null;
  let respawnPoint = { x: 0, y: 0 };
  let levelPar = 0;
  let playerSpeed = SPEED_STAGES[0];
  let speedStage = 1;
  let totalCredits = 0;
  let bestTimes = {};
  try { bestTimes = JSON.parse(localStorage.getItem('neonCourierBest') || '{}') || {}; } catch (e) { bestTimes = {}; }

  // Level generation helper — vertical parkour that gets longer & harder per level
  function generateLevel(level) {
    const levelData = {
      platforms: [],
      package: null,
      drop: null
    };

    // ===== Difficulty & length scaling (level 1 → 10) =====
    // More platforms each level = a longer route
    const numPlatforms = 7 + level * 2;
    // The whole map stretches out a little more every level
    const stretch = 1 + level * 0.06;
    // Modest horizontal gaps — difficulty comes from height, not long jumps
    const baseGap = (46 + level * 2) * stretch;
    const gapJitter = 26 * stretch;
    // Vertical parkour: max step up/down grows each level (taller in late levels)
    const maxStep = Math.min(36 + level * 8, 112);

    let currentX = 0;
    let currentY = GROUND_Y;

    // Wide, safe starting platform
    levelData.platforms.push({ x: 0, y: GROUND_Y, w: 220, h: 40 });
    currentX = 220;

    let direction = 1;        // 1 = climbing up, -1 = going down
    let stepsInDirection = 0; // keeps a few platforms moving the same way (stair feel)

    // Generate the parkour path
    for (let i = 0; i < numPlatforms; i++) {
      currentX += baseGap + Math.random() * gapJitter;

      const width = Math.max(70, 170 - level * 6 + Math.random() * 30);

      // Flip vertical direction every ~2-4 platforms → rise, drop, zig-zag
      stepsInDirection++;
      if (stepsInDirection > 2 + Math.floor(Math.random() * 2)) {
        direction *= -1;
        stepsInDirection = 0;
      }

      // Bounce off the top/bottom so the course always keeps climbing & dropping
      if (direction === -1 && currentY >= GROUND_Y - 2) direction = 1;
      if (direction === 1 && currentY <= 62) direction = -1;

      // Step height grows with level but always stays within jump reach
      const step = Math.max(18, 22 + Math.random() * (maxStep - 20));
      let y = currentY + direction * step;
      y = Math.max(60, Math.min(GROUND_Y, y));

      levelData.platforms.push({ x: currentX, y: y, w: width, h: 20 });

      currentY = y;
      currentX += width;
    }

    // Final platform (drop zone landing) — wide and on the ground
    currentX += (50 + Math.random() * 30) * stretch;
    levelData.platforms.push({ x: currentX, y: GROUND_Y, w: 260, h: 40 });

    // Remember each platform's resting position (moving platforms oscillate around it)
    levelData.platforms.forEach(p => { p.baseX = p.x; p.baseY = p.y; });

    const packageIndex = Math.floor(levelData.platforms.length / 2);
    // Checkpoint roughly one third of the way through (kept on solid ground)
    let checkpointIndex = Math.max(2, Math.floor(levelData.platforms.length * 0.34));
    if (checkpointIndex >= packageIndex - 1) checkpointIndex = Math.max(2, packageIndex - 4);

    // ===== Moving platforms (more of them, and bigger swings, as levels rise) =====
    const moveChance = Math.min(0.2 + level * 0.03, 0.4);
    // Keep the package, checkpoint, and their neighbours static so they stay fair
    const staticZones = [packageIndex, checkpointIndex];
    for (let i = 2; i < levelData.platforms.length - 1; i++) {
      if (staticZones.some(idx => i >= idx - 1 && i <= idx + 1)) continue;
      if (Math.random() < moveChance) {
        const axis = Math.random() < 0.3 ? 'y' : 'x';
        levelData.platforms[i].move = {
          axis: axis,
          amp: axis === 'y' ? Math.min(14 + level * 2, 30) : Math.min(22 + level * 3, 55),
          speed: 0.7 + Math.random() * 0.9,
          phase: Math.random() * Math.PI * 2
        };
      }
    }

    // Checkpoint flag: reached once, becomes your respawn point if you fall
    const checkpointPlatform = levelData.platforms[checkpointIndex];
    levelData.checkpoint = {
      x: checkpointPlatform.x + checkpointPlatform.w / 2 - 14,
      y: checkpointPlatform.y - 48,
      w: 28,
      h: 48,
      active: false,
      respawnX: checkpointPlatform.x + checkpointPlatform.w / 2 - 11,
      respawnY: checkpointPlatform.y - 36
    };

    // Package: sits on the platform roughly midway through the route
    const packagePlatform = levelData.platforms[packageIndex];
    levelData.package = {
      x: packagePlatform.x + packagePlatform.w / 2 - 9,
      y: packagePlatform.y - 22,
      w: 18,
      h: 18,
      collected: false
    };

    // Drop zone on the final platform
    const finalPlatform = levelData.platforms[levelData.platforms.length - 1];
    levelData.drop = {
      x: finalPlatform.x + finalPlatform.w - 80,
      y: finalPlatform.y - 80,
      w: 60,
      h: 80
    };

    // Par time for medals — accounts for the faster run speed at higher stages
    const mapLength = finalPlatform.x + finalPlatform.w;
    const stage = Math.min(5, Math.ceil(level / 2));
    const stageSpeed = SPEED_STAGES[stage - 1];
    levelData.par = Math.round(mapLength / (stageSpeed * 60 * 0.6)) + 6;

    // ===== Enemy turrets (active from level 5 — the route is "secured") =====
    levelData.enemies = [];
    if (level >= 5) {
      const enemyCount = Math.min(6, level - 4);
      // Candidate platforms: skip the opening and the final landing, and keep
      // the package / checkpoint areas fair by avoiding their neighbourhood.
      const candidates = [];
      for (let i = 2; i < levelData.platforms.length - 2; i++) {
        if (staticZones.some(idx => i >= idx - 1 && i <= idx + 1)) continue;
        candidates.push(i);
      }
      // Shuffle so turrets land on different platforms each run
      for (let i = candidates.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        const tmp = candidates[i]; candidates[i] = candidates[j]; candidates[j] = tmp;
      }
      const baseInterval = Math.max(0.95, 2.4 - (level - 5) * 0.24); // secs between shots
      const bulletSpeed = 2.4 + (level - 5) * 0.22;
      const placed = Math.min(enemyCount, candidates.length);
      for (let k = 0; k < placed; k++) {
        levelData.enemies.push({
          platformIndex: candidates[k],
          w: 24,
          h: 28,
          x: 0,
          y: 0,
          fireInterval: baseInterval + Math.random() * 0.5,
          cooldown: 0.9 + Math.random() * 1.1,
          range: 560,
          bulletSpeed: bulletSpeed
        });
      }
    }

    return levelData;
  }

  // Current on-screen position of a platform (accounts for movement)
  function platformState(p, t) {
    if (!p.move) return { x: p.baseX, y: p.baseY };
    const off = Math.sin(p.move.phase + t * p.move.speed) * p.move.amp;
    if (p.move.axis === 'y') return { x: p.baseX, y: p.baseY + off };
    return { x: p.baseX + off, y: p.baseY };
  }

  function isJumpKey(k) {
    return k === ' ' || k === 'ArrowUp' || k === 'w' || k === 'W';
  }

  function loadLevel(level) {
    const data = generateLevel(level);
    platforms = data.platforms;
    packageItem = data.package;
    dropZone = data.drop;
    checkpoint = data.checkpoint;
    levelPar = data.par;
    enemies = data.enemies || [];
    bullets = [];
    // 5 speed stages: levels 1-2 = 1, 3-4 = 2, 5-6 = 3, 7-8 = 4, 9-10 = 5
    speedStage = Math.min(5, Math.ceil(level / 2));
    playerSpeed = SPEED_STAGES[speedStage - 1];
    // Match the music's aggression to the difficulty of this stage
    setMusicStage(speedStage);
    respawnPoint = { x: data.checkpoint.respawnX, y: data.checkpoint.respawnY };
    hasPackage = false;
    delivered = false;
    particles = [];
    cameraX = 0;
    elapsedTime = 0;
    coyote = 0;
    jumpBuffer = 0;
    jumpsUsed = 0;
    shake = 0;

    // Player starts on the first platform
    const startPlatform = platforms[0];
    player = {
      x: startPlatform.x + 30,
      y: startPlatform.y - 36,
      w: 22,
      h: 36,
      vx: 0,
      vy: 0,
      onGround: false,
      facing: 1,
      support: null
    };
  }

  function resetGame() {
    gameActive = false;
    isDead = false;
    levelTransitioning = false;
    cancelAnimationFrame(animId);
    clearTimeout(autoRetryTimeout);
    currentLevel = 1;
    totalCredits = 0;
    loadLevel(currentLevel);
    updateHUD();
    drawScene();
    gameMessage.innerHTML = '> READY.<br>> ' + '<span style="color:#00d4ff;">← → / A D</span> RUN · <span style="color:#00d4ff;">SPACE / W / ↑</span> JUMP (DOUBLE-JUMP IN AIR) · <span style="color:#00d4ff;">R</span> RESTART.<br>> GRAB THE <span style="color:#ff0080;">PACKAGE</span>, REACH THE <span style="color:#00d4ff;">DROP ZONE</span>, AND TOUCH <span style="color:#00d4ff;">CHECKPOINT FLAGS</span> TO SAVE PROGRESS.<br>> FROM <span style="color:#ff4d4d;">LEVEL 5</span>, SECURITY TURRETS FIRE AT YOU — DODGE THEM!<br>> RUN SPEED RISES EVERY 2 LEVELS (<span style="color:#ff0080;">★☆☆☆☆ → ★★★★★</span>), EACH STAGE WITH ITS OWN TRACK. BEAT PAR FOR A <span style="color:#ffd700;">GOLD</span> MEDAL!';
    gameStartBtn.innerHTML = '<i class="fas fa-play"></i> START RUN';
  }

  function startRun() {
    clearTimeout(autoRetryTimeout);
    isDead = false;
    levelTransitioning = false;
    loadLevel(currentLevel);
    gameActive = true;
    elapsedTime = 0;
    lastTime = performance.now();
    gameMessage.innerHTML = `> <span style="color:#00d4ff;">LEVEL ${currentLevel}/10</span> · SPEED <span style="color:#ff0080;">${'★'.repeat(speedStage)}${'☆'.repeat(5 - speedStage)}</span> · <span style="color:#a06bff;">♪ ${Audio.trackName ? Audio.trackName() : ''}</span><br>> GO! GRAB THE <span style="color:#ff0080;">PACKAGE</span> AND REACH THE <span style="color:#00d4ff;">DROP ZONE</span>.` +
      (enemies.length ? ` <span style="color:#ff4d4d;">⚠ ${enemies.length} TURRET${enemies.length > 1 ? 'S' : ''} ACTIVE — DODGE THE RED FIRE!</span>` : '');
    gameStartBtn.innerHTML = '<i class="fas fa-play"></i> RESTART';
    if (animId) cancelAnimationFrame(animId);
    startMusic();
    animId = requestAnimationFrame(loop);
  }

  function startFullRun() {
    currentLevel = 1;
    startRun();
  }

  function nextLevel() {
    levelTransitioning = true;
    gameActive = false;
    cancelAnimationFrame(animId);

    if (currentLevel >= MAX_LEVEL) {
      // Game complete
      isDead = false;
      delivered = false;
      hasPackage = false;
      gameMessage.innerHTML = `> <span style="color:#00d4ff;">ALL 10 LEVELS COMPLETE!</span> YOU ARE A TRUE NEON COURIER · ${totalCredits} CR<br>> PRESS RESTART TO RUN AGAIN.`;
      gameStartBtn.innerHTML = '<i class="fas fa-redo"></i> RESTART CAMPAIGN';
      sfx('complete');
      currentLevel = 1;
      totalCredits = 0;
      levelTransitioning = false;
      return;
    }

    currentLevel++;
    gameMessage.innerHTML = `> <span style="color:#00d4ff;">LEVEL ${currentLevel}/10</span> · DELIVERY COMPLETE! NEW ROUTE UNLOCKED.<br>> GET READY...`;
    gameStartBtn.innerHTML = '<i class="fas fa-play"></i> NEXT LEVEL';

    // Auto advance after brief transition
    autoRetryTimeout = setTimeout(() => {
      if (gameModal.classList.contains('active')) {
        startRun();
      }
    }, 1800);
  }

  function autoRetry() {
    if (!gameModal.classList.contains('active')) return;
    startRun();
  }

  function loop(now) {
    if (!gameActive) return;
    if (typeof now !== 'number' || !isFinite(now)) now = performance.now();
    let dt = (now - lastTime) / 1000;
    if (!isFinite(dt) || dt < 0) dt = 0;
    dt = Math.min(dt, 0.05);
    lastTime = now;

    elapsedTime += dt;
    shake *= Math.pow(0.85, dt * 60);
    if (shake < 0.3) shake = 0;

    update(dt);
    drawScene();
    updateHUD();
    animId = requestAnimationFrame(loop);
  }

  function update(dt) {
    const tNow = performance.now() / 1000;
    const step = Math.min(dt * 60, MAX_STEP);
    const wasGrounded = player.onGround;
    const impactVy = player.vy;

    // Ride the platform we were standing on last frame (carry BEFORE re-snapping)
    if (player.support && player.support.move) {
      const sNow = platformState(player.support, tNow);
      const sPrev = platformState(player.support, tNow - dt);
      player.x += sNow.x - sPrev.x;
      player.y += sNow.y - sPrev.y;
    }

    let moveX = 0;
    if (keys['ArrowLeft'] || keys['a'] || keys['A']) moveX -= 1;
    if (keys['ArrowRight'] || keys['d'] || keys['D']) moveX += 1;

    if (moveX !== 0) {
      player.vx = moveX * playerSpeed;
      player.facing = moveX;
    } else {
      player.vx *= Math.pow(0.75, step);
      if (Math.abs(player.vx) < 0.1) player.vx = 0;
    }

    // Jump: coyote time + input buffering so jumping always feels responsive
    if (player.onGround) {
      coyote = COYOTE_TIME;
      jumpsUsed = 0;
    } else {
      coyote -= dt;
    }
    if (jumpBuffer > 0) jumpBuffer -= dt;

    if (jumpBuffer > 0 && (player.onGround || coyote > 0)) {
      // First jump (from ground or coyote grace)
      player.vy = JUMP_POWER;
      player.onGround = false;
      coyote = 0;
      jumpBuffer = 0;
      jumpsUsed = 1;
      spawnParticles(player.x + player.w / 2, player.y + player.h, '#00d4ff', 6);
      sfx('jump');
    } else if (jumpBuffer > 0 && jumpsUsed < 2) {
      // Double jump
      player.vy = JUMP_POWER * 0.92;
      jumpBuffer = 0;
      jumpsUsed = 2;
      spawnParticles(player.x + player.w / 2, player.y + player.h, '#ff0080', 12);
      sfx('jump');
    }

    player.x += player.vx * step;
    player.y += player.vy * step;
    player.vy += GRAVITY * step;

    player.onGround = false;
    player.support = null;
    platforms.forEach(p => {
      const pos = platformState(p, tNow);
      if (
        player.x + player.w > pos.x &&
        player.x < pos.x + p.w &&
        player.y + player.h > pos.y &&
        player.y + player.h < pos.y + p.h + 20 &&
        player.vy >= 0
      ) {
        player.y = pos.y - player.h;
        player.vy = 0;
        player.onGround = true;
        player.support = p;
      }
    });

    // Landing dust + a small screen shake for impact feel
    if (player.onGround && !wasGrounded && impactVy > 3) {
      const n = Math.min(12, Math.floor(impactVy * 1.5));
      spawnParticles(player.x + player.w / 2, player.y + player.h, '#00d4ff', n);
      shake = Math.min(8, impactVy);
      sfx('land');
    }

    if (player.y > H + 200) {
      if (checkpoint && checkpoint.active) {
        respawnPlayer();
      } else {
        endRun('fall');
      }
      return;
    }

    // Enemies & projectiles are active from level 5 onward
    if (enemies.length) {
      updateEnemies(dt, tNow);
      if (updateBullets(dt, step, tNow)) return; // player was hit — stop this frame
    }

    if (!hasPackage && !packageItem.collected &&
        player.x + player.w > packageItem.x &&
        player.x < packageItem.x + packageItem.w &&
        player.y + player.h > packageItem.y &&
        player.y < packageItem.y + packageItem.h) {
      packageItem.collected = true;
      hasPackage = true;
      spawnParticles(packageItem.x + 9, packageItem.y + 9, '#ff0080', 14);
      shake = 6;
      sfx('pickup');
      gameMessage.innerHTML = `> <span style="color:#ff0080;">PACKAGE SECURED.</span> HEAD TO THE <span style="color:#00d4ff;">DROP ZONE</span> →`;
    }

    // Checkpoint: touching the flag arms your respawn point
    if (checkpoint && !checkpoint.active &&
        player.x + player.w > checkpoint.x &&
        player.x < checkpoint.x + checkpoint.w &&
        player.y + player.h > checkpoint.y &&
        player.y < checkpoint.y + checkpoint.h) {
      checkpoint.active = true;
      respawnPoint = { x: checkpoint.respawnX, y: checkpoint.respawnY };
      shake = 5;
      sfx('pickup');
      gameMessage.innerHTML = '> <span style="color:#00d4ff;">CHECKPOINT REACHED.</span> IF YOU FALL, YOU WILL RESPAWN HERE.';
    }

    if (hasPackage && !delivered &&
        player.x + player.w > dropZone.x &&
        player.x < dropZone.x + dropZone.w &&
        player.y + player.h > dropZone.y &&
        player.y < dropZone.y + dropZone.h) {
      delivered = true;
      spawnParticles(dropZone.x + dropZone.w / 2, dropZone.y + dropZone.h / 2, '#00d4ff', 24);
      endRun('success');
      return;
    }

    particles.forEach(p => {
      p.x += p.vx * step;
      p.y += p.vy * step;
      p.vy += 0.2 * step;
      p.life -= 0.03 * step;
    });
    particles = particles.filter(p => p.life > 0);

    // Smooth camera with a little look-ahead that grows with speed
    const targetCam = player.x + player.facing * Math.max(40, playerSpeed * 12) - W / 3;
    const camLerp = 1 - Math.pow(0.92, step);
    cameraX += (targetCam - cameraX) * camLerp;
    if (cameraX < 0) cameraX = 0;
  }

  function spawnParticles(x, y, color, count) {
    for (let i = 0; i < count; i++) {
      particles.push({
        x, y,
        vx: (Math.random() - 0.5) * 4,
        vy: (Math.random() - 0.5) * 4 - 1,
        life: 1,
        color
      });
    }
  }

  // Send the player back to the last checkpoint instead of restarting the level
  function respawnPlayer(reason) {
    player.x = respawnPoint.x;
    player.y = respawnPoint.y;
    player.vx = 0;
    player.vy = 0;
    player.support = null;
    coyote = 0;
    jumpBuffer = 0;
    jumpsUsed = 0;
    bullets = [];
    // Brief grace: give the turrets a moment before they can fire again
    enemies.forEach(e => { e.cooldown = Math.max(e.cooldown, 0.9); });
    cameraX = Math.max(0, player.x - W / 3);
    shake = 8;
    sfx('land');
    spawnParticles(player.x + player.w / 2, player.y + player.h, '#00d4ff', 10);
    gameMessage.innerHTML = reason === 'hit'
      ? '> <span style="color:#ff4d4d;">SHOT DOWN.</span> RESPAWNED AT CHECKPOINT. STAY MOBILE →'
      : '> <span style="color:#00d4ff;">RESPAWNED AT CHECKPOINT.</span> KEEP GOING →';
  }

  // A bullet found its target
  function hitPlayer() {
    spawnParticles(player.x + player.w / 2, player.y + player.h / 2, '#ff4d4d', 18);
    bullets = [];
    shake = 12;
    sfx('hit');
    if (checkpoint && checkpoint.active) {
      respawnPlayer('hit');
    } else {
      endRun('hit');
    }
  }

  // Keep each turret glued to (and moving with) its platform, and fire at the courier
  function updateEnemies(dt, tNow) {
    enemies.forEach(e => {
      const p = platforms[e.platformIndex];
      const pos = platformState(p, tNow);
      e.x = pos.x + p.w / 2 - e.w / 2;
      e.y = pos.y - e.h - 2;

      const cx = e.x + e.w / 2;
      const cy = e.y + e.h / 2;
      const dx = (player.x + player.w / 2) - cx;
      const dy = (player.y + player.h / 2) - cy;
      const dist = Math.sqrt(dx * dx + dy * dy);

      e.cooldown -= dt;
      // Only fire when the courier is in range, off the turret itself, and the
      // turret is actually on screen (so the player can see the shot coming).
      const screenX = cx - cameraX;
      const onScreen = screenX > -40 && screenX < W + 40;
      if (e.cooldown <= 0 && dist < e.range && dist > 24 && onScreen) {
        e.cooldown = e.fireInterval;
        if (bullets.length < 40) {
          const inv = 1 / dist;
          bullets.push({
            x: cx - 3,
            y: cy - 3,
            w: 6,
            h: 6,
            vx: dx * inv * e.bulletSpeed,
            vy: dy * inv * e.bulletSpeed,
            life: 3.2
          });
        }
        sfx('shoot');
      }
    });
  }

  // Returns true if the player was hit this frame
  function updateBullets(dt, step, tNow) {
    const alive = [];
    for (let i = 0; i < bullets.length; i++) {
      const b = bullets[i];
      b.x += b.vx * step;
      b.y += b.vy * step;
      b.life -= dt;

      // Hit a platform? spark and stop
      let blocked = false;
      for (let j = 0; j < platforms.length; j++) {
        const p = platforms[j];
        const pos = platformState(p, tNow);
        if (b.x + b.w > pos.x && b.x < pos.x + p.w && b.y + b.h > pos.y && b.y < pos.y + p.h) {
          spawnParticles(b.x + b.w / 2, b.y + b.h / 2, '#ff9a3c', 4);
          blocked = true;
          break;
        }
      }
      if (blocked) continue;

      // Hit the player?
      if (player &&
          player.x + player.w > b.x && player.x < b.x + b.w &&
          player.y + player.h > b.y && player.y < b.y + b.h) {
        hitPlayer();
        return true;
      }

      if (b.life > 0) alive.push(b);
    }
    bullets = alive;
    return false;
  }

  // Medal tier from completion time vs. the level's par time
  function medalFor(time, par) {
    if (time <= par * 0.85) return { name: 'GOLD', color: '#ffd700' };
    if (time <= par * 1.1) return { name: 'SILVER', color: '#c0c0c0' };
    return { name: 'BRONZE', color: '#cd7f32' };
  }

  function endRun(reason) {
    gameActive = false;
    cancelAnimationFrame(animId);

    if (reason === 'success') {
      const bonus = Math.max(50, Math.round(3000 / Math.max(elapsedTime, 0.5)));
      totalCredits += bonus;
      const medal = medalFor(elapsedTime, levelPar);
      const prevBest = bestTimes[currentLevel];
      let bestNote = '';
      if (prevBest == null || elapsedTime < prevBest) {
        bestTimes[currentLevel] = Number(elapsedTime.toFixed(2));
        try { localStorage.setItem('neonCourierBest', JSON.stringify(bestTimes)); } catch (e) {}
        bestNote = ' · <span style="color:#00d4ff;">NEW BEST!</span>';
      }
      shake = 14;
      sfx('celebrate');
      gameMessage.innerHTML = `> <span style="color:#00d4ff;">LEVEL ${currentLevel} CLEARED</span> · <span style="color:${medal.color};">${medal.name}</span> · ${elapsedTime.toFixed(1)}s (par ${levelPar}s)${bestNote}<br>> +${bonus} CR · TOTAL ${totalCredits} CR · NEXT LEVEL LOADING...`;
      gameStartBtn.innerHTML = '<i class="fas fa-play"></i> NEXT LEVEL';
      autoRetryTimeout = setTimeout(nextLevel, 1500);
    } else if (reason === 'fall') {
      isDead = true;
      shake = 12;
      sfx('fall');
      gameMessage.innerHTML = `> <span style="color:#ff0080;">YOU FELL ON LEVEL ${currentLevel}.</span> RETRYING...`;
      gameStartBtn.innerHTML = '<i class="fas fa-redo"></i> RETRY LEVEL';
      autoRetryTimeout = setTimeout(autoRetry, AUTO_RETRY_DELAY);
    } else if (reason === 'hit') {
      isDead = true;
      shake = 12;
      gameMessage.innerHTML = `> <span style="color:#ff4d4d;">TURRET FIRE — YOU WERE SHOT ON LEVEL ${currentLevel}.</span> RETRYING...`;
      gameStartBtn.innerHTML = '<i class="fas fa-redo"></i> RETRY LEVEL';
      autoRetryTimeout = setTimeout(autoRetry, AUTO_RETRY_DELAY);
    }
    updateHUD();
  }

  function updateHUD() {
    traceBar.textContent = elapsedTime.toFixed(1) + 's';
    if (parGoalEl) parGoalEl.textContent = levelPar + 's';
    if (creditEl) creditEl.textContent = totalCredits;
    if (speedBar) speedBar.textContent = '★'.repeat(speedStage) + '☆'.repeat(5 - speedStage);
    if (delivered) {
      gameScoreEl.textContent = 'DELIVERED';
    } else if (hasPackage) {
      gameScoreEl.textContent = 'DELIVER →';
    } else {
      gameScoreEl.textContent = 'GRAB PACKAGE';
    }
    gameLevelEl.textContent = `${currentLevel}/10`;
  }

  function drawScene() {
    const sky = ctx.createLinearGradient(0, 0, 0, H);
    sky.addColorStop(0, '#0a0a1a');
    sky.addColorStop(0.6, '#12081e');
    sky.addColorStop(1, '#1a0d2e');
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, W, H);

    ctx.fillStyle = '#0d0d1f';
    for (let i = 0; i < 20; i++) {
      const bx = (i * 140 - cameraX * 0.3) % (W + 200) - 100;
      const bh = 60 + (i * 37) % 120;
      ctx.fillRect(bx, GROUND_Y - bh, 90, bh);
    }
    ctx.fillStyle = '#13132b';
    for (let i = 0; i < 20; i++) {
      const bx = (i * 110 - cameraX * 0.55) % (W + 200) - 100;
      const bh = 40 + (i * 53) % 100;
      ctx.fillRect(bx, GROUND_Y - bh, 70, bh);
    }

    for (let i = 0; i < 10; i++) {
      const bx = (i * 180 - cameraX * 0.55) % (W + 200) - 100;
      ctx.fillStyle = i % 2 === 0 ? '#00d4ff' : '#ff0080';
      ctx.globalAlpha = 0.4 + 0.3 * Math.sin(performance.now() / 400 + i);
      ctx.fillRect(bx + 20, GROUND_Y - 70, 40, 6);
      ctx.globalAlpha = 1;
    }

    const shakeX = shake ? (Math.random() - 0.5) * shake : 0;
    const shakeY = shake ? (Math.random() - 0.5) * shake : 0;
    ctx.save();
    ctx.translate(-cameraX + shakeX, shakeY);

    const tDraw = performance.now() / 1000;
    platforms.forEach(p => {
      const pos = platformState(p, tDraw);
      const accent = p.move ? '#ff0080' : '#00d4ff';
      ctx.fillStyle = '#0f0f1a';
      ctx.fillRect(pos.x, pos.y, p.w, p.h);
      ctx.strokeStyle = accent;
      ctx.lineWidth = 2;
      ctx.shadowColor = accent;
      ctx.shadowBlur = 12;
      ctx.strokeRect(pos.x, pos.y, p.w, p.h);
      ctx.shadowBlur = 0;
      ctx.fillStyle = accent;
      ctx.globalAlpha = 0.7;
      ctx.fillRect(pos.x, pos.y, p.w, 2);
      ctx.globalAlpha = 1;
    });

    // Enemy turrets (level 5+)
    enemies.forEach(e => {
      const p = platforms[e.platformIndex];
      const pos = platformState(p, tDraw);
      const ex = pos.x + p.w / 2 - e.w / 2;
      const ey = pos.y - e.h - 2;
      const cx = ex + e.w / 2;
      const cy = ey + e.h / 2;
      const ang = Math.atan2((player.y + player.h / 2) - cy, (player.x + player.w / 2) - cx);

      // Base glow
      ctx.fillStyle = 'rgba(255,77,77,0.12)';
      ctx.beginPath();
      ctx.arc(cx, cy, 22, 0, Math.PI * 2);
      ctx.fill();

      // Barrel aimed at the courier
      ctx.strokeStyle = '#ff4d4d';
      ctx.lineWidth = 3;
      ctx.shadowColor = '#ff4d4d';
      ctx.shadowBlur = 10;
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.lineTo(cx + Math.cos(ang) * 17, cy + Math.sin(ang) * 17);
      ctx.stroke();

      // Body
      ctx.fillStyle = '#1a0a12';
      ctx.fillRect(ex, ey, e.w, e.h);
      ctx.strokeRect(ex, ey, e.w, e.h);

      // Core — flashes just before it fires
      const charging = e.cooldown < 0.4 && Math.sin(performance.now() / 55) > 0;
      ctx.fillStyle = charging ? '#ffffff' : '#ff4d4d';
      ctx.beginPath();
      ctx.arc(cx, cy, 4.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;
    });

    if (!packageItem.collected) {
      const pulse = 0.6 + 0.4 * Math.sin(performance.now() / 200);
      ctx.fillStyle = '#ff0080';
      ctx.shadowColor = '#ff0080';
      ctx.shadowBlur = 20 * pulse;
      ctx.fillRect(packageItem.x, packageItem.y, packageItem.w, packageItem.h);
      ctx.shadowBlur = 0;
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 2;
      ctx.strokeRect(packageItem.x, packageItem.y, packageItem.w, packageItem.h);
    }

    // Checkpoint flag
    if (checkpoint) {
      const cx = checkpoint.x;
      const cy = checkpoint.y;
      const col = checkpoint.active ? '#00d4ff' : '#5a6b7a';
      // pole
      ctx.fillStyle = col;
      ctx.fillRect(cx + 13, cy + 6, 3, checkpoint.h - 6);
      // flag (waving)
      const wave = Math.sin(performance.now() / 250) * 2.5;
      ctx.fillStyle = col;
      ctx.shadowColor = checkpoint.active ? '#00d4ff' : 'transparent';
      ctx.shadowBlur = checkpoint.active ? 16 : 0;
      ctx.beginPath();
      ctx.moveTo(cx + 16, cy + 6);
      ctx.lineTo(cx + 16 + 14, cy + 9 + wave);
      ctx.lineTo(cx + 16, cy + 20);
      ctx.closePath();
      ctx.fill();
      ctx.shadowBlur = 0;
      // base marker
      ctx.fillStyle = col;
      ctx.fillRect(cx + 9, cy + checkpoint.h - 3, 11, 3);
    }

    const dzPulse = 0.5 + 0.5 * Math.sin(performance.now() / 300);
    ctx.strokeStyle = '#00d4ff';
    ctx.lineWidth = 3;
    ctx.shadowColor = '#00d4ff';
    ctx.shadowBlur = 20 * dzPulse;
    ctx.setLineDash([8, 6]);
    ctx.strokeRect(dropZone.x, dropZone.y, dropZone.w, dropZone.h);
    ctx.setLineDash([]);
    ctx.shadowBlur = 0;
    ctx.fillStyle = '#00d4ff';
    ctx.globalAlpha = 0.15 + 0.1 * dzPulse;
    ctx.fillRect(dropZone.x, dropZone.y, dropZone.w, dropZone.h);
    ctx.globalAlpha = 1;
    ctx.fillStyle = '#00d4ff';
    ctx.font = 'bold 12px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('DROP', dropZone.x + dropZone.w / 2, dropZone.y - 6);

    const px = player.x;
    const py = player.y;

    // Motion trail for a sense of speed
    if (Math.abs(player.vx) > 2 || Math.abs(player.vy) > 4) {
      for (let i = 1; i <= 3; i++) {
        ctx.globalAlpha = 0.14 / i;
        ctx.fillStyle = '#00d4ff';
        ctx.fillRect(px - player.vx * i * 1.6, py - player.vy * i * 1.6, player.w, player.h);
      }
      ctx.globalAlpha = 1;
    }

    ctx.fillStyle = '#00d4ff';
    ctx.shadowColor = '#00d4ff';
    ctx.shadowBlur = 18;
    ctx.fillRect(px, py, player.w, player.h);
    ctx.shadowBlur = 0;
    ctx.fillStyle = '#05050c';
    ctx.fillRect(px + (player.facing > 0 ? 14 : 4), py + 8, 4, 4);
    ctx.fillStyle = '#ff0080';
    ctx.fillRect(px + 2, py + 22, player.w - 4, 4);

    // Air-jump ready indicator (glowing dot above the courier)
    if (!player.onGround && jumpsUsed < 2) {
      ctx.fillStyle = '#ff0080';
      ctx.globalAlpha = 0.4 + 0.5 * Math.sin(performance.now() / 120);
      ctx.beginPath();
      ctx.arc(px + player.w / 2, py - 8, 3, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;
    }

    if (hasPackage && !delivered) {
      ctx.fillStyle = '#ff0080';
      ctx.shadowColor = '#ff0080';
      ctx.shadowBlur = 14;
      ctx.fillRect(px + 4, py - 10, 14, 14);
      ctx.shadowBlur = 0;
    }

    // Enemy projectiles (drawn above the world so they pop)
    bullets.forEach(b => {
      ctx.fillStyle = '#ff4d4d';
      ctx.shadowColor = '#ff4d4d';
      ctx.shadowBlur = 12;
      ctx.globalAlpha = 0.35;
      ctx.fillRect(b.x - b.vx * 1.8, b.y - b.vy * 1.8, b.w, b.h);
      ctx.globalAlpha = 1;
      ctx.fillRect(b.x, b.y, b.w, b.h);
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(b.x + 1.5, b.y + 1.5, 3, 3);
      ctx.shadowBlur = 0;
    });

    particles.forEach(p => {
      ctx.fillStyle = p.color;
      ctx.globalAlpha = p.life;
      ctx.fillRect(p.x, p.y, 3, 3);
    });
    ctx.globalAlpha = 1;

    ctx.restore();

    ctx.strokeStyle = '#00d4ff';
    ctx.globalAlpha = 0.08;
    ctx.lineWidth = 1;
    for (let i = 0; i < 60; i++) {
      const rx = (i * 37 + performance.now() / 3) % W;
      const ry = (i * 53 + performance.now() / 1.5) % H;
      ctx.beginPath();
      ctx.moveTo(rx, ry);
      ctx.lineTo(rx - 4, ry + 12);
      ctx.stroke();
    }
    ctx.globalAlpha = 1;

    const vign = ctx.createRadialGradient(W / 2, H / 2, H / 3, W / 2, H / 2, H);
    vign.addColorStop(0, 'rgba(0,0,0,0)');
    vign.addColorStop(1, 'rgba(0,0,0,0.7)');
    ctx.fillStyle = vign;
    ctx.fillRect(0, 0, W, H);

    if (isDead && !gameActive) {
      ctx.fillStyle = 'rgba(255, 0, 128, 0.15)';
      ctx.fillRect(0, 0, W, H);
      ctx.fillStyle = '#ff0080';
      ctx.font = 'bold 28px monospace';
      ctx.textAlign = 'center';
      ctx.shadowColor = '#ff0080';
      ctx.shadowBlur = 20;
      ctx.fillText('CONNECTION LOST', W / 2, H / 2);
      ctx.shadowBlur = 0;
      ctx.font = '14px monospace';
      ctx.fillStyle = '#00d4ff';
      ctx.fillText('RETRYING LEVEL ' + currentLevel + '...', W / 2, H / 2 + 30);
    }

    if (levelTransitioning) {
      ctx.fillStyle = 'rgba(0, 212, 255, 0.1)';
      ctx.fillRect(0, 0, W, H);
      ctx.fillStyle = '#00d4ff';
      ctx.font = 'bold 28px monospace';
      ctx.textAlign = 'center';
      ctx.shadowColor = '#00d4ff';
      ctx.shadowBlur = 20;
      ctx.fillText('LEVEL ' + currentLevel, W / 2, H / 2);
      ctx.shadowBlur = 0;
      ctx.font = '14px monospace';
      ctx.fillStyle = '#ff0080';
      ctx.fillText('LOADING NEW ROUTE...', W / 2, H / 2 + 30);
    }
  }

  gameCard.addEventListener('click', function() {
    gameModal.classList.add('active');
    currentLevel = 1;
    resetGame();
  });

  gameClose.addEventListener('click', function() {
    gameModal.classList.remove('active');
    gameActive = false;
    isDead = false;
    levelTransitioning = false;
    cancelAnimationFrame(animId);
    clearTimeout(autoRetryTimeout);
    stopMusic();
  });

  gameModal.addEventListener('click', function(e) {
    if (e.target === gameModal) {
      gameModal.classList.remove('active');
      gameActive = false;
      isDead = false;
      levelTransitioning = false;
      cancelAnimationFrame(animId);
      clearTimeout(autoRetryTimeout);
      stopMusic();
    }
  });

  gameStartBtn.addEventListener('click', function() {
    clearTimeout(autoRetryTimeout);
    if (levelTransitioning) {
      // A new level just loaded — start it now instead of waiting
      startRun();
      return;
    }
    if (!gameActive && delivered && currentLevel < MAX_LEVEL) {
      // Just cleared the level — go to the next level immediately
      nextLevel();
      return;
    }
    startRun(); // start, retry, or restart the current level
  });
  // Pause the music while the tab is hidden, resume when it comes back
  document.addEventListener('visibilitychange', function() {
    if (document.hidden) {
      stopMusic();
    } else if (gameActive) {
      startMusic();
    }
  });

  document.addEventListener('keydown', function(e) {
    keys[e.key] = true;
    if (gameModal.classList.contains('active') && [' ', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)) {
      e.preventDefault();
    }
    if (gameActive && !e.repeat && isJumpKey(e.key)) {
      jumpBuffer = JUMP_BUFFER_TIME;
    }
    if (e.key === 'r' || e.key === 'R') {
      if (gameModal.classList.contains('active')) {
        currentLevel = 1;
        startRun();
      }
    }
    if (e.key === 'Escape' && gameModal.classList.contains('active')) {
      gameModal.classList.remove('active');
      gameActive = false;
      isDead = false;
      levelTransitioning = false;
      cancelAnimationFrame(animId);
      clearTimeout(autoRetryTimeout);
      stopMusic();
    }
  });

  document.addEventListener('keyup', function(e) {
    keys[e.key] = false;
    // Variable jump height: releasing early cuts the hop short
    if (gameActive && isJumpKey(e.key) && player && player.vy < 0) {
      player.vy *= JUMP_CUT;
    }
  });

  console.log('%c⚡ NEON CYBER SYSTEM ONLINE ⚡', 'color: #00d4ff; font-size: 20px; font-weight: bold;');
  console.log('%cCJavascript // Front-end Developer', 'color: #ff0080; font-size: 14px;');
  console.log('%c🎮 Neon Courier — 10 Levels of cyberpunk delivery chaos', 'color: #ff0080; font-size: 12px;');

  // expose the game's active flag (used by the audio dock)
  CJ.game = { isActive: function () { return gameActive; } };
})();
