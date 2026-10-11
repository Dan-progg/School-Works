(function() {
  // ===== PAGE NAVIGATION =====
  const buttons = document.querySelectorAll('.dash-btn');
  const pages = {
    landing: document.getElementById('landing'),
    about: document.getElementById('about'),
    skills: document.getElementById('skills'),
    achievements: document.getElementById('achievements'),
    goals: document.getElementById('goals'),
    contact: document.getElementById('contact'),
    portfolio: document.getElementById('portfolio')
  };

  function showPage(pageId) {
    Object.keys(pages).forEach(id => {
      pages[id].classList.remove('active');
    });
    if (pages[pageId]) {
      pages[pageId].classList.add('active');
    }
    buttons.forEach(btn => {
      btn.classList.remove('active');
      if (btn.dataset.page === pageId) {
        btn.classList.add('active');
      }
    });
  }

  buttons.forEach(btn => {
    btn.addEventListener('click', function(e) {
      const page = this.dataset.page;
      if (page) showPage(page);
    });
  });

  const allAboutBtns = document.querySelectorAll('.about-btn');
  allAboutBtns.forEach(btn => {
    btn.addEventListener('click', function(e) {
      const page = this.dataset.page;
      if (page) showPage(page);
    });
  });

  const urlParams = new URLSearchParams(window.location.search);
  const pageParam = urlParams.get('page');
  if (pageParam && pages[pageParam]) {
    showPage(pageParam);
  }

  // ===== VIDEO BACKGROUND AUTOPLAY =====
  const video = document.querySelector('.video-background');
  if (video) {
    video.play().catch(function(error) {
      document.addEventListener('click', function playVideo() {
        video.play();
        document.removeEventListener('click', playVideo);
      }, { once: true });
    });
  }

  // ===== 2D FIGHTER STAGE: two brawlers confined to a neon floor =====
  (function () {
    const tpl = document.getElementById('fighter-tpl');
    if (!tpl) return;
    const MARGIN = 12;
    const GROUND_PAD = 4;   // fighters hug the very bottom of the card
    const MAX_HP = 260;     // higher HP → longer, more relentless rallies
    const ENDLESS = true;   // no knockouts — fighters "second wind" and brawl forever
    const DMG_MIN = 8, DMG_MAX = 16;
    const DASH_SPEED = 210;   // approach run speed (px/s)
    const DASH_MAX = 0.9;     // longest continuous run (s)
    const ENTER_SPEED = 780;  // dash-in entrance speed (px/s)
    const ENTER_TIME = 1.2;   // dash-in entrance safety cap (s)
    const SUPER_SPEED = 360;  // fire-kick dash attack (px/s)
    const SUPER_TIME = 0.5;   // fire-kick duration (s)
    const SUPER_CHANCE = 0.08; // chance an exchange becomes a fire kick
    const UPPER_CHANCE = 0.08; // chance an exchange becomes a rising uppercut
    const JUMPK_CHANCE = 0.07; // chance an exchange becomes a flying jump kick
    const HOOK_CHANCE = 0.07;  // chance an exchange becomes a spinning backfist
    const COMBO_CHANCE = 0.20; // chance an exchange becomes a multi-hit combo
    const WARP_CHANCE = 0.07;  // chance a strike becomes an instant-transmission blitz
    const HEAVY_CHANCE = 0.07; // chance a strike becomes a super-strength haymaker
    const SKILL_CHANCE = 0.08; // chance an exchange becomes a ranged fireball
    const ATTACK_GAP = 0.26;   // base seconds between exchanges (relentless pressure)
    const ATTACK_JITTER = 0.22; // extra random spacing on top of the gap
    const HOP_GRAVITY = 1500;  // px/s² for aerial hops + uppercut launches
    const CAST_TIME = 0.62;    // fireball charge time (s)
    const CAST_BACKSTEP = 300; // px/s back-step while charging (opens range)
    const CAST_FLY_CHANCE = 0.45; // chance a fireball / kame is fired from the air
    const FLY_HOVER = 30;      // hover height while air-casting (px)
    const MAX_LIFT = 120;      // ceiling on combined vertical lift (keeps sprites on-stage)
    const SHOT_SPEED = 470;    // fireball travel speed (px/s)
    const SHOT_DMG = 12;       // fireball base damage
    const WARP_TIME = 0.36;    // instant-transmission strike duration (s)
    const WARP_DMG = 24;       // teleport-strike damage
    const HEAVY_DMG = 22;      // super-strength haymaker damage
    const HEAVY_KNOCK = 26;    // haymaker knockback (px)
    const KAME_CHANCE = 0.05;       // base chance to charge the kamehameha
    const KAME_CHANCE_RAGE = 0.16;  // far more likely while raging
    const KAME_CHARGE = 1.0;        // beam wind-up (s)
    const KAME_FIRE = 0.5;          // beam duration (s)
    const KAME_DMG = 34;            // beam damage
    const DODGE_CHANCE = 0.42;      // chance to evade an incoming attack
    const DODGE_TIME = 0.42;        // evade-roll duration (s)
    const DODGE_SPEED = 430;        // evade-roll speed (px/s)
    const DODGE_CD = 1.5;           // evade cooldown (s)
    const RAGE_AT = 0.35;           // hp fraction that triggers the surge
    const RAGE_TIME = 1.5;          // cinematic transformation duration (s)
    const RAGE_DMG = 1.35;          // outgoing damage multiplier while raging
    const RAGE_GAP = 0.7;           // attack-cooldown multiplier (faster while raging)
    const COMBO_TIME = 1.15;        // total combo duration (s)
    const COMBO_GAP = 0.10;         // gap between combo hits (s) — a rapid flurry
    const COMBO_HITS = 7;           // hits per combo
    const COMBO_DMG = 0.5;          // per-hit combo damage multiplier
    const RUSH_CHANCE = 0.10;       // chance a strike becomes a hyper rush
    const RUSH_CHAIN_CHANCE = 0.4;  // chance a finished combo flows straight into a rush
    const RUSH_TIME = 1.1;          // hyper-rush duration (s)
    const RUSH_GAP = 0.06;          // gap between rush hits (s) — a blur
    const RUSH_HITS = 12;           // hits in a hyper rush
    const RUSH_DMG = 0.42;          // per-hit rush damage multiplier
    // randomized weapons: each brawler wields one and swaps every WEAPON_SWAP seconds
    const WEAPON_SWAP = 8;          // seconds between weapon changes
    const WEAPONS = [
      { id: 'katana', name: 'PLASMA KATANA', dmg: 1.25, reach: 9 },
      { id: 'axe',    name: 'NEON AXE',      dmg: 1.38, reach: 7 },
      { id: 'hammer', name: 'WAR HAMMER',    dmg: 1.5,  reach: 5 },
      { id: 'spear',  name: 'ARC SPEAR',     dmg: 1.2,  reach: 15 },
      { id: 'staff',  name: 'ENERGY STAFF',  dmg: 1.15, reach: 11 },
      { id: 'claw',   name: 'SHOCK CLAW',    dmg: 1.32, reach: 4 }
    ];
    // Kai's signature: Santoryu Ougi — PURGATORY ONIGIRI (three swords, cross slash)
    const ONIGI_CHANCE = 0.12;      // chance a strike becomes the three-sword finisher
    const ONIGI_CHANCE_RAGE = 0.22; // more likely while raging
    const ONIGI_RETREAT = 0.30;     // leap back to open space (s)
    const ONIGI_STANCE = 0.40;      // hold the three-sword stance, aura flaring (s)
    const ONIGI_DASH = 0.16;        // blitz straight through the foe (s)
    const ONIGI_HITS = 3;           // one cut per blade
    const ONIGI_GAP = 0.12;         // gap between the cross cuts (s)
    const ONIGI_DMG = 20;           // damage per cut
    const ONIGI_RECOVER = 0.24;     // sheathe / recovery (s)
    // UNIT-7's signature: GALAXY IMPACT — leaps skyward, then plummets with a Haki smash (Garp)
    const GALAXY_CHANCE = 0.12;      // chance a strike becomes the galaxy smash
    const GALAXY_CHANCE_RAGE = 0.22; // more likely while raging
    const GALAXY_RISE = 0.46;        // soar up, fist cocked overhead (s)
    const GALAXY_DIVE = 0.30;        // plummet down onto the foe (s)
    const GALAXY_FLY = 104;          // peak height of the leap (px)
    const GALAXY_RECOVER = 0.42;     // craters settle / recovery (s)
    const GALAXY_REACH = 2.4;        // shockwave radius as a multiple of body width
    const GALAXY_DMG = 48;           // devastating single blow
    // cinematic slow-motion while a signature skill plays out
    const SLOWMO = 0.42;             // time-scale during the flourish
    const SLOWMO_PULSE = 0.5;        // real seconds each slow-mo beat lasts
    // melee special moves: duration, dash fractions, hit timing, pose + extras
    const MELEE = {
      super:  { dur: 0.50, approach: 0.42, stop: 0.35, speed: 360, hitAt: 0.20, reach: 20, fire: true,  pose: 'kicking' },
      upper:  { dur: 0.56, approach: 0.46, stop: 0.20, speed: 300, hitAt: 0.34, reach: 22, launch: 300, pose: 'uppercutting' },
      jump:   { dur: 0.68, approach: 0.52, stop: 0.45, speed: 350, hitAt: 0.36, reach: 24, jumpV: 300,  fire: true, pose: 'jumpkicking' },
      hook:   { dur: 0.52, approach: 0.44, stop: 0.28, speed: 320, hitAt: 0.30, reach: 20, pose: 'hooking' },
      heavy:  { dur: 0.62, approach: 0.50, stop: 0.30, speed: 250, hitAt: 0.44, reach: 20, heavy: true, pose: 'heavy' }
    };
    const ROSTER = [
      { type: 'human', name: 'KAI' },
      { type: 'cyborg', name: 'UNIT-7' }
    ];
    const arenas = [];

    Object.keys(pages).forEach(function (id) {
      const page = pages[id];
      if (!page) return;
      const arena = page.querySelector('.arena');
      if (!arena) return;

      const fighters = [];
      for (let i = 0; i < 2; i++) {
        const trail = document.createElement('div');
        trail.className = 'dash-trail ' + ROSTER[i].type;
        arena.appendChild(trail);

        const charge = document.createElement('div');
        charge.className = 'sf-charge';
        arena.appendChild(charge);

        const el = tpl.content.firstElementChild.cloneNode(true);
        el.classList.add(ROSTER[i].type);
        arena.appendChild(el);

        // floating name + health bar that hovers ABOVE this fighter
        const hud = document.createElement('div');
        hud.className = 'sf-hud ' + ROSTER[i].type;
        const nameEl = document.createElement('div');
        nameEl.className = 'sf-name';
        nameEl.textContent = ROSTER[i].name;
        const bar = document.createElement('div');
        bar.className = 'sf-bar';
        const fill = document.createElement('div');
        fill.className = 'sf-fill';
        bar.appendChild(fill);
        hud.appendChild(nameEl);
        hud.appendChild(bar);
        arena.appendChild(hud);

        // super-saiyan energy aura (hidden until the surge)
        const aura = document.createElement('div');
        aura.className = 'sf-aura ' + ROSTER[i].type;
        arena.appendChild(aura);

        fighters.push({
          el: el,
          trail: trail,
          charge: charge,
          hud: hud,
          fill: fill,
          aura: aura,
          hudTimer: 0,
          type: ROSTER[i].type,
          name: ROSTER[i].name,
          x: 0, y: 0, tx: 0,
          dir: i === 0 ? 1 : -1,
          speed: 40 + i * 4,
          state: 'idle',          // idle | dash
          wait: 0.4 + i * 0.4,
          dashT: 0,
          hitCd: 0,
          superT: 0, superHit: false, superDir: 1, superHome: 0,
          specT: 0, specType: '', specHit: false, specDir: 1, specHome: 0,
          combo: 0, comboHitT: 0, comboLeft: 0, comboDir: 1, comboHome: 0,
          dodgeT: 0, dodgeDir: 1, dodgeCd: 0,
          kameT: 0, kameState: '', kameHit: false, kameDir: 1, beam: null,
          rage: false, rageT: 0, launchedT: 0,
          warpT: 0, warpHit: false, warpDir: 1,
          rushT: 0, rushHitT: 0, rushLeft: 0, rushDir: 1,
          oniT: 0, oniState: '', oniTotal: 0, oniHit: false, oniLeft: 0, oniGap: 0, oniDir: 1, oniHome: 0,
          oniStanced: false, oniCrossed: false,
          oni: ROSTER[i].name === 'KAI',   // Kai's three-sword-style signature (Purgatory Onigiri)
          galaxyT: 0, galaxyState: '', galaxyTotal: 0, galaxyHit: false, galaxyDir: 1, galaxyH: 0,
          galaxy: ROSTER[i].name === 'UNIT-7',   // UNIT-7's signature (Galaxy Impact)
          weapon: null, weaponT: 0, swingTimer: null, swapTimer: null,
          flyH: 0, flyTarget: 0,
          hop: 0, hopV: 0,
          castT: 0, castFired: false,
          hurtTimer: null,
          hp: MAX_HP
        });
      }

      const spark = document.createElement('div');
      spark.className = 'punch-spark';
      arena.appendChild(spark);

      const flash = document.createElement('div');
      flash.className = 'sf-flash';
      arena.appendChild(flash);

      const announce = document.createElement('div');
      announce.className = 'sf-announce';
      arena.appendChild(announce);

      arenas.push({
        id: id, page: page, el: arena, fighters: fighters,
        spark: spark, flash: flash, announce: announce,
        phase: 'enter',         // enter | fight | ko
        timer: 0, shake: 0, sparkTimer: 0,
        slow: 0,                 // slow-motion timer for signature-skill flourishes
        shots: [],
        koDone: false, round: 0
      });
    });

    if (!arenas.length) return;

    function measures(a) {
      const el = a.fighters[0].el;
      const w = el.offsetWidth || 40;
      const h = el.offsetHeight || 56;
      const cw = a.el.clientWidth;
      const ch = a.el.clientHeight;
      return {
        w: w, h: h,
        minX: MARGIN,
        maxX: Math.max(MARGIN, cw - w - MARGIN),
        groundY: Math.max(h, ch - GROUND_PAD)
      };
    }

    function baseY(m, f, frac) {
      const lift = Math.min((f.hop || 0) + (f.flyH || 0) + (f.galaxyH || 0), MAX_LIFT);
      return m.groundY - m.h * frac - lift;
    }

    function applyF(m, f) {
      f.y = baseY(m, f, 1);
      f.el.style.transform =
        'translate3d(' + f.x.toFixed(1) + 'px,' + f.y.toFixed(1) + 'px,0) scaleX(' + f.dir + ')';
    }

    function setBars(a) {
      a.fighters.forEach(function (f) {
        if (!f.fill) return;
        const pct = Math.max(0, f.hp) / MAX_HP;
        f.fill.style.transform = 'scaleX(' + pct.toFixed(3) + ')';
        f.fill.classList.toggle('low', pct <= RAGE_AT);
      });
    }

    // keep each name/health bar pinned just above its fighter's head
    function updateHud(m, f, dt) {
      if (f.dodgeCd > 0) f.dodgeCd -= dt;
      if (f.launchedT > 0) {
        f.launchedT -= dt;
        f.el.classList.toggle('launched', f.launchedT > 0);
      }
      // ease the hover height while air-casting / flying
      const flyTo = f.flyTarget || 0;
      if (Math.abs(f.flyH - flyTo) > 0.2) {
        f.flyH += (flyTo - f.flyH) * Math.min(1, dt * 6);
      } else {
        f.flyH = flyTo;
      }
      f.el.classList.toggle('flying', f.flyH > 3 || f.galaxyH > 3);
      updateAura(m, f);
      if (!f.hud) return;
      if (f.hudTimer > 0) {
        f.hudTimer -= dt;
        if (f.hudTimer <= 0) f.hud.classList.remove('show');
      }
      f.hud.style.left = (f.x + m.w / 2).toFixed(1) + 'px';
      f.hud.style.top = (f.y - 4).toFixed(1) + 'px';
    }

    // ---- randomized weapons: equip, swap on a timer, and swing on a landed strike ----

    function weaponDmg(f) {
      return f.weapon ? f.weapon.dmg : 1;
    }

    function weaponReach(f) {
      return f.weapon ? f.weapon.reach : 0;
    }

    function equipWeapon(a, f, force) {
      const m = measures(a);
      // prefer a different weapon than the one currently held
      let idx = Math.floor(Math.random() * WEAPONS.length);
      if (f.weapon && WEAPONS.length > 1 && WEAPONS[idx] === f.weapon) {
        idx = (idx + 1) % WEAPONS.length;
      }
      f.weapon = WEAPONS[idx];
      f.weaponT = WEAPON_SWAP;
      f.el.classList.remove('weapon-katana', 'weapon-axe', 'weapon-hammer', 'weapon-spear', 'weapon-staff', 'weapon-claw');
      f.el.classList.add('weapon-' + f.weapon.id);
      if (force) return;
      // brief pop as the new weapon materializes in hand
      f.el.classList.remove('weapon-swap');
      void f.el.offsetWidth; // restart the CSS animation
      f.el.classList.add('weapon-swap');
      if (f.swapTimer) clearTimeout(f.swapTimer);
      f.swapTimer = setTimeout(function () {
        f.el.classList.remove('weapon-swap');
        f.swapTimer = null;
      }, 360);
      spawnFade(a, 'sf-burst', f.x + m.w / 2, baseY(m, f, 0.5), 520);
    }

    function swingWeapon(f) {
      if (!f.weapon) return;
      f.el.classList.remove('swinging');
      void f.el.offsetWidth; // restart the CSS animation
      f.el.classList.add('swinging');
      if (f.swingTimer) clearTimeout(f.swingTimer);
      f.swingTimer = setTimeout(function () {
        f.el.classList.remove('swinging');
        f.swingTimer = null;
      }, 300);
    }

    function say(a, text) {
      a.announce.textContent = text;
      a.announce.classList.remove('show');
      void a.announce.offsetWidth; // restart the CSS animation
      a.announce.classList.add('show');
    }

    function resetArena(a) {
      const m = measures(a);
      const midX = (m.minX + m.maxX) / 2;
      a.fighters.forEach(function (f, i) {
        f.x = i === 0 ? m.minX : m.maxX;      // start at the sides...
        f.tx = midX + (i === 0 ? -24 : 24);   // ...then dash in to the clash line
        f.dir = i === 0 ? 1 : -1;
        f.state = 'dash';
        f.wait = 0;
        f.hitCd = 0;
        f.hp = MAX_HP;
        f.dashT = DASH_MAX;
        f.superT = 0; f.superHit = false;
        f.specT = 0; f.specType = ''; f.specHit = false;
        f.combo = 0; f.comboHitT = 0; f.comboLeft = 0;
        f.rushT = 0; f.rushHitT = 0; f.rushLeft = 0;
        f.oniT = 0; f.oniState = '';
        f.oniStanced = false; f.oniCrossed = false;
        f.galaxyT = 0; f.galaxyState = ''; f.galaxyHit = false;
        f.dodgeT = 0; f.dodgeCd = 0;
        cancelKame(f);
        f.rage = false; f.rageT = 0; f.launchedT = 0;
        f.warpT = 0; f.warpHit = false; f.flyH = 0; f.flyTarget = 0;
        f.hop = 0; f.hopV = 0;
        f.castT = 0; f.castFired = false;
        if (f.hurtTimer) { clearTimeout(f.hurtTimer); f.hurtTimer = null; }
        f.el.classList.remove('walking', 'running', 'kicking', 'uppercutting', 'jumpkicking', 'hooking', 'heavy', 'warping', 'flying', 'rushing', 'swinging', 'onigi', 'onigi-stance', 'onigi-slash', 'galaxy', 'galaxy-dive', 'galaxy-hit', 'casting', 'combos', 'dodging', 'kamecharge', 'kame', 'rage', 'launched', 'fighting', 'hurt', 'ko', 'win');
        equipWeapon(a, f, true);   // start every bout with a fresh random weapon
        if (f.aura) f.aura.classList.remove('show');
        f.el.classList.add('running');
        showTrail(f);
        f.trail.classList.remove('fire');
        f.trail.classList.remove('rev');
        f.charge.classList.remove('show');
        f.charge.style.opacity = '0';
        f.hudTimer = 0;
        if (f.hud) f.hud.classList.remove('show');
        applyF(m, f);
      });
      clearShots(a);
      a.phase = 'enter';
      a.timer = ENTER_TIME;
      a.round = 0;
      a.koDone = false;
      a.shake = 0;
      a.slow = 0;
      a.el.style.transform = '';
      a.announce.classList.remove('show');
      if (a.flash) a.flash.classList.remove('show', 'gold');
      setBars(a);
    }

    function updateTrail(m, f, fire) {
      const len = 38;
      const cy = baseY(m, f, 0.58);
      const cx = f.x + m.w / 2;
      f.trail.style.top = cy.toFixed(1) + 'px';
      f.trail.style.width = len + 'px';
      f.trail.style.left = (f.dir === 1 ? cx - len : cx).toFixed(1) + 'px';
      f.trail.classList.toggle('rev', f.dir === -1);
      f.trail.classList.toggle('fire', !!fire);
    }

    function showTrail(f) { f.trail.classList.add('active'); }
    function hideTrail(f) { f.trail.classList.remove('active', 'fire'); }

    function showSpark(a, x, y, big) {
      a.spark.style.left = x.toFixed(1) + 'px';
      a.spark.style.top = y.toFixed(1) + 'px';
      a.spark.classList.toggle('super', !!big);
      a.spark.classList.remove('show');
      void a.spark.offsetWidth; // restart the CSS animation
      a.spark.classList.add('show');
      a.sparkTimer = big ? 0.42 : 0.26;
    }

    // ---- fireball skill: charge in the hands, hurl a long-range blast ----

    function showCharge(f) { f.charge.classList.add('show'); }
    function hideCharge(f) {
      f.charge.classList.remove('show');
      f.charge.style.opacity = '0';
    }

    function positionCharge(m, f, p) {
      const x = f.x + (f.dir === 1 ? m.w * 0.74 : m.w * 0.26);
      const y = baseY(m, f, 0.62);
      f.charge.style.left = x.toFixed(1) + 'px';
      f.charge.style.top = y.toFixed(1) + 'px';
      f.charge.style.transform = 'translate(-50%,-50%) scale(' + (0.35 + p * 1.15).toFixed(2) + ')';
      f.charge.style.opacity = (0.4 + p * 0.6).toFixed(2);
    }

    function startCast(a, m, f) {
      f.castT = CAST_TIME;
      f.castFired = false;
      // fireballs can be launched from a hover or straight off the floor
      f.flyTarget = Math.random() < CAST_FLY_CHANCE ? FLY_HOVER : 0;
      f.el.classList.add('casting');
      showCharge(f);
      const foe = f === a.fighters[0] ? a.fighters[1] : a.fighters[0];
      tryDodge(a, m, foe);   // the foe may roll out of the fireball's path
    }

    function updateCast(a, m, f, dt) {
      if (f.castT <= 0) return false;
      f.castT -= dt;
      // back-step while winding up so the blast travels a long way
      if (f.castT > CAST_TIME * 0.58) {
        f.x += (f.dir === 1 ? -1 : 1) * CAST_BACKSTEP * dt;
      }
      const p = Math.min(1, Math.max(0, (CAST_TIME - f.castT - CAST_TIME * 0.15) / (CAST_TIME * 0.75)));
      positionCharge(m, f, p);
      if (!f.castFired && f.castT <= 0.08) {
        f.castFired = true;
        fireShot(a, m, f);
      }
      f.x = Math.min(Math.max(f.x, m.minX), m.maxX);
      if (f.castT <= 0) {
        f.castT = 0;
        f.el.classList.remove('casting');
        hideCharge(f);
        f.flyTarget = 0;
      }
      return true;
    }

    function showHud(f) {
      if (!f.hud) return;
      f.hud.classList.add('show');
    }

    function applyDamage(a, m, target, dmg, big, knock) {
      // a well-timed evade roll (or a mid-transformation surge) shrugs it off
      if (target.dodgeT > 0 || target.rageT > 0) return false;
      target.hp = Math.max(0, target.hp - dmg);
      setBars(a);
      // the name + health bar only pops up while someone is taking damage
      target.hudTimer = 2.4;
      showHud(target);
      // getting hit interrupts a wind-up (fireball or kamehameha)
      interruptCast(target);
      target.el.classList.remove('hurt');
      void target.el.offsetWidth;
      target.el.classList.add('hurt');
      if (target.hurtTimer) clearTimeout(target.hurtTimer);
      target.hurtTimer = setTimeout(function () {
        target.el.classList.remove('hurt');
        target.hurtTimer = null;
      }, 170);
      const dir = target === a.fighters[1] ? 1 : -1;
      const kb = knock != null ? knock : (big ? 9 : 5);
      target.x += dir * kb;
      target.x = Math.min(Math.max(target.x, m.minX), m.maxX);
      applyF(m, target);
      // dropped low enough? fire the rage surge, once per bout
      if (!target.rage && target.hp > 0 && target.hp <= MAX_HP * RAGE_AT) triggerRage(a, m, target);
      return true;
    }

    function interruptCast(target) {
      if (target.castT > 0) {
        target.castT = 0; target.castFired = false;
        target.el.classList.remove('casting');
        hideCharge(target);
      }
      if (target.kameT > 0 && target.kameState === 'charge') cancelKame(target);
    }

    function fireShot(a, m, f) {
      const dir = f.dir;
      const x = f.x + (dir === 1 ? m.w * 0.76 : m.w * 0.24);
      const y = baseY(m, f, 0.62);
      const el = document.createElement('div');
      el.className = 'sf-shot' + (dir === -1 ? ' rev' : '');
      el.style.left = x.toFixed(1) + 'px';
      el.style.top = y.toFixed(1) + 'px';
      a.el.appendChild(el);
      a.shots.push({ el: el, x: x, y: y, dir: dir, owner: f });
      showSpark(a, x, y, false); // muzzle flash
    }

    function clearShots(a) {
      a.shots.forEach(function (s) { if (s.el && s.el.remove) s.el.remove(); });
      a.shots = [];
    }

    function updateShots(a, m, dt) {
      if (!a.shots.length) return;
      const fighting = a.phase === 'fight';
      a.shots = a.shots.filter(function (s) {
        s.x += s.dir * SHOT_SPEED * dt;
        s.el.style.left = s.x.toFixed(1) + 'px';
        const target = s.owner === a.fighters[0] ? a.fighters[1] : a.fighters[0];
        const tx0 = target.x, tx1 = target.x + m.w;
        const hit = s.dir === 1 ? (s.x >= tx0 && s.x <= tx1)
                                : (s.x <= tx1 && s.x >= tx0);
        if (hit && !target.el.classList.contains('ko')) {
          if (fighting) applyDamage(a, m, target, SHOT_DMG + Math.floor(Math.random() * 7), true);
          showSpark(a, s.x, s.y, true);
          a.shake = 13;
          if (s.el.remove) s.el.remove();
          return false;
        }
        const off = s.dir === 1 ? (s.x > m.maxX + m.w + 60) : (s.x < m.minX - 60);
        if (off) { if (s.el.remove) s.el.remove(); return false; }
        return true;
      });
    }

    function startFight(a, m) {
      const f0 = a.fighters[0], f1 = a.fighters[1];

      // keep f0 on the left / f1 on the right so the HUD lines up
      if (f0.x > f1.x) { const t = f0.x; f0.x = f1.x; f1.x = t; }
      const mid = (f0.x + f1.x) / 2;
      f0.x = Math.min(Math.max(mid - 24, m.minX), m.maxX);
      f1.x = Math.min(Math.max(mid + 24, m.minX), m.maxX);
      f0.dir = 1; f1.dir = -1;

      f0.hp = MAX_HP; f1.hp = MAX_HP;
      f0.hitCd = 0.42; f1.hitCd = 0.72;
      f0.state = 'idle'; f1.state = 'idle';

      [f0, f1].forEach(function (f) {
        if (f.hurtTimer) { clearTimeout(f.hurtTimer); f.hurtTimer = null; }
        f.dashT = 0; f.superT = 0; f.superHit = false;
        f.specT = 0; f.specType = ''; f.specHit = false;
        f.combo = 0; f.comboHitT = 0; f.comboLeft = 0;
        f.rushT = 0; f.rushHitT = 0; f.rushLeft = 0;
        f.oniT = 0; f.oniState = '';
        f.oniStanced = false; f.oniCrossed = false;
        f.galaxyT = 0; f.galaxyState = ''; f.galaxyHit = false;
        f.dodgeT = 0; f.dodgeCd = 0;
        cancelKame(f);
        f.rage = false; f.rageT = 0; f.launchedT = 0;
        f.warpT = 0; f.warpHit = false; f.flyH = 0; f.flyTarget = 0;
        f.hop = 0; f.hopV = 0;
        f.castT = 0; f.castFired = false;
        f.el.classList.remove('walking', 'running', 'kicking', 'uppercutting', 'jumpkicking', 'hooking', 'heavy', 'warping', 'flying', 'rushing', 'swinging', 'onigi', 'onigi-stance', 'onigi-slash', 'galaxy', 'galaxy-dive', 'galaxy-hit', 'casting', 'combos', 'dodging', 'kamecharge', 'kame', 'rage', 'launched', 'hurt', 'ko', 'win');
        if (f.aura) f.aura.classList.remove('show');
        hideTrail(f);
        hideCharge(f);
        f.el.classList.add('fighting');
        f.hudTimer = 1.4;
        showHud(f);
        applyF(m, f);
      });

      setBars(a);
      clearShots(a);
      a.phase = 'fight';     // no entry delay — the bout is already on
      a.timer = 0;
      a.round++;
      say(a, a.round === 1 ? 'FIGHT!' : 'ROUND ' + a.round);
    }

    function landHit(a, m, attacker, target, big) {
      let dmg = big
        ? 18 + Math.floor(Math.random() * 9)
        : DMG_MIN + Math.floor(Math.random() * (DMG_MAX - DMG_MIN + 1));
      if (attacker.rage) dmg = Math.round(dmg * RAGE_DMG);
      dmg = Math.round(dmg * weaponDmg(attacker));   // the equipped weapon hits harder
      const hit = applyDamage(a, m, target, dmg, big);
      showSpark(a, (attacker.x + target.x) / 2 + m.w / 2, m.groundY - m.h * 0.55, big);
      a.shake = hit ? (big ? 14 : 6) : 3;   // a whiff barely rattles the stage
    }

    // ---- melee specials: fire kick, uppercut, jump kick, spinning backfist ----

    function startMelee(a, m, attacker, target, type) {
      const cfg = MELEE[type];
      if (!cfg) return;
      attacker.specType = type;
      attacker.specT = cfg.dur;
      attacker.specHit = false;
      attacker.specDir = target.x >= attacker.x ? 1 : -1;
      attacker.specHome = attacker.x;
      attacker.el.classList.add(cfg.pose);
      if (cfg.jumpV && attacker.hop === 0) attacker.hopV = cfg.jumpV;   // leap into the air
      if (cfg.fire) showTrail(attacker);
      if (type === 'super') say(a, 'SUPER!');
      tryDodge(a, m, target);   // the foe may read it and roll away
    }

    function clearMeleeClass(f) {
      f.el.classList.remove('kicking', 'uppercutting', 'jumpkicking', 'hooking', 'heavy');
    }

    // roll one of the attacks for a fighter
    function chooseStrike(a, m, f, foe) {
      const r = Math.random();
      let acc = SUPER_CHANCE;
      if (r < acc) return startMelee(a, m, f, foe, 'super');
      acc += UPPER_CHANCE;
      if (r < acc) return startMelee(a, m, f, foe, 'upper');
      acc += JUMPK_CHANCE;
      if (r < acc) return startMelee(a, m, f, foe, 'jump');
      acc += HOOK_CHANCE;
      if (r < acc) return startMelee(a, m, f, foe, 'hook');
      acc += HEAVY_CHANCE;
      if (r < acc) return startMelee(a, m, f, foe, 'heavy');
      acc += COMBO_CHANCE;
      if (r < acc) return startCombo(a, m, f, foe);
      acc += RUSH_CHANCE;
      if (r < acc) return startRush(a, m, f, foe);
      if (f.oni) {                                   // Kai's three-sword finisher
        acc += (f.rage ? ONIGI_CHANCE_RAGE : ONIGI_CHANCE);
        if (r < acc) return startOnigi(a, m, f, foe);
      }
      if (f.galaxy) {                                // UNIT-7's Haki ground smash
        acc += (f.rage ? GALAXY_CHANCE_RAGE : GALAXY_CHANCE);
        if (r < acc) return startGalaxy(a, m, f, foe);
      }
      acc += WARP_CHANCE;
      if (r < acc) return startWarp(a, m, f, foe);
      acc += (f.rage ? KAME_CHANCE_RAGE : KAME_CHANCE);
      if (r < acc) return startKame(a, m, f);
      acc += SKILL_CHANCE;
      if (r < acc) return startCast(a, m, f);
      swingWeapon(f);                       // a plain strike drives the weapon in an arc
      return landHit(a, m, f, foe);
    }

    function updateMelee(a, m, f, foe, dt) {
      if (f.specT <= 0) return false;
      const cfg = MELEE[f.specType];
      if (!cfg) { f.specT = 0; clearMeleeClass(f); return false; }

      f.specT -= dt;
      const elapsed = cfg.dur - f.specT;
      const dir = f.specDir;

      // rush in on the foe, then dash back home to recover
      const tx = elapsed < cfg.dur * cfg.approach
        ? foe.x + dir * (m.w * cfg.stop)
        : f.specHome;
      const dd = tx - f.x;
      if (Math.abs(dd) > 1.5) {
        f.x += (dd < 0 ? -1 : 1) * Math.min(Math.abs(dd), cfg.speed * dt);
        f.dir = dd < 0 ? -1 : 1;
      }
      f.x = Math.min(Math.max(f.x, m.minX), m.maxX);
      if (cfg.fire) updateTrail(m, f, elapsed < cfg.dur * cfg.approach);

      // connect exactly once, partway through
      if (!f.specHit && elapsed >= cfg.dur * cfg.hitAt) {
        const near = Math.abs(foe.x - f.x) < m.w + cfg.reach + weaponReach(f);
        const airOk = !cfg.jumpV || f.hop > m.h * 0.3;
        if (near && airOk) {
          f.specHit = true;
          if (cfg.heavy) {
            heavyHit(a, m, f, foe);                       // ground-shattering haymaker
          } else {
            landHit(a, m, f, foe, true);
            if (cfg.launch && foe.hop === 0) foe.hopV = cfg.launch;   // launch them skyward
          }
        }
      }

      if (f.specT <= 0) {
        f.specT = 0;
        clearMeleeClass(f);
        hideTrail(f);
      }
      return true;
    }

    // vertical hop used by jump kicks and uppercut launches
    function stepHop(m, f, dt) {
      if (f.hop <= 0 && f.hopV <= 0) return;
      f.hopV -= HOP_GRAVITY * dt;
      f.hop += f.hopV * dt;
      if (f.hop <= 0) { f.hop = 0; f.hopV = 0; }
    }

    function isBusy(f) {
      return f.specT > 0 || f.combo > 0 || f.rushT > 0 || f.oniT > 0 || f.galaxyT > 0 || f.dodgeT > 0 || f.kameT > 0 || f.warpT > 0 || f.rageT > 0;
    }

    // ---- impact FX: screen flash, shockwave ring, warp streaks, floor cracks ----

    function spawnFade(a, cls, x, y, life) {
      const el = document.createElement('div');
      el.className = cls;
      el.style.left = x.toFixed(1) + 'px';
      el.style.top = y.toFixed(1) + 'px';
      a.el.appendChild(el);
      setTimeout(function () { if (el.remove) el.remove(); }, life);
    }

    function screenFlash(a, gold) {
      if (!a.flash) return;
      a.flash.classList.toggle('gold', !!gold);
      a.flash.classList.remove('show');
      void a.flash.offsetWidth;   // restart the fade animation
      a.flash.classList.add('show');
    }

    // hold the whole bout in slow-motion for a beat (signature-skill flourish)
    function slowMo(a, dur) {
      a.slow = Math.max(a.slow || 0, dur);
    }

    // the fighter currently unleashing a signature skill (or null)
    function superCaster(a) {
      const f0 = a.fighters[0], f1 = a.fighters[1];
      if (f0.oniT > 0 || f0.galaxyT > 0) return f0;
      if (f1.oniT > 0 || f1.galaxyT > 0) return f1;
      return null;
    }

    // ---- super-strength haymaker: cracks the floor + heavy screen shake ----

    function heavyHit(a, m, f, foe) {
      const dmg = Math.round(HEAVY_DMG * (f.rage ? RAGE_DMG : 1) * weaponDmg(f));
      const hit = applyDamage(a, m, foe, dmg, true, HEAVY_KNOCK);
      showSpark(a, (f.x + foe.x) / 2 + m.w / 2, baseY(m, foe, 0.5), true);
      spawnFade(a, 'sf-crack', foe.x + m.w / 2, m.groundY, 640);
      a.shake = hit ? 30 : 8;                 // the whole stage rattles
      if (hit) knockUp(m, foe, 220);
    }

    // ---- instant transmission: vanish, warp in behind the foe, blitz them ----

    function startWarp(a, m, f, foe) {
      spawnFade(a, 'sf-warp', f.x + m.w / 2, baseY(m, f, 0.55), 320);   // vanish streak

      const side = foe.x >= f.x ? 1 : -1;
      let nx = foe.x + side * (m.w * 0.62);   // reappear behind the foe
      nx = Math.min(Math.max(nx, m.minX), m.maxX);
      f.x = nx;
      f.dir = -side;                          // spin to face them
      applyF(m, f);

      spawnFade(a, 'sf-warp', foe.x + m.w / 2, baseY(m, foe, 0.55), 320); // arrive streak
      screenFlash(a, true);

      f.warpT = WARP_TIME;
      f.warpHit = false;
      f.warpDir = f.dir;
      f.el.classList.add('warping');
      say(a, 'INSTANT!');
      tryDodge(a, m, foe);
    }

    function updateWarp(a, m, f, foe, dt) {
      if (f.warpT <= 0) return false;
      f.warpT -= dt;
      const elapsed = WARP_TIME - f.warpT;
      if (!f.warpHit && elapsed >= 0.09) {
        f.warpHit = true;
        const dmg = Math.round(WARP_DMG * (f.rage ? RAGE_DMG : 1));
        const hit = applyDamage(a, m, foe, dmg, true, 16);
        showSpark(a, foe.x + m.w / 2, baseY(m, foe, 0.55), true);
        a.shake = hit ? 16 : 5;
        if (hit) knockUp(m, foe, 230);
      }
      if (f.warpT <= 0) {
        f.warpT = 0;
        f.el.classList.remove('warping');
      }
      return true;
    }

    function knockUp(m, f, v) {
      f.hopV = v;
      f.launchedT = 0.7;
    }

    // ---- evade roll: dive back out of an incoming attack ----

    function startDodge(a, m, f) {
      if (f.dodgeT > 0 || f.dodgeCd > 0 || f.el.classList.contains('ko')) return;
      f.dodgeT = DODGE_TIME;
      f.dodgeDir = f.dir === 1 ? -1 : 1;     // roll away from the foe
      f.dodgeCd = DODGE_CD + Math.random() * 0.6;
      f.el.classList.add('dodging');
      f.hopV = 95;                            // little evasive leap
      showTrail(f);
    }

    function updateDodge(m, f, dt) {
      if (f.dodgeT <= 0) return false;
      f.dodgeT -= dt;
      f.x += f.dodgeDir * DODGE_SPEED * dt;
      f.x = Math.min(Math.max(f.x, m.minX), m.maxX);
      updateTrail(m, f, false);
      if (f.dodgeT <= 0) {
        f.dodgeT = 0;
        f.el.classList.remove('dodging');
        hideTrail(f);
      }
      return true;
    }

    // the defender may answer an incoming attack with an evade roll
    function tryDodge(a, m, defender) {
      if (defender.specT > 0 || defender.combo > 0 || defender.kameT > 0 || defender.dodgeT > 0 || defender.dodgeCd > 0) return;
      if (Math.random() < DODGE_CHANCE) startDodge(a, m, defender);
    }

    // ---- multi-hit combo: close in and rattle off fast strikes ----

    function startCombo(a, m, f, foe) {
      f.combo = COMBO_TIME;
      f.comboLeft = COMBO_HITS;
      f.comboHitT = 0;
      f.comboDir = foe.x >= f.x ? 1 : -1;
      f.comboHome = f.x;
      f.el.classList.remove('swinging');
      f.el.classList.add('combos');
      f.comboHome = f.x;
      tryDodge(a, m, foe);
    }

    function updateCombo(a, m, f, foe, dt) {
      if (f.combo <= 0) return false;
      f.combo -= dt;
      const dir = f.comboDir;
      const tx = foe.x + (dir === 1 ? -1 : 1) * (m.w * 0.28);
      const dd = tx - f.x;
      if (Math.abs(dd) > 1.5) {
        f.x += (dd < 0 ? -1 : 1) * Math.min(Math.abs(dd), 240 * dt);
        f.dir = dd < 0 ? -1 : 1;
      }
      f.x = Math.min(Math.max(f.x, m.minX), m.maxX);

      f.comboHitT -= dt;
      if (f.comboLeft > 0 && f.comboHitT <= 0 && Math.abs(foe.x - f.x) < m.w + 26 + weaponReach(f)) {
        f.comboHitT = COMBO_GAP;
        f.comboLeft--;
        const last = f.comboLeft === 0;
        const dmg = Math.round((DMG_MIN + DMG_MAX) / 2 * COMBO_DMG * (f.rage ? RAGE_DMG : 1) * weaponDmg(f));
        if (applyDamage(a, m, foe, dmg, true, last ? 18 : 3)) {
          showSpark(a, (f.x + foe.x) / 2 + m.w / 2, m.groundY - m.h * (0.45 + Math.random() * 0.25), last);
          a.shake = last ? 12 : 5;
        }
        if (last && foe.dodgeT <= 0) knockUp(m, foe, 260);
      }

      if (f.combo <= 0) {
        f.combo = 0;
        f.el.classList.remove('combos');
        // a finished combo can flow straight into a hyper rush with no gap
        if (!f.el.classList.contains('ko') && Math.abs(foe.x - f.x) < m.w + 34 &&
            Math.random() < RUSH_CHAIN_CHANCE) {
          startRush(a, m, f, foe);
        }
      }
      return true;
    }

    // ---- hyper rush: a seamless blur of chained strikes that ends in a launcher ----

    function startRush(a, m, f, foe) {
      if (f.el.classList.contains('ko')) return;
      f.rushT = RUSH_TIME;
      f.rushLeft = RUSH_HITS;
      f.rushHitT = 0;
      f.rushDir = foe.x >= f.x ? 1 : -1;
      f.el.classList.remove('swinging');
      f.el.classList.add('rushing');
      showTrail(f);
      say(a, f.name + ' · RUSH!');
      tryDodge(a, m, foe);
    }

    function updateRush(a, m, f, foe, dt) {
      if (f.rushT <= 0) return false;
      f.rushT -= dt;

      // shadow the foe relentlessly, always facing them
      const dir = foe.x >= f.x ? 1 : -1;
      f.rushDir = dir;
      const dd = (foe.x + (dir === 1 ? -1 : 1) * m.w * 0.3) - f.x;
      if (Math.abs(dd) > 1.5) {
        f.x += (dd < 0 ? -1 : 1) * Math.min(Math.abs(dd), 330 * dt);
        f.dir = dd < 0 ? -1 : 1;
      }
      f.x = Math.min(Math.max(f.x, m.minX), m.maxX);
      updateTrail(m, f, false);

      f.rushHitT -= dt;
      if (f.rushLeft > 0 && f.rushHitT <= 0 && Math.abs(foe.x - f.x) < m.w + 30 + weaponReach(f)) {
        f.rushHitT = RUSH_GAP;
        f.rushLeft--;
        const landed = RUSH_HITS - f.rushLeft;          // 1..RUSH_HITS
        const last = f.rushLeft === 0;
        const dmg = Math.round((DMG_MIN + DMG_MAX) / 2 * RUSH_DMG * (f.rage ? RAGE_DMG : 1) * weaponDmg(f));
        if (applyDamage(a, m, foe, dmg, last, last ? 22 : 2)) {
          showSpark(a, (f.x + foe.x) / 2 + m.w / 2, m.groundY - m.h * (0.4 + Math.random() * 0.35), last);
          a.shake = Math.max(a.shake, 4 + landed);      // shake ramps up with every hit
        }
        if (last && foe.dodgeT <= 0) {
          knockUp(m, foe, 320);
          spawnFade(a, 'sf-burst', foe.x + m.w / 2, baseY(m, foe, 0.5), 640);
        }
      }

      if (f.rushT <= 0) {
        f.rushT = 0;
        f.el.classList.remove('rushing');
        hideTrail(f);
      }
      return true;
    }

    // ---- Kai's signature: Santoryu Ougi — PURGATORY ONIGIRI (three-sword cross slash) ----

    function spawnOnigi(a, x, y, slow) {
      const el = document.createElement('div');
      el.className = 'sf-onigi' + (slow ? ' slow' : '');
      el.style.left = x.toFixed(1) + 'px';
      el.style.top = y.toFixed(1) + 'px';
      a.el.appendChild(el);
      void el.offsetWidth;                 // commit the initial state so the anim plays
      el.classList.add('show');
      setTimeout(function () { if (el.remove) el.remove(); }, slow ? 1150 : 640);
    }

    function startOnigi(a, m, f, foe) {
      if (!f.oni || f.el.classList.contains('ko')) return;
      f.oniState = 'open';
      f.oniTotal = ONIGI_RETREAT + ONIGI_STANCE + ONIGI_DASH + ONIGI_HITS * ONIGI_GAP + ONIGI_RECOVER;
      f.oniT = f.oniTotal;
      f.oniHit = false;
      f.oniStanced = false;
      f.oniCrossed = false;
      f.oniLeft = ONIGI_HITS;
      f.oniGap = 0;
      f.oniDir = foe.x >= f.x ? 1 : -1;
      f.oniHome = f.x;
      f.flyTarget = 0;      // settle to the ground for the three-sword stance
      f.el.classList.remove('swinging');
      f.el.classList.add('onigi');
      showTrail(f);
      say(a, 'SANTORYU · PURGATORY ONIGIRI!');
      slowMo(a, SLOWMO_PULSE);     // the retreat + draw hangs for a beat
      tryDodge(a, m, foe);
    }

    function updateOnigi(a, m, f, foe, dt) {
      if (f.oniT <= 0) return false;
      f.oniT -= dt;
      const elapsed = f.oniTotal - f.oniT;
      const dir = f.oniDir;
      const tStance = ONIGI_RETREAT;
      const tDash = tStance + ONIGI_STANCE;
      const tCross = tDash + ONIGI_DASH;

      if (elapsed < tStance) {
        // OPEN: leap back to open space and draw all three blades
        const away = -dir;
        const tx = Math.min(Math.max(foe.x + away * (m.w * 3.4), m.minX), m.maxX);
        const dd = tx - f.x;
        if (Math.abs(dd) > 1.5) f.x += (dd < 0 ? -1 : 1) * Math.min(Math.abs(dd), 640 * dt);
        f.x = Math.min(Math.max(f.x, m.minX), m.maxX);
        f.dir = foe.x >= f.x ? 1 : -1;
        updateTrail(m, f, false);
      } else if (elapsed < tDash) {
        // STANCE: hold the three-sword guard, aura flaring, then commit
        if (!f.oniStanced) {
          f.oniStanced = true;
          f.el.classList.add('onigi-stance');
          spawnFade(a, 'sf-burst', f.x + m.w / 2, baseY(m, f, 0.5), 560);
          slowMo(a, SLOWMO_PULSE);   // the stance is held in slow-motion
        }
        f.dir = foe.x >= f.x ? 1 : -1;
        updateTrail(m, f, false);
      } else if (elapsed < tCross) {
        // BLITZ: rocket straight through the foe
        f.el.classList.remove('onigi-stance');
        const side = foe.x >= f.x ? 1 : -1;
        const nx = Math.min(Math.max(foe.x + side * (m.w * 0.8), m.minX), m.maxX);
        const dd = nx - f.x;
        if (Math.abs(dd) > 1.5) f.x += (dd < 0 ? -1 : 1) * Math.min(Math.abs(dd), 3200 * dt);
        f.x = Math.min(Math.max(f.x, m.minX), m.maxX);
        f.dir = side;
        updateTrail(m, f, false);
        if (!f.oniHit) {
          f.oniHit = true;
          f.oniLeft = ONIGI_HITS;
          f.oniGap = 0;
          f.el.classList.add('onigi-slash');
          spawnFade(a, 'sf-blitz', f.x + m.w / 2, baseY(m, f, 0.55), 340);
          screenFlash(a, true);
          a.shake = Math.max(a.shake, 26);
          slowMo(a, SLOWMO_PULSE);   // the blitz + cross slash in slow motion
        }
      } else {
        // CROSS: carve the X into the foe, one cut per blade
        if (!f.oniCrossed) {
          f.oniCrossed = true;
          f.dir = -f.oniDir;    // spun around after blitzing clean through
          spawnOnigi(a, foe.x + m.w / 2, baseY(m, foe, 0.5));
          spawnOnigi(a, foe.x + m.w / 2, baseY(m, foe, 0.5), true);   // lingering scar
        }
        f.oniGap -= dt;
        if (f.oniLeft > 0 && f.oniGap <= 0) {
          f.oniGap = ONIGI_GAP;
          f.oniLeft--;
          const last = f.oniLeft === 0;
          const dmg = Math.round(ONIGI_DMG * (f.rage ? RAGE_DMG : 1) * weaponDmg(f));
          if (applyDamage(a, m, foe, dmg, true, last ? 26 : 8)) {
            showSpark(a, foe.x + m.w / 2, m.groundY - m.h * (0.32 + Math.random() * 0.4), true);
            a.shake = Math.max(a.shake, last ? 32 : 16);
          }
          if (last && foe.dodgeT <= 0) {
            knockUp(m, foe, 300);
            spawnFade(a, 'sf-burst', foe.x + m.w / 2, baseY(m, foe, 0.5), 640);
          }
        }
      }

      if (f.oniT <= 0) {
        f.oniT = 0;
        f.oniState = '';
        f.oniStanced = false;
        f.oniCrossed = false;
        f.el.classList.remove('onigi', 'onigi-stance', 'onigi-slash');
        hideTrail(f);
      }
      return true;
    }

    // ---- UNIT-7's signature: GALAXY IMPACT — a Haki-charged ground smash (Garp) ----

    function spawnGalaxy(a, x, y) {
      const g = document.createElement('div');
      g.className = 'sf-galaxy';
      g.style.left = x.toFixed(1) + 'px';
      g.style.top = y.toFixed(1) + 'px';
      a.el.appendChild(g);
      void g.offsetWidth;
      g.classList.add('show');
      setTimeout(function () { if (g.remove) g.remove(); }, 820);
      // conqueror's black lightning fanning out of the impact
      for (let i = 0; i < 7; i++) {
        const b = document.createElement('div');
        b.className = 'sf-bolt';
        b.style.left = x.toFixed(1) + 'px';
        b.style.top = y.toFixed(1) + 'px';
        b.style.transform = 'rotate(' + (-150 + i * 50 + (Math.random() * 26 - 13)).toFixed(0) + 'deg)';
        b.style.animationDelay = (i * 14) + 'ms';
        a.el.appendChild(b);
        setTimeout(function () { if (b.remove) b.remove(); }, 560);
      }
    }

    function startGalaxy(a, m, f, foe) {
      if (!f.galaxy || f.el.classList.contains('ko')) return;
      f.galaxyState = 'rise';
      f.galaxyTotal = GALAXY_RISE + GALAXY_DIVE + GALAXY_RECOVER;
      f.galaxyT = f.galaxyTotal;
      f.galaxyHit = false;
      f.galaxyH = 0;
      f.flyTarget = 0;      // plant and launch from the ground for a clean leap
      f.flyH = 0;
      f.galaxyDir = foe.x >= f.x ? 1 : -1;
      f.el.classList.remove('swinging');
      f.el.classList.add('galaxy');
      showTrail(f);
      say(a, 'GALAXY IMPACT!');
      slowMo(a, SLOWMO_PULSE);     // the leap hangs in the air
      tryDodge(a, m, foe);
    }

    function updateGalaxy(a, m, f, foe, dt) {
      if (f.galaxyT <= 0) return false;
      f.galaxyT -= dt;
      const elapsed = f.galaxyTotal - f.galaxyT;
      const dir = f.galaxyDir;
      const tDive = GALAXY_RISE;
      const tImpact = tDive + GALAXY_DIVE;

      f.dir = foe.x >= f.x ? 1 : -1;

      if (elapsed < tDive) {
        // RISE: soar skyward, fist cocked overhead, Haki gathering
        f.galaxyH = Math.min(GALAXY_FLY, f.galaxyH + (GALAXY_FLY / GALAXY_RISE) * dt);
        const tx = foe.x + dir * (m.w * 0.5);
        const dd = tx - f.x;
        if (Math.abs(dd) > 1.5) f.x += (dd < 0 ? -1 : 1) * Math.min(Math.abs(dd), 240 * dt);
        f.x = Math.min(Math.max(f.x, m.minX), m.maxX);
        updateTrail(m, f, true);
      } else if (elapsed < tImpact) {
        // DIVE: plummet straight down onto the foe
        if (f.galaxyState !== 'dive') {
          f.galaxyState = 'dive';
          f.el.classList.remove('galaxy');
          f.el.classList.add('galaxy-dive');
          slowMo(a, SLOWMO_PULSE);   // the drop slows for the money shot
        }
        const dd = foe.x - f.x;
        if (Math.abs(dd) > 1.5) f.x += (dd < 0 ? -1 : 1) * Math.min(Math.abs(dd), 1400 * dt);
        f.x = Math.min(Math.max(f.x, m.minX), m.maxX);
        const p = (elapsed - tDive) / GALAXY_DIVE;
        f.galaxyH = Math.max(0, GALAXY_FLY * (1 - p * p));   // accelerate downward
        updateTrail(m, f, true);
      } else if (!f.galaxyHit) {
        // IMPACT: the fist lands and the whole stage detonates
        f.galaxyHit = true;
        f.galaxyH = 0;
        f.galaxyState = 'crater';
        f.el.classList.remove('galaxy', 'galaxy-dive');
        f.el.classList.add('galaxy-hit');
        const cx = foe.x + m.w / 2;
        spawnGalaxy(a, cx, m.groundY);
        spawnFade(a, 'sf-crack', cx, m.groundY, 700);
        spawnFade(a, 'sf-crack', f.x + m.w / 2, m.groundY, 700);
        screenFlash(a, true);
        a.shake = Math.max(a.shake, 46);
        const dmg = Math.round(GALAXY_DMG * (f.rage ? RAGE_DMG : 1) * weaponDmg(f));
        if (Math.abs(foe.x - f.x) < m.w * GALAXY_REACH &&
            applyDamage(a, m, foe, dmg, true, 34)) {
          showSpark(a, cx, baseY(m, foe, 0.5), true);
          knockUp(m, foe, 340);
        }
      }

      if (f.galaxyT <= 0) {
        f.galaxyT = 0;
        f.galaxyState = '';
        f.galaxyH = 0;
        f.el.classList.remove('galaxy', 'galaxy-dive', 'galaxy-hit');
        hideTrail(f);
      }
      return true;
    }

    // ---- kamehameha: long charged beam that blows the foe off their feet ----

    function startKame(a, m, f) {
      f.kameT = KAME_CHARGE + KAME_FIRE;
      f.kameState = 'charge';
      f.kameHit = false;
      f.kameDir = f.dir;
      f.el.classList.add('kamecharge');
      showCharge(f);
      f.charge.classList.add('kame');
      // kamehameha can be gathered and fired from a hover or from the ground
      f.flyTarget = Math.random() < CAST_FLY_CHANCE ? FLY_HOVER : 0;
      showTrail(f);
      const foe = f === a.fighters[0] ? a.fighters[1] : a.fighters[0];
      tryDodge(a, m, foe);
    }

    function cancelKame(f) {
      f.kameT = 0;
      f.kameState = '';
      f.el.classList.remove('kamecharge', 'kame');
      hideCharge(f);
      if (f.charge) f.charge.classList.remove('kame');
      if (f.beam) { if (f.beam.remove) f.beam.remove(); f.beam = null; }
    }

    function spawnBeam(a, m, f) {
      const el = document.createElement('div');
      el.className = 'sf-beam' + (f.kameDir === -1 ? ' rev' : '');
      a.el.appendChild(el);
      f.beam = el;
      positionBeam(m, f);
    }

    function positionBeam(m, f) {
      if (!f.beam) return;
      const handX = f.x + (f.kameDir === 1 ? m.w * 0.92 : m.w * 0.08);
      // the beam extends away from the hand; the .rev class flips its origin
      f.beam.style.left = (f.kameDir === 1 ? handX : handX - 1400).toFixed(1) + 'px';
      f.beam.style.top = baseY(m, f, 0.58).toFixed(1) + 'px';
    }

    function updateKame(a, m, f, foe, dt) {
      if (f.kameT <= 0) return false;
      f.kameT -= dt;
      const elapsed = (KAME_CHARGE + KAME_FIRE) - f.kameT;

      if (f.kameState === 'charge') {
        f.x += (f.kameDir === 1 ? -1 : 1) * 46 * dt;   // settle back as energy gathers
        f.x = Math.min(Math.max(f.x, m.minX), m.maxX);
        positionCharge(m, f, Math.min(1, Math.max(0, (elapsed - 0.12) / (KAME_CHARGE - 0.12))));
        if (f.kameT <= KAME_FIRE) {
          f.kameState = 'fire';
          f.el.classList.remove('kamecharge');
          f.el.classList.add('kame');
          hideCharge(f);
          f.charge.classList.remove('kame');
          spawnBeam(a, m, f);
          say(a, f.name + ' · KAMEHAMEHA!');
          a.shake = 16;
        }
      } else {
        positionBeam(m, f);
        if (!f.kameHit && elapsed >= KAME_CHARGE + 0.06) {
          f.kameHit = true;
          const inFront = (f.kameDir === 1 && foe.x + m.w * 0.5 >= f.x)
                       || (f.kameDir === -1 && foe.x + m.w * 0.5 <= f.x + m.w);
          if (inFront && applyDamage(a, m, foe, KAME_DMG, true, 30)) {
            knockUp(m, foe, 330);
            showSpark(a, foe.x + m.w / 2, m.groundY - m.h * 0.55, true);
            a.shake = 24;
          }
        }
      }

      if (f.kameT <= 0) {
        f.kameT = 0;
        f.kameState = '';
        f.el.classList.remove('kamecharge', 'kame');
        if (f.beam) { if (f.beam.remove) f.beam.remove(); f.beam = null; }
        hideTrail(f);
        f.flyTarget = 0;
      }
      return true;
    }

    // ---- rage surge: super-saiyan style power-up at low HP ----

    function triggerRage(a, m, f) {
      f.rage = true;
      f.rageT = RAGE_TIME;
      f.el.classList.add('rage');
      f.aura.classList.add('show');
      f.hudTimer = 2.8;
      showHud(f);
      say(a, f.name + ' · SUPER SAIYAN!');
      // a proper power-up: blinding flash + twin shockwaves + a hard shove
      a.shake = 26;
      screenFlash(a, true);
      spawnFade(a, 'sf-burst', f.x + m.w / 2, baseY(m, f, 0.5), 640);
      spawnFade(a, 'sf-burst ground', f.x + m.w / 2, m.groundY, 660);
      const foe = f === a.fighters[0] ? a.fighters[1] : a.fighters[0];
      const dir = foe.x >= f.x ? 1 : -1;
      foe.x = Math.min(Math.max(foe.x + dir * 24, m.minX), m.maxX);
      applyF(m, foe);
      showSpark(a, f.x + m.w / 2, baseY(m, f, 0.55), true);
      knockUp(m, foe, 160);
    }

    function updateAura(m, f) {
      if (!f.aura) return;
      f.aura.style.left = (f.x + m.w / 2).toFixed(1) + 'px';
      f.aura.style.top = (f.y + m.h * 0.46).toFixed(1) + 'px';
    }

    // ---- endless mode: no knockout — the fighter roars back to full health ----

    function secondWind(a, m, f, foe) {
      f.hp = MAX_HP;
      f.rage = false;                 // let the super-saiyan surge build up again
      f.rageT = 0;
      f.el.classList.remove('rage');
      if (f.aura) f.aura.classList.remove('show');
      setBars(a);
      screenFlash(a, true);
      spawnFade(a, 'sf-burst', f.x + m.w / 2, baseY(m, f, 0.5), 640);
      spawnFade(a, 'sf-burst ground', f.x + m.w / 2, m.groundY, 640);
      a.shake = 22;
      say(a, f.name + ' · SECOND WIND!');
      f.hudTimer = 2.6;
      showHud(f);
      const dir = foe.x >= f.x ? 1 : -1;   // shove the foe back off the reset
      foe.x = Math.min(Math.max(foe.x + dir * 20, m.minX), m.maxX);
      applyF(m, foe);
    }

    function startKO(a, m, loser) {
      a.fighters.forEach(function (f) {
        f.el.classList.remove('walking', 'running', 'kicking', 'uppercutting', 'jumpkicking', 'hooking', 'heavy', 'warping', 'flying', 'rushing', 'onigi', 'onigi-stance', 'onigi-slash', 'galaxy', 'galaxy-dive', 'galaxy-hit', 'casting', 'combos', 'dodging', 'kamecharge', 'kame', 'fighting', 'hurt');
        f.dashT = 0; f.superT = 0; f.superHit = false;
        f.specT = 0; f.specType = ''; f.specHit = false;
        f.combo = 0; f.comboHitT = 0; f.comboLeft = 0;
        f.rushT = 0; f.rushHitT = 0; f.rushLeft = 0;
        f.oniT = 0; f.oniState = '';
        f.oniStanced = false; f.oniCrossed = false;
        f.galaxyT = 0; f.galaxyState = ''; f.galaxyHit = false;
        f.dodgeT = 0;
        cancelKame(f);
        f.rageT = 0; f.launchedT = 0;
        f.warpT = 0; f.warpHit = false; f.flyH = 0; f.flyTarget = 0;
        f.hop = 0; f.hopV = 0;
        f.castT = 0; f.castFired = false;
        hideTrail(f);
        hideCharge(f);
        f.hudTimer = 2.8;
        showHud(f);
        if (f.hurtTimer) { clearTimeout(f.hurtTimer); f.hurtTimer = null; }
      });
      clearShots(a);
      loser.el.classList.add('ko');
      (loser === a.fighters[0] ? a.fighters[1] : a.fighters[0]).el.classList.add('win');
      a.phase = 'ko';
      a.timer = 1.9;
      a.koDone = false;
      say(a, 'K.O.');
    }

    function updateArena(a, dt) {
      const m = measures(a);
      const f0 = a.fighters[0], f1 = a.fighters[1];

      // advance aerial motion (jump kicks + uppercut launches) before anything else
      stepHop(m, f0, dt);
      stepHop(m, f1, dt);

      // dash-in entrance: both brawlers sprint in from the sides and clash
      if (a.phase === 'enter') {
        a.timer -= dt;
        [f0, f1].forEach(function (f) {
          const dx = f.tx - f.x;
          if (Math.abs(dx) > 1.5) {
            f.x += (dx < 0 ? -1 : 1) * Math.min(Math.abs(dx), ENTER_SPEED * dt);
            f.dir = dx < 0 ? -1 : 1;
          }
          f.x = Math.min(Math.max(f.x, m.minX), m.maxX);
          updateTrail(m, f, false);
        });
        applyF(m, f0); applyF(m, f1);
        const arrived = Math.abs(f0.tx - f0.x) < 2 && Math.abs(f1.tx - f1.x) < 2;
        if (arrived || a.timer <= 0) startFight(a, m);
      }

      if (a.phase === 'fight') {
        // every brawler runs its own state machines, so the action never freezes
        // while the other one is mid-special — the pressure stays continuous
        updateMelee(a, m, f0, f1, dt);
        updateMelee(a, m, f1, f0, dt);
        updateCombo(a, m, f0, f1, dt);
        updateCombo(a, m, f1, f0, dt);
        updateRush(a, m, f0, f1, dt);
        updateRush(a, m, f1, f0, dt);
        updateOnigi(a, m, f0, f1, dt);
        updateOnigi(a, m, f1, f0, dt);
        updateGalaxy(a, m, f0, f1, dt);
        updateGalaxy(a, m, f1, f0, dt);
        updateDodge(m, f0, dt);
        updateDodge(m, f1, dt);
        updateWarp(a, m, f0, f1, dt);
        updateWarp(a, m, f1, f0, dt);
        updateKame(a, m, f0, f1, dt);
        updateKame(a, m, f1, f0, dt);
        const casting0 = updateCast(a, m, f0, dt);
        const casting1 = updateCast(a, m, f1, dt);
        if (f0.rageT > 0) f0.rageT -= dt;
        if (f1.rageT > 0) f1.rageT -= dt;

        // boxing footwork, but only for whoever is free to move; while a
        // signature skill plays out the foe is held back so the animation reads
        const caster = superCaster(a);
        const held = caster ? (caster === f0 ? f1 : f0) : null;
        const free0 = !isBusy(f0) && !casting0;
        const free1 = !isBusy(f1) && !casting1;
        const mid = (f0.x + f1.x) / 2;
        if (free0 && held !== f0) {
          f0.dir = 1;
          f0.x += ((mid - 24) - f0.x) * Math.min(1, dt * 3.5);
        }
        if (free1 && held !== f1) {
          f1.dir = -1;
          f1.x += ((mid + 24) - f1.x) * Math.min(1, dt * 3.5);
        }
        if (held) {
          // keep the target at bay, facing the caster, and stall its attacks
          const away = held.x >= caster.x ? 1 : -1;
          held.x = Math.min(Math.max(held.x + away * 46 * dt, m.minX), m.maxX);
          held.dir = away > 0 ? -1 : 1;
          held.hitCd = Math.max(held.hitCd, 0.24);   // no interrupting strikes mid-cast
        }
        f0.x = Math.min(Math.max(f0.x, m.minX), m.maxX);
        f1.x = Math.min(Math.max(f1.x, m.minX), m.maxX);
        applyF(m, f0); applyF(m, f1);

        // keep trading: a free brawler attacks almost the instant it recovers,
        // so combos chain back-to-back with barely any pause
        f0.hitCd -= dt; f1.hitCd -= dt;
        if (free0 && f0.hitCd <= 0) {
          f0.hitCd = ATTACK_GAP * (f0.rage ? RAGE_GAP : 1) + Math.random() * ATTACK_JITTER;
          chooseStrike(a, m, f0, f1);
        }
        if (free1 && f1.hitCd <= 0) {
          f1.hitCd = ATTACK_GAP * (f1.rage ? RAGE_GAP : 1) + Math.random() * ATTACK_JITTER;
          chooseStrike(a, m, f1, f0);
        }

        if (ENDLESS) {
          // nobody ever drops: a fighter who runs out of life roars back to full
          if (f0.hp <= 0) secondWind(a, m, f0, f1);
          else if (f1.hp <= 0) secondWind(a, m, f1, f0);
        } else {
          if (f0.hp <= 0) startKO(a, m, f0);
          else if (f1.hp <= 0) startKO(a, m, f1);
        }
      }

      if (a.phase === 'ko') {
        a.timer -= dt;
        const winner = a.fighters[0].el.classList.contains('win') ? a.fighters[0] : a.fighters[1];
        if (a.timer <= 0.9 && !a.koDone) { a.koDone = true; say(a, winner.name + ' WINS'); }
        if (a.timer <= 0) {
          const midX = (m.minX + m.maxX) / 2;
          a.fighters.forEach(function (f, i) {
            f.hp = MAX_HP;
            f.wait = 0;
            f.hop = 0; f.hopV = 0;
            f.specT = 0; f.specType = ''; f.specHit = false;
            f.combo = 0; f.comboHitT = 0; f.comboLeft = 0;
            f.rushT = 0; f.rushHitT = 0; f.rushLeft = 0;
            f.oniT = 0; f.oniState = '';
        f.oniStanced = false; f.oniCrossed = false;
        f.galaxyT = 0; f.galaxyState = ''; f.galaxyHit = false;
            f.dodgeT = 0; f.dodgeCd = 0;
            cancelKame(f);
            f.rage = false; f.rageT = 0; f.launchedT = 0;
            f.warpT = 0; f.warpHit = false; f.flyH = 0; f.flyTarget = 0;
            f.el.classList.remove('heavy', 'warping', 'flying', 'rushing', 'onigi', 'onigi-stance', 'onigi-slash', 'galaxy', 'galaxy-dive', 'galaxy-hit');
            f.castT = 0; f.castFired = false;
            f.hitCd = 0.4;
            // line up at the sides for the next dash-in
            f.x = i === 0 ? m.minX : m.maxX;
            f.tx = midX + (i === 0 ? -24 : 24);
            f.dir = i === 0 ? 1 : -1;
            f.state = 'dash';
            f.dashT = DASH_MAX;
            f.el.classList.remove('ko', 'win', 'fighting', 'hurt', 'casting', 'combos', 'dodging', 'kamecharge', 'kame', 'rage', 'launched');
            if (f.aura) f.aura.classList.remove('show');
            f.el.classList.add('running');
            hideCharge(f);
            showTrail(f);
            f.trail.classList.remove('fire');
            applyF(m, f);
          });
          a.fighters.forEach(function (f) {
            f.hudTimer = 0;
            if (f.hud) f.hud.classList.remove('show');
          });
          clearShots(a);
          a.phase = 'enter';        // dash straight back into the next bout
          a.timer = ENTER_TIME;
          setBars(a);
        }
      }

      // keep each floating name/health bar above its fighter + fly the fireballs
      a.fighters.forEach(function (f) {
        f.weaponT -= dt;
        if (f.weaponT <= 0) equipWeapon(a, f, false);   // swap weapons every 8s
        updateHud(m, f, dt);
      });
      updateShots(a, m, dt);

      // impact screen-shake (stage only, so page text stays put)
      if (a.shake > 0.3) {
        const s = a.shake;
        a.el.style.transform =
          'translate(' + ((Math.random() * 2 - 1) * s).toFixed(1) + 'px,' +
          ((Math.random() * 2 - 1) * s).toFixed(1) + 'px)';
        a.shake *= 0.84;
      } else if (a.shake !== 0) {
        a.shake = 0;
        a.el.style.transform = '';
      }

      if (a.sparkTimer > 0) {
        a.sparkTimer -= dt;
        if (a.sparkTimer <= 0) a.spark.classList.remove('show');
      }
    }

    function activeArena() {
      for (let i = 0; i < arenas.length; i++) {
        if (arenas[i].page.classList.contains('active')) return arenas[i];
      }
      return null;
    }

    let activeId = null;
    let last = performance.now();
    function step(now) {
      const raw = Math.min((now - last) / 1000, 0.05);
      last = now;
      const a = activeArena();
      if (a) {
        if (a.id !== activeId) { activeId = a.id; resetArena(a); }
        let dt = raw;
        if (a.slow > 0) {                 // cinematic slow-motion for a signature skill
          a.slow = Math.max(0, a.slow - raw);
          dt = raw * SLOWMO;
        }
        updateArena(a, dt);
      } else {
        activeId = null;
      }
      requestAnimationFrame(step);
    }
    requestAnimationFrame(step);

    document.addEventListener('visibilitychange', function () { last = performance.now(); });

    let resizeTimer;
    window.addEventListener('resize', function () {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(function () {
        const a = activeArena();
        if (a) resetArena(a);
      }, 120);
    });
  })();

  // ===== GLITCH EFFECTS =====
  const glitchTitle = document.getElementById('glitchTitle');
  const cj = glitchTitle.querySelector('.cj');
  const avascript = glitchTitle.querySelector('.avascript');
  const cjText = 'CJ';
  const avaText = 'avascript';
  const chars = '!@#$%^&*()_+-=[]{}|;:,.<>?';

  function glitchEffect() {
    if (Math.random() < 0.04) {
      let glitchedCJ = '';
      let glitchedAVA = '';
      for (let i = 0; i < cjText.length; i++) {
        if (Math.random() < 0.3) {
          glitchedCJ += chars[Math.floor(Math.random() * chars.length)];
        } else {
          glitchedCJ += cjText[i];
        }
      }
      for (let i = 0; i < avaText.length; i++) {
        if (Math.random() < 0.3) {
          glitchedAVA += chars[Math.floor(Math.random() * chars.length)];
        } else {
          glitchedAVA += avaText[i];
        }
      }
      cj.textContent = glitchedCJ;
      avascript.textContent = glitchedAVA;
      setTimeout(() => {
        cj.textContent = cjText;
        avascript.textContent = avaText;
      }, 80);
    }
    requestAnimationFrame(glitchEffect);
  }
  glitchEffect();

  const avatar = document.getElementById('avatarGlitch');
  setInterval(() => {
    if (Math.random() < 0.07) {
      avatar.style.borderColor = '#ff0080';
      avatar.style.boxShadow = '0 0 80px rgba(255, 0, 128, 0.4), inset 0 0 80px rgba(255, 0, 128, 0.1)';
      avatar.style.transform = 'scale(1.02) translateX(' + (Math.random() - 0.5) * 8 + 'px)';
      setTimeout(() => {
        avatar.style.borderColor = '#00d4ff';
        avatar.style.boxShadow = '0 0 60px rgba(0, 212, 255, 0.2), inset 0 0 60px rgba(0, 212, 255, 0.05)';
        avatar.style.transform = 'scale(1) translateX(0)';
      }, 100);
    }
  }, 500);

  const ctaText = document.getElementById('ctaText');
  const originalCTA = ctaText.textContent;
  setInterval(() => {
    if (Math.random() < 0.03) {
      let glitched = '';
      for (let i = 0; i < originalCTA.length; i++) {
        if (Math.random() < 0.15) {
          glitched += chars[Math.floor(Math.random() * chars.length)];
        } else {
          glitched += originalCTA[i];
        }
      }
      ctaText.textContent = glitched;
      setTimeout(() => {
        ctaText.textContent = originalCTA;
      }, 60);
    }
  }, 300);

  document.addEventListener('keydown', function(e) {
    const key = e.key;
    const pageMap = {
      '1': 'landing',
      '2': 'about',
      '3': 'contact',
      '4': 'portfolio'
    };
    if (key in pageMap) {
      e.preventDefault();
      showPage(pageMap[key]);
    }
  });

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
  const soundToggle = document.getElementById('soundToggle');
  const musicToggle = document.getElementById('musicToggle');
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
  let soundOn = true;
  let audioCtx = null;
  let musicOn = true;
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

  // ---- Tiny WebAudio sound effects (self-contained, no asset files) ----
  function tone(freq, dur, type, vol, delay) {
    if (!soundOn) return;
    try {
      if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      if (audioCtx.state === 'suspended') audioCtx.resume();
      const start = audioCtx.currentTime + (delay || 0);
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = type || 'square';
      osc.frequency.setValueAtTime(freq, start);
      gain.gain.setValueAtTime(vol || 0.04, start);
      gain.gain.exponentialRampToValueAtTime(0.0001, start + dur);
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.start(start);
      osc.stop(start + dur);
    } catch (e) { /* audio unavailable — ignore */ }
  }

  function sfx(name) {
    if (!soundOn) return;
    switch (name) {
      case 'jump':  tone(440, 0.12, 'square', 0.035); break;
      case 'land':  tone(150, 0.08, 'sine', 0.04); break;
      case 'pickup':
        tone(660, 0.09, 'square', 0.04);
        tone(990, 0.12, 'square', 0.04, 0.08);
        break;
      case 'deliver':
        tone(523, 0.12, 'square', 0.04);
        tone(659, 0.12, 'square', 0.04, 0.1);
        tone(784, 0.16, 'square', 0.04, 0.2);
        tone(1046, 0.22, 'square', 0.04, 0.3);
        break;
      case 'fall':
        tone(300, 0.15, 'sawtooth', 0.04);
        tone(180, 0.25, 'sawtooth', 0.04, 0.12);
        break;
      case 'complete':
        tone(523, 0.15, 'square', 0.045);
        tone(659, 0.15, 'square', 0.045, 0.15);
        tone(784, 0.15, 'square', 0.045, 0.3);
        tone(1046, 0.3, 'square', 0.045, 0.45);
        break;
      case 'shoot':
        // Enemy turret zap
        tone(880, 0.05, 'sawtooth', 0.02);
        tone(620, 0.07, 'sawtooth', 0.018, 0.03);
        break;
      case 'hit':
        // Player shot down
        tone(220, 0.1, 'sawtooth', 0.045);
        tone(140, 0.22, 'sawtooth', 0.045, 0.09);
        tone(90, 0.35, 'square', 0.04, 0.2);
        break;
      case 'celebrate':
        // Short triumphant fanfare on every cleared level
        tone(659, 0.1, 'triangle', 0.05);
        tone(784, 0.1, 'triangle', 0.05, 0.09);
        tone(988, 0.1, 'triangle', 0.05, 0.18);
        tone(1319, 0.22, 'triangle', 0.05, 0.27);
        tone(1046, 0.45, 'sine', 0.045, 0.4);
        tone(1568, 0.5, 'sine', 0.028, 0.42);
        break;
    }
  }

  // ============================================================
  //  AGGRESSIVE CYBERPUNK TRAP SOUNDTRACK (WebAudio, no assets)
  //  One distinct trap track per difficulty stage (1 → 5), escalating
  //  from moody cloud-trap to distorted trap-metal. Signature elements:
  //  half-time snare on the "3", sliding 808 sub-bass (distorted on the
  //  harder stages), 16th hats with 32nd/triplet rolls, dark minor keys,
  //  atmospheric pads and a dark lead. Stage = Math.ceil(level/2).
  // ============================================================
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
    gameMessage.innerHTML = `> <span style="color:#00d4ff;">LEVEL ${currentLevel}/10</span> · SPEED <span style="color:#ff0080;">${'★'.repeat(speedStage)}${'☆'.repeat(5 - speedStage)}</span> · <span style="color:#a06bff;">♪ ${music.track ? music.track.name : ''}</span><br>> GO! GRAB THE <span style="color:#ff0080;">PACKAGE</span> AND REACH THE <span style="color:#00d4ff;">DROP ZONE</span>.` +
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

  if (soundToggle) {
    soundToggle.addEventListener('click', function() {
      soundOn = !soundOn;
      soundToggle.innerHTML = soundOn ? '<i class="fas fa-volume-up"></i>' : '<i class="fas fa-volume-mute"></i>';
      soundToggle.classList.toggle('muted', !soundOn);
      if (soundOn) sfx('pickup');
    });
  }

  if (musicToggle) {
    musicToggle.addEventListener('click', function() {
      musicOn = !musicOn;
      musicToggle.innerHTML = musicOn ? '<i class="fas fa-music"></i>' : '<i class="fas fa-ban"></i>';
      musicToggle.classList.toggle('muted', !musicOn);
      if (musicOn) {
        if (gameActive) startMusic();
      } else {
        stopMusic();
      }
    });
  }

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
})();