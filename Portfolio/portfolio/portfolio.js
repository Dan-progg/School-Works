/* =============================================================
   portfolio.js — page shell: navigation, video bg, glitch text
   ============================================================= */
(function () {
  'use strict';
  const CJ = (window.CJ = window.CJ || {});

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

  CJ.pages = pages;

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

  console.log('%c⚡ NEON CYBER SYSTEM ONLINE ⚡', 'color: #00d4ff; font-size: 20px; font-weight: bold;');
  console.log('%cCJavascript // Front-end Developer', 'color: #ff0080; font-size: 14px;');
  console.log('%c🎮 Neon Courier — 10 Levels of cyberpunk delivery chaos', 'color: #ff0080; font-size: 12px;');
})();
