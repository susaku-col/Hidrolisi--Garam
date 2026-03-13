/**
 * =============================================
 * MAIN JAVASCRIPT - VIRTUAL LAB HIDROLISIS GARAM
 * =============================================
 */

(function() {
  'use strict';

  // =============================================
  // CONFIGURATION
  // =============================================
  
  var CONFIG = {
    PROGRESS_KEY: 'hidrolisis_progress',
    SCORE_KEY: 'hidrolisis_score',
    TIME_KEY: 'hidrolisis_time',
    PARTICLE_COUNT: 50,
    CONNECTION_DISTANCE: 120,
    BUBBLE_INTERVAL: 600
  };

  // =============================================
  // STATE
  // =============================================
  
  var progressState = {
    stimulus: false,
    materi: false,
    simulasi: false,
    game: false,
    evaluasi: false,
    startTime: Date.now()
  };

  // =============================================
  // UTILITY FUNCTIONS
  // =============================================
  
  function loadProgress() {
    try {
      var saved = localStorage.getItem(CONFIG.PROGRESS_KEY);
      if (saved) {
        var parsed = JSON.parse(saved);
        progressState = Object.assign({}, progressState, parsed);
      }
    } catch (e) {
      console.warn('Gagal memuat progress:', e);
    }
  }

  function saveProgress() {
    try {
      localStorage.setItem(CONFIG.PROGRESS_KEY, JSON.stringify(progressState));
    } catch (e) {
      console.warn('Gagal menyimpan progress:', e);
    }
  }

  function calculateProgress() {
    var modules = ['stimulus', 'materi', 'simulasi', 'game', 'evaluasi'];
    var completed = modules.filter(function(m) {
      return progressState[m];
    }).length;
    return {
      completed: completed,
      total: modules.length,
      percentage: Math.round((completed / modules.length) * 100)
    };
  }

  function markPageComplete(pageName) {
    if (!progressState[pageName]) {
      progressState[pageName] = true;
      saveProgress();
    }
  }

  // =============================================
  // MOLECULE CANVAS
  // =============================================
  
  var moleculeCanvas = null;
  var moleculeCtx = null;
  var molecules = [];
  var mousePos = { x: null, y: null };
  var moleculeAnimId = null;

  function initMoleculeCanvas() {
    moleculeCanvas = document.getElementById('moleculeCanvas');
    if (!moleculeCanvas) return;

    moleculeCtx = moleculeCanvas.getContext('2d');
    if (!moleculeCtx) return;

    resizeMoleculeCanvas();
    createMolecules();
    
    var prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (!prefersReducedMotion) {
      animateMolecules();
    } else {
      drawStaticMolecules();
    }

    window.addEventListener('resize', resizeMoleculeCanvas);
    
    document.addEventListener('mousemove', function(e) {
      mousePos.x = e.clientX;
      mousePos.y = e.clientY;
    });

    document.addEventListener('mouseout', function() {
      mousePos.x = null;
      mousePos.y = null;
    });
  }

  function resizeMoleculeCanvas() {
    if (!moleculeCanvas) return;
    moleculeCanvas.width = window.innerWidth;
    moleculeCanvas.height = window.innerHeight;
  }

  function createMolecules() {
    molecules = [];
    var count = Math.min(
      CONFIG.PARTICLE_COUNT,
      Math.floor((window.innerWidth * window.innerHeight) / 20000)
    );
    
    for (var i = 0; i < count; i++) {
      molecules.push({
        x: Math.random() * moleculeCanvas.width,
        y: Math.random() * moleculeCanvas.height,
        vx: (Math.random() - 0.5) * 0.5,
        vy: (Math.random() - 0.5) * 0.5,
        radius: Math.random() * 2 + 1,
        opacity: Math.random() * 0.4 + 0.1
      });
    }
  }

  function animateMolecules() {
    if (!moleculeCtx || !moleculeCanvas) return;

    moleculeCtx.clearRect(0, 0, moleculeCanvas.width, moleculeCanvas.height);

    // Draw connections
    for (var i = 0; i < molecules.length; i++) {
      for (var j = i + 1; j < molecules.length; j++) {
        var dx = molecules[i].x - molecules[j].x;
        var dy = molecules[i].y - molecules[j].y;
        var distance = Math.sqrt(dx * dx + dy * dy);

        if (distance < CONFIG.CONNECTION_DISTANCE) {
          var opacity = (1 - distance / CONFIG.CONNECTION_DISTANCE) * 0.12;
          moleculeCtx.beginPath();
          moleculeCtx.moveTo(molecules[i].x, molecules[i].y);
          moleculeCtx.lineTo(molecules[j].x, molecules[j].y);
          moleculeCtx.strokeStyle = 'rgba(0, 229, 176, ' + opacity + ')';
          moleculeCtx.lineWidth = 0.5;
          moleculeCtx.stroke();
        }
      }
    }

    // Update and draw molecules
    molecules.forEach(function(m) {
      // Move
      m.x += m.vx;
      m.y += m.vy;

      // Bounce
      if (m.x < 0 || m.x > moleculeCanvas.width) m.vx *= -1;
      if (m.y < 0 || m.y > moleculeCanvas.height) m.vy *= -1;

      // Mouse interaction
      if (mousePos.x !== null) {
        var dx = mousePos.x - m.x;
        var dy = mousePos.y - m.y;
        var dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < 150) {
          var force = (150 - dist) / 150;
          m.x -= (dx / dist) * force * 2;
          m.y -= (dy / dist) * force * 2;
        }
      }

      // Draw
      moleculeCtx.beginPath();
      moleculeCtx.arc(m.x, m.y, Math.max(0.5, m.radius), 0, Math.PI * 2);
      moleculeCtx.fillStyle = 'rgba(0, 229, 176, ' + m.opacity + ')';
      moleculeCtx.fill();
    });

    moleculeAnimId = requestAnimationFrame(animateMolecules);
  }

  function drawStaticMolecules() {
    if (!moleculeCtx || !moleculeCanvas) return;
    
    molecules.forEach(function(m) {
      moleculeCtx.beginPath();
      moleculeCtx.arc(m.x, m.y, Math.max(0.5, m.radius), 0, Math.PI * 2);
      moleculeCtx.fillStyle = 'rgba(0, 229, 176, ' + m.opacity + ')';
      moleculeCtx.fill();
    });
  }

  // =============================================
  // BUBBLES
  // =============================================
  
  var bubblesContainer = null;
  var bubbleInterval = null;

  function initBubbles() {
    bubblesContainer = document.getElementById('bubblesContainer');
    if (!bubblesContainer) return;

    var prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (prefersReducedMotion) return;

    createBubble();
    bubbleInterval = setInterval(createBubble, CONFIG.BUBBLE_INTERVAL);
  }

  function createBubble() {
    if (!bubblesContainer) return;

    var bubble = document.createElement('div');
    bubble.className = 'bubble';

    var size = Math.random() * 8 + 4;
    var left = Math.random() * 100;
    var duration = Math.random() * 2 + 2;
    var delay = Math.random() * 0.5;

    bubble.style.width = size + 'px';
    bubble.style.height = size + 'px';
    bubble.style.left = left + '%';
    bubble.style.bottom = '20%';
    bubble.style.animationDuration = duration + 's';
    bubble.style.animationDelay = delay + 's';

    bubblesContainer.appendChild(bubble);

    setTimeout(function() {
      if (bubble.parentNode) {
        bubble.parentNode.removeChild(bubble);
      }
    }, (duration + delay) * 1000);
  }

  // =============================================
  // SCROLL REVEAL
  // =============================================
  
  function initScrollReveal() {
    var reveals = document.querySelectorAll('.reveal');
    if (reveals.length === 0) return;

    var observer = new IntersectionObserver(function(entries) {
      entries.forEach(function(entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add('visible');
        }
      });
    }, {
      threshold: 0.1,
      rootMargin: '0px 0px -50px 0px'
    });

    reveals.forEach(function(el) {
      observer.observe(el);
    });
  }

  // =============================================
  // HEADER SCROLL
  // =============================================
  
  function initHeaderScroll() {
    var header = document.getElementById('header');
    if (!header) return;

    window.addEventListener('scroll', function() {
      if (window.scrollY > 50) {
        header.classList.add('scrolled');
      } else {
        header.classList.remove('scrolled');
      }
    });
  }

  // =============================================
  // MOBILE MENU
  // =============================================
  
  function initMobileMenu() {
    var toggle = document.getElementById('menuToggle');
    var nav = document.getElementById('nav');

    if (!toggle || !nav) return;

    toggle.addEventListener('click', function() {
      this.classList.toggle('active');
      nav.classList.toggle('open');
    });

    var links = nav.querySelectorAll('a');
    links.forEach(function(link) {
      link.addEventListener('click', function() {
        toggle.classList.remove('active');
        nav.classList.remove('open');
      });
    });
  }

  // =============================================
  // PROGRESS DISPLAY
  // =============================================
  
  function updateProgressDisplay() {
    var progress = calculateProgress();

    var fillEl = document.getElementById('progressFill');
    if (fillEl) {
      fillEl.style.width = progress.percentage + '%';
    }

    var textEl = document.getElementById('progressText');
    var modulesEl = document.getElementById('progressModules');
    var completedEl = document.getElementById('completedCount');

    if (textEl) textEl.textContent = progress.percentage + '% Selesai';
    if (modulesEl) modulesEl.textContent = progress.completed + '/' + progress.total + ' Modul';
    if (completedEl) completedEl.textContent = progress.completed;

    // Update score
    var scoreEl = document.getElementById('quizScore');
    if (scoreEl) {
      var savedScore = localStorage.getItem(CONFIG.SCORE_KEY);
      scoreEl.textContent = savedScore ? savedScore : '-';
    }

    // Update time
    updateTimeSpent();
  }

  function updateTimeSpent() {
    var timeEl = document.getElementById('timeSpent');
    if (timeEl && progressState.startTime) {
      var diffMs = Date.now() - progressState.startTime;
      var minutes = Math.round(diffMs / 60000);
      timeEl.textContent = minutes;
    }
  }

  // =============================================
  // PAGE DETECTION
  // =============================================
  
  function detectCurrentPage() {
    var path = window.location.pathname;
    var page = path.split('/').pop().replace('.html', '') || 'index';
    
    var pageMap = {
      'index': 'index',
      'stimulus': 'stimulus',
      'materi': 'materi',
      'simulasi': 'simulasi',
      'game': 'game',
      'evaluasi': 'evaluasi'
    };

    var pageName = pageMap[page];
    if (pageName && pageName !== 'index') {
      markPageComplete(pageName);
    }

    return pageName;
  }

  // =============================================
  // EXPORT GLOBAL FUNCTIONS
  // =============================================
  
  window.LabVirtual = {
    loadProgress: loadProgress,
    saveProgress: saveProgress,
    markPageComplete: markPageComplete,
    calculateProgress: calculateProgress,
    updateProgressDisplay: updateProgressDisplay,
    progressState: progressState
  };

  // =============================================
  // INITIALIZATION
  // =============================================
  
  document.addEventListener('DOMContentLoaded', function() {
    // Load saved progress
    loadProgress();

    // Set start time if not exists
    if (!progressState.startTime) {
      progressState.startTime = Date.now();
      saveProgress();
    }

    // Detect current page
    detectCurrentPage();

    // Update progress display
    updateProgressDisplay();

    // Initialize components
    initMoleculeCanvas();
    initBubbles();
    initScrollReveal();
    initHeaderScroll();
    initMobileMenu();

    console.log('Virtual Lab Hidrolisis Garam - Initialized');
  });

  // Update time every minute
  setInterval(updateTimeSpent, 60000);

})();