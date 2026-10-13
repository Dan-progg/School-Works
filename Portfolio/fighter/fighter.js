/* =============================================================
   fighter.js — the 2D fighter that brawls across the pages
   Depends on window.CJ.audio for punch / slash / special SFX.
   ============================================================= */
(function () {
  'use strict';
  const CJ = (window.CJ = window.CJ || {});
  const sfx = (CJ.audio && CJ.audio.sfx) || function () {};

  // ===== 2D FIGHTER STAGE: two brawlers confined to a neon floor =====
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
    const SUPER_CHANCE = 0.02; // chance an exchange becomes a fire kick
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
    // Zan's fire-slash: a crescent of fire that swells the farther it flies
    const SLICE_SPEED = 440;   // fire-slash travel speed (px/s)
    const SLICE_DMG = 13;      // fire-slash base damage
    const SLICE_GROW = 1 / 150;// size gained per pixel travelled
    const SLICE_MAX = 3.4;     // growth cap (scale)
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
    const COMBO_TIME = 0.32;        // total combo duration (s)
    const COMBO_GAP = 0.32;          // gap between combo hits (s)
    const COMBO_HITS = 1;            // hits per combo
    const COMBO_DMG = 0.5;          // per-hit combo damage multiplier
    const RUSH_CHANCE = 0.0;        // chance a strike becomes a hyper rush
    const RUSH_CHAIN_CHANCE = 0.0;   // chance a finished combo flows straight into a rush
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
    // Zan's signature: Santoryu Ougi — PURGATORY ONIGIRI (three swords, cross slash)
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
      { type: 'human', name: 'ZAN' },
      { type: 'cyborg', name: 'UNIT-7' }
    ];
    const arenas = [];

    // One continuous brawl that follows you between sections: build a SINGLE
    // arena and re-parent it onto whichever page is active, so the fight never
    // restarts when you switch pages.
    var pagesMap = (window.CJ && window.CJ.pages) || {};
    if (!pagesMap.landing) {
      ['landing','about','skills','achievements','goals','contact','portfolio'].forEach(function (id) {
        if (!pagesMap[id]) pagesMap[id] = document.getElementById(id);
      });
    }
    const pageIds = Object.keys(pagesMap).filter(function (id) { return !!pagesMap[id]; });
    const host = pageIds.map(function (id) { return pagesMap[id]; })
      .filter(function (p) { return p && p.classList.contains('active'); })[0] || pagesMap.landing || document.getElementById('landing');
    const id = host && host.id ? host.id : 'landing';
    let arena = host.querySelector('.arena');
    if (!arena) {
      arena = document.createElement('div');
      arena.className = 'arena';
      arena.setAttribute('aria-hidden', 'true');
      host.appendChild(arena);
    }

    (function buildArena() {
      const page = host;
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
        if (ROSTER[i].name === 'ZAN') el.classList.add('santoryu');   // three swords, always drawn
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
          santoryu: ROSTER[i].name === 'ZAN',   // Zan always wields all three swords
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
          oni: ROSTER[i].name === 'ZAN',   // Zan's three-sword-style signature (Purgatory Onigiri)
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
    })();

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
      // Zan wields his three swords permanently — he never swaps to a random weapon
      if (f.santoryu) { f.weapon = null; f.weaponT = Infinity; return; }
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
      if (!f.weapon && !f.santoryu) return;
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
      const slice = !!f.santoryu;   // Zan carves a fire-slash; everyone else hurls a fireball
      const el = document.createElement('div');
      el.className = (slice ? 'sf-slice' : 'sf-shot') + (dir === -1 ? ' rev' : '');
      el.style.left = x.toFixed(1) + 'px';
      el.style.top = y.toFixed(1) + 'px';
      if (slice) el.style.transform = 'rotate(' + (dir === 1 ? 45 : -135) + 'deg) scale(1)';
      a.el.appendChild(el);
      a.shots.push({
        el: el, x: x, y: y, dir: dir, owner: f,
        kind: slice ? 'slice' : 'fireball', travel: 0, scale: 1
      });
      showSpark(a, x, y, false); // muzzle flash
      sfx(slice ? 'slash' : 'fireball');
      if (slice) swingWeapon(f); // the blade lashes out as the slash flies
    }

    function clearShots(a) {
      a.shots.forEach(function (s) { if (s.el && s.el.remove) s.el.remove(); });
      a.shots = [];
    }

    function updateShots(a, m, dt) {
      if (!a.shots.length) return;
      const fighting = a.phase === 'fight';
      a.shots = a.shots.filter(function (s) {
        const slice = s.kind === 'slice';
        const spd = slice ? SLICE_SPEED : SHOT_SPEED;
        s.x += s.dir * spd * dt;
        s.el.style.left = s.x.toFixed(1) + 'px';
        if (slice) {
          // the farther the slash flies, the larger it swells
          s.travel += spd * dt;
          s.scale = Math.min(SLICE_MAX, 1 + s.travel * SLICE_GROW);
          s.el.style.transform = 'rotate(' + (s.dir === 1 ? 45 : -135) + 'deg) scale(' + s.scale.toFixed(3) + ')';
        }
        const target = s.owner === a.fighters[0] ? a.fighters[1] : a.fighters[0];
        const tx0 = target.x, tx1 = target.x + m.w;
        const half = slice ? 20 * s.scale : 0;   // a grown slash bites a wider swath
        const hit = s.dir === 1 ? (s.x + half >= tx0 && s.x - half <= tx1)
                                : (s.x - half <= tx1 && s.x + half >= tx0);
        if (hit && !target.el.classList.contains('ko')) {
          if (fighting) {
            const base = slice ? SLICE_DMG : SHOT_DMG;
            applyDamage(a, m, target, base + Math.floor(Math.random() * 7), true);
          }
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
      sfx(hit ? (big ? 'punchHeavy' : 'punch') : 'whiff');
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
      if (cfg.fire) { showTrail(attacker); sfx('kick'); }
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
      if (f.oni) {                                   // Zan's three-sword finisher
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
      sfx(hit ? 'heavy' : 'whiff');
      if (hit) knockUp(m, foe, 220);
    }

    // ---- instant transmission: vanish, warp in behind the foe, blitz them ----

    function startWarp(a, m, f, foe) {
      spawnFade(a, 'sf-warp', f.x + m.w / 2, baseY(m, f, 0.55), 320);   // vanish streak
      sfx('warp');

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
      sfx('dodge');
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
      sfx('combo');
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
          sfx(last ? 'punchHeavy' : 'punch');
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
      sfx('rush');
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
          sfx(last ? 'punchHeavy' : 'punch');
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

    // ---- Zan's signature: Santoryu Ougi — PURGATORY ONIGIRI (three-sword cross slash) ----

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
      sfx('santoryu');
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
            sfx('slash');
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
      sfx('galaxyCharge');
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
        sfx('galaxyHit');
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
      sfx('kameCharge');
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
          sfx('kameFire');
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
      sfx('rage');
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
      sfx('ko');
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
      sfx('ko');
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
        if (!f.santoryu) {   // Zan keeps his three swords — no random weapon swaps
          f.weaponT -= dt;
          if (f.weaponT <= 0) equipWeapon(a, f, false);   // swap weapons every 8s
        }
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

    function activePage() {
      for (let i = 0; i < pageIds.length; i++) {
        var pg = pagesMap[pageIds[i]];
        if (pg && pg.classList.contains('active')) return pg;
      }
      return null;
    }

    function activeArena() {
      return arenas[0] || null;
    }

    let activeId = null;
    let last = performance.now();
    function step(now) {
      const raw = Math.min((now - last) / 1000, 0.05);
      last = now;
      const a = activeArena();
      if (a) {
        // the brawl follows you between sections: keep the arena on the page
        // you're viewing, without resetting the fight
        const page = activePage();
        if (page && a.el.parentElement !== page) {
          page.appendChild(a.el);
          a.page = page;
        }
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
