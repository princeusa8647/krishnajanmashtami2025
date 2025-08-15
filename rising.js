/* rising.js — enhanced: typing spotlight, random blessing, insta float highlight, dev-wish badge */
/* Note: this preserves original localStorage, particles, confetti, and chime behavior and extends it. */

/* =======================
   Utilities & DOM cached
   ======================= */
const qs = s => document.querySelector(s);
const qsa = s => Array.from(document.querySelectorAll(s));

const nameIn = qs('#name');
const wishIn = qs('#wish');
const form = qs('#wishForm');
const wishesListEl = qs('#wishesList');
const spotNameEl = qs('#spotName');
const spotWishEl = qs('#spotWish');

const cycleBtn = qs('#cycleBtn');
const cycleBtnDup = qs('#cycleBtnDup');
const muteBtn = qs('#muteBtn');
const themeToggle = qs('#themeToggle');
const addSilentBtn = qs('#addSilent');
const clearAllBtn = qs('#clearAll');
const exportBtn = qs('#exportBtn');
const importBtn = qs('#importBtn');
const fileInput = qs('#fileInput');
const blessBtn = qs('#blessBtn');

const particlesCanvas = qs('#particles');
const confettiCanvas = qs('#confetti');

let wishes = [];            // in-memory array of wishes
let spotlightIdx = 0;       // index of currently spotlighted wish
let autoCycleTimer = null;
let chimeEnabled = true;

/* =======================
   Small blessings list
   ======================= */
const BLESSINGS = [
  "May Krishna's mischief fill your life with laughter and his blessings fill your home with love!",
  "Radhe Radhe! Wishing you a heart full of devotion and pockets full of ladoos 😄",
  "May your life shine as bright as Krishna's peacock feather. Happy Janmashtami!",
  "May this festival bring you joy, peace, and sweet childhood memories.",
  "Keru ki leela aapke ghar mein khushiyan le aaye — Happy Janmashtami!",
  "Dahi handi ki tara, tumhara har din umeed se bhara rahe!",
  "Blessings, sweets and playful moments — enjoy the festival with family.",
  "May Krishna's flute bring melody to your life and remove all worries.",
  "A heartfelt wish: more smiles, less tensions — Happy Janmashtami!",
  "Keep faith, keep love — may Krishna guide your steps always."
];

/* =======================
   Local storage management
   ======================= */
const STORAGE_KEY = 'aci_krishna_wishes_v1';

function loadStored() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    return JSON.parse(raw);
  } catch (e) {
    console.warn('Failed to parse wishes', e);
    return [];
  }
}

function saveStored(list) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
}

/* =======================
   Typing / cursor helpers
   ======================= */
let typingController = { timer: null };

function clearTyping() {
  if (typingController.timer) {
    clearInterval(typingController.timer);
    typingController.timer = null;
  }
}

function typeOut(el, text, speed = 28) {
  return new Promise(resolve => {
    clearTyping();
    el.innerHTML = ''; // clean
    const content = document.createElement('span');
    content.className = 'typing-content';
    el.appendChild(content);
    const cursor = document.createElement('span');
    cursor.className = 'typing-cursor';
    cursor.textContent = '|';
    el.appendChild(cursor);

    let i = 0;
    typingController.timer = setInterval(() => {
      if (i < text.length) {
        content.textContent += text.charAt(i);
        i++;
      } else {
        clearInterval(typingController.timer);
        typingController.timer = null;
        // tiny delay so cursor blink is visible
        setTimeout(() => {
          if (cursor.parentNode) cursor.remove();
          resolve();
        }, 140);
      }
    }, speed);
  });
}

/* =======================
   Wish rendering & spotlight
   ======================= */
function renderWishes() {
  wishesListEl.innerHTML = '';
  if (!wishes.length) {
    const empty = document.createElement('div');
    empty.className = 'wish-card';
    empty.innerHTML = `<div class="meta">No wishes yet</div><div class="text">Be the first to share a warm Janmashtami wish!</div>`;
    wishesListEl.appendChild(empty);
    return;
  }

  wishes.slice().reverse().forEach((w, idxRev) => {
    // show latest first: compute original index
    const idx = wishes.length - 1 - idxRev;
    const card = document.createElement('div');
    card.className = 'wish-card';
    card.setAttribute('role','listitem');
    card.dataset.idx = idx;

    // special highlight for "Prince" (developer)
    const nameLower = (w.name || '').toLowerCase();
    if (nameLower.includes('prince') || nameLower.includes('prince singh')) {
      card.classList.add('dev-wish');
    }

    card.innerHTML = `<div class="meta">${escapeHtml(w.name)} • ${new Date(w.when).toLocaleString()}</div>
                      <div class="text">${escapeHtml(w.text)}</div>`;

    card.addEventListener('click', () => {
      setSpotlight(idx);
      celebrateTiny();
    });

    wishesListEl.appendChild(card);
  });
}

function setSpotlight(index) {
  if (!wishes.length) {
    spotNameEl.textContent = 'ACI Family';
    spotWishEl.textContent = 'Wishes you a joyous Janmashtami!';
    return;
  }
  spotlightIdx = ((index % wishes.length) + wishes.length) % wishes.length;
  const w = wishes[spotlightIdx];
  animateSpotlight(w);
}

/* sparkle + typing spotlight animation with variations */
const spotlightEl = qs('#spotlight');
const ANIM_VARIANTS = ['anim-slide', 'anim-zoom', 'anim-rotate', 'anim-bounce'];

function pickAnim() {
  return ANIM_VARIANTS[Math.floor(Math.random() * ANIM_VARIANTS.length)];
}

function animateSpotlight(w) {
  // choose an entrance animation
  spotlightEl.classList.remove(...ANIM_VARIANTS);
  const anim = pickAnim();
  spotlightEl.classList.add(anim);

  // type name then wish
  typeOut(spotNameEl, w.name || 'ACI Family', 24).then(() => {
    return typeOut(spotWishEl, w.text || 'Wishes you a joyous Janmashtami!', 20);
  }).then(() => {
    // small celebration
    burstConfetti(28);
    // remove animation class after it's done
    setTimeout(() => spotlightEl.classList.remove(anim), 900);
  });
}

/* =======================
   Form behavior
   ======================= */
form.addEventListener('submit', (ev) => {
  ev.preventDefault();
  const name = (nameIn.value || '').trim() || 'Anonymous';
  const text = (wishIn.value || '').trim();
  if (!text) {
    flashInput(wishIn);
    return;
  }
  const item = { name: name.slice(0,40), text: text.slice(0,200), when: Date.now(), id: uid() };
  wishes.push(item);
  saveStored(wishes);
  renderWishes();
  // spotlight immediately with satisfying effect
  setSpotlight(wishes.length - 1);
  wishIn.value = ''; nameIn.value = '';
  // gentle pulse highlight on last card
  highlightLatest();
  // small celebration sound + particles
  celebrateTiny();
});

addSilentBtn.addEventListener('click', () => {
  const name = (nameIn.value || '').trim() || 'Anonymous';
  const text = (wishIn.value || '').trim();
  if (!text) { flashInput(wishIn); return; }
  const item = { name: name.slice(0,40), text: text.slice(0,200), when: Date.now(), id: uid() };
  wishes.push(item);
  saveStored(wishes);
  renderWishes();
  nameIn.value = ''; wishIn.value = '';
  // no spotlight, but confetti
  burstConfetti(18);
});

clearAllBtn.addEventListener('click', () => {
  if (!confirm('Clear all wishes? This cannot be undone.')) return;
  wishes = [];
  saveStored(wishes);
  renderWishes();
  setSpotlight(0);
});

/* =======================
   small helpers & UI niceties
   ======================= */
function uid() { return Math.random().toString(36).slice(2,9); }
function flashInput(el) {
  el.animate([{ boxShadow: '0 0 0px rgba(255,80,0,0)' }, { boxShadow: '0 0 12px rgba(255,80,0,0.5)' }, { boxShadow: '0 0 0 rgba(255,80,0,0)'}], { duration: 560 });
}
function highlightLatest() {
  const firstCard = wishesListEl.querySelector('.wish-card');
  if (firstCard) {
    firstCard.animate([{ transform:'translateY(0) scale(1)' }, { transform:'translateY(-10px) scale(1.02)' }, { transform:'translateY(0) scale(1)' }], { duration: 700 });
  }
}
function escapeHtml(s) {
  return (s+'').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
}

/* =======================
   Cycle & controls
   ======================= */
cycleBtn.addEventListener('click', () => cycleSpotlight());
cycleBtnDup && cycleBtnDup.addEventListener('click', () => cycleSpotlight());

muteBtn.addEventListener('click', () => { chimeEnabled = !chimeEnabled; muteBtn.textContent = chimeEnabled ? '🔔 Chime' : '🔕 Muted'; });

function cycleSpotlight() {
  if (!wishes.length) return;
  spotlightIdx = (spotlightIdx + 1) % wishes.length;
  setSpotlight(spotlightIdx);
}
function startAutoCycle() {
  if (autoCycleTimer) clearInterval(autoCycleTimer);
  autoCycleTimer = setInterval(() => {
    cycleSpotlight();
  }, 9000);
}
startAutoCycle();

/* =======================
   Export / Import JSON
   ======================= */
exportBtn.addEventListener('click', () => {
  const dataStr = JSON.stringify(wishes, null, 2);
  const blob = new Blob([dataStr], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = 'aci-janmashtami-wishes.json';
  document.body.appendChild(a); a.click(); a.remove();
  URL.revokeObjectURL(url);
});

importBtn.addEventListener('click', () => fileInput.click());
fileInput.addEventListener('change', (ev) => {
  const f = ev.target.files[0];
  if (!f) return;
  const reader = new FileReader();
  reader.onload = e => {
    try {
      const imported = JSON.parse(e.target.result);
      if (!Array.isArray(imported)) throw new Error('Invalid format');
      // minimal validation — append imported
      imported.forEach(it => {
        if (it && it.text) wishes.push({ name: it.name || 'Imported', text: it.text, when: it.when || Date.now(), id: uid() });
      });
      saveStored(wishes);
      renderWishes();
      alert('Imported wishes successfully');
    } catch (err) {
      alert('Invalid JSON file');
    }
  };
  reader.readAsText(f);
});

/* =======================
   Tiny web audio chime (no files)
   ======================= */
const audioCtx = (function(){
  try { return new (window.AudioContext || window.webkitAudioContext)(); } catch(e) { return null; }
})();
function playChime() {
  if (!audioCtx || !chimeEnabled) return;
  const now = audioCtx.currentTime;
  const o = audioCtx.createOscillator();
  const g = audioCtx.createGain();
  o.type = 'sine';
  o.frequency.setValueAtTime(880, now);
  o.frequency.exponentialRampToValueAtTime(660, now + 0.12);
  g.gain.setValueAtTime(0.0001, now);
  g.gain.exponentialRampToValueAtTime(0.25, now + 0.02);
  g.gain.exponentialRampToValueAtTime(0.0001, now + 1.2);
  o.connect(g); g.connect(audioCtx.destination);
  o.start(now); o.stop(now + 1.25);
}

/* celebrate small effect */
function celebrateTiny() {
  burstParticles(18);
  playChime();
}

/* =======================
   Canvas: particles (petals) & confetti
   ======================= */

/* helpers to fit canvases */
function fitCanvas(canvas) {
  const dpr = window.devicePixelRatio || 1;
  canvas.width = Math.floor(canvas.clientWidth * dpr);
  canvas.height = Math.floor(canvas.clientHeight * dpr);
  const ctx = canvas.getContext('2d');
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  return ctx;
}

function makeFullCanvas(canvas) {
  canvas.style.position = 'fixed';
  canvas.style.top = 0; canvas.style.left = 0;
  canvas.style.width = '100%'; canvas.style.height = '100%';
  canvas.style.pointerEvents = 'none';
  canvas.style.zIndex = 5;
  return fitCanvas(canvas);
}

const pCtx = makeFullCanvas(particlesCanvas);
const cCtx = makeFullCanvas(confettiCanvas);

// particle systems: petal-like floats
const petals = [];
function spawnPetal(x = Math.random()*innerWidth, y = -20) {
  petals.push({
    x, y,
    vx: (Math.random()-0.5) * 0.6,
    vy: 0.6 + Math.random()*1.2,
    r: 6 + Math.random()*10,
    rot: Math.random()*Math.PI*2,
    vrot: (Math.random()-0.5) * 0.06,
    hue: 20 + Math.random()*40
  });
}

for (let i=0;i<40;i++) spawnPetal(Math.random()*innerWidth, Math.random()*innerHeight);

function updatePetals(dt) {
  for (let i=petals.length-1;i>=0;i--) {
    const p = petals[i];
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    p.rot += p.vrot * dt;
    if (p.y > innerHeight + 30) {
      petals.splice(i,1);
    }
  }
  // keep some ambient petals
  if (petals.length < 45 && Math.random() < 0.08) spawnPetal();
}

function drawPetals(ctx) {
  ctx.clearRect(0,0,innerWidth,innerHeight);
  for (const p of petals) {
    ctx.save();
    ctx.translate(p.x, p.y);
    ctx.rotate(p.rot);
    ctx.beginPath();
    ctx.ellipse(0,0,p.r*1.3,p.r,0,0,Math.PI*2);
    ctx.fillStyle = `hsl(${p.hue} 90% 65% / 0.95)`;
    ctx.fill();
    ctx.restore();
  }
}

// confetti bursts
const confetti = [];
function spawnConfettiBurst(x = innerWidth/2, y = innerHeight/2, count = 30) {
  for (let i=0;i<count;i++){
    confetti.push({
      x, y,
      vx: (Math.random()-0.5)*8,
      vy: (Math.random()-0.9)*8,
      size: 6 + Math.random()*8,
      rot: Math.random()*Math.PI*2,
      vrot: (Math.random()-0.5)*0.3,
      color: `hsl(${Math.floor(Math.random()*40)+20} 90% ${45 + Math.random()*20}%)`,
      life: 100 + Math.random()*80
    });
  }
}

function burstConfetti(count=40) {
  spawnConfettiBurst(Math.random()*innerWidth, innerHeight*0.3 + Math.random()*innerHeight*0.4, count);
}

function updateConfetti(dt) {
  for (let i=confetti.length-1;i>=0;i--) {
    const c = confetti[i];
    c.vy += 0.24; // gravity
    c.x += c.vx * dt * 0.6;
    c.y += c.vy * dt * 0.6;
    c.rot += c.vrot * dt;
    c.life -= dt;
    if (c.y > innerHeight + 60 || c.life <= 0) confetti.splice(i,1);
  }
}

function drawConfetti(ctx) {
  ctx.clearRect(0,0,innerWidth,innerHeight);
  for (const c of confetti) {
    ctx.save();
    ctx.translate(c.x, c.y);
    ctx.rotate(c.rot);
    ctx.fillStyle = c.color;
    ctx.fillRect(-c.size/2, -c.size/2, c.size, c.size*0.6);
    ctx.restore();
  }
}

/* small burst of particles for celebration */
function burstParticles(n=20){
  for (let i=0;i<n;i++){
    spawnConfettiBurst(innerWidth*0.5 + (Math.random()-0.5)*300, innerHeight*0.45 + (Math.random()-0.5)*100, 6);
  }
}

/* animation loop */
let last = performance.now();
function loop(now) {
  const dt = Math.min(60, now - last) / 16.666; // normalized to 60fps
  updatePetals(dt);
  updateConfetti(dt);
  drawPetals(pCtx);
  drawConfetti(cCtx);
  last = now;
  requestAnimationFrame(loop);
}
requestAnimationFrame(loop);

/* ensure resize fits */
window.addEventListener('resize', () => {
  try { fitCanvas(particlesCanvas); fitCanvas(confettiCanvas); } catch(e) {}
});

/* spawn ambient petals periodically */
setInterval(()=> {
  for (let i=0;i<3;i++) spawnPetal(Math.random()*innerWidth, -10 - Math.random()*120);
}, 900);

/* =======================
   Random blessing button
   ======================= */
blessBtn && blessBtn.addEventListener('click', () => {
  const b = BLESSINGS[Math.floor(Math.random() * BLESSINGS.length)];
  animateSpotlight({ name: 'Blessing', text: b });
  burstConfetti(26);
});

/* =======================
   Startup: load stored and init
   ======================= */
(function init() {
  wishes = loadStored() || [];
  renderWishes();
  if (wishes.length) setSpotlight(0);

  // small keyboard shortcuts
  window.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowRight') cycleSpotlight();
    if (e.key === 'c' && (e.ctrlKey || e.metaKey)) { e.preventDefault(); burstConfetti(60); }
    if (e.key === 'm') { chimeEnabled = !chimeEnabled; muteBtn.textContent = chimeEnabled ? '🔔 Chime' : '🔕 Muted'; }
  });

  // small accessibility: clicking header toggles theme
  themeToggle.addEventListener('click', () => {
    document.body.classList.toggle('bhaagwa');
  });

  // small button to cycle spotlight continuously (toggle)
  let cycling = true;
  cycleBtn.addEventListener('click', () => { cycling = !cycling; if (cycling) startAutoCycle(); else { clearInterval(autoCycleTimer); autoCycleTimer = null; } });

  // load initial theme
  if (!document.body.classList.contains('bhaagwa')) document.body.classList.add('bhaagwa');
})();

/* =======================
   Init stored data helper
   ======================= */
(function seedIfEmpty(){
  const stored = loadStored();
  if (!stored || !stored.length) {
    wishes = [
      { id: uid(), name: 'ACI Team', text: 'Warm Janmashtami wishes to everyone — celebrate with love!', when: Date.now() - 1000*60*60*24 },
      { id: uid(), name: 'Prince Singh', text: 'Happy Krishna Janmashtami! May love & laughter fill your home.', when: Date.now() - 1000*60*30 }
    ];
    saveStored(wishes);
  } else {
    wishes = stored;
  }
  renderWishes();
  setSpotlight(0);
})();
