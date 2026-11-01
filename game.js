/* ===== Trivial Pursuit adapté à l'âge — moteur de jeu ===== */

/* ---------- Catégories : couleurs officielles du Trivial Pursuit ---------- */
const CATEGORIES = {
  G: { name: "Géographie",        color: "#1f6fb2", icon: "🌍" },
  H: { name: "Histoire",          color: "#f2c500", icon: "🏛️" },
  S: { name: "Sciences",          color: "#2e9b4e", icon: "🔬" },
  L: { name: "Sports & Loisirs",  color: "#f07c1e", icon: "⚽" },
  A: { name: "Arts & Littérature",color: "#7a4fa3", icon: "🎨" },
  D: { name: "Divertissement",    color: "#d5368d", icon: "🎬" }
};
const CAT_KEYS = Object.keys(CATEGORIES);
const HQ_ICON = "🧀";

/* Ordre des couleurs alternées (comme le plateau officiel : jamais deux identiques côte à côte) */
const RING_CATS = [
  "G","S","A","H","L","D",
  "A","D","G","L","S","H",
  "L","H","S","D","A","G",
  "D","G","H","A","L","S",
  "H","L","D","S","G","A",
  "S","A","L","G","H","D"
];

/* ---------- Tranches d'âge ---------- */
const AGE_GROUPS = ["4-5", "6-8", "9-11", "12-15", "16-30", "31+"];
function ageGroupFor(age) {
  if (age <= 5) return "4-5";
  if (age <= 8) return "6-8";
  if (age <= 11) return "9-11";
  if (age <= 15) return "12-15";
  if (age <= 30) return "16-30";
  return "31+";
}

/* ---------- Pions (un par catégorie, comme les pions Monopoly) ---------- */
const PAWNS = {
  G: { name: "Le Voyageur", emoji: "🚀" },
  H: { name: "Le Sage",     emoji: "🦉" },
  S: { name: "Le Savant",   emoji: "🧪" },
  L: { name: "L'Athlète",   emoji: "🏆" },
  A: { name: "L'Artiste",   emoji: "🎭" },
  D: { name: "La Star",     emoji: "🎬" }
};

/* ---------- État ---------- */
let players = [];
let current = 0;
let awaitingRoll = true;
let usedQuestions = {};
let activeThemes = { disney: false, musique: false };
let board = null;
let gameOver = false;
let animating = false;
let lastPaths = {};
var CATEGORY_ORDER = ["G", "S", "A", "H", "L", "D"];

/* Logo Edukisto : étoile bleue + sigle infini (SVG vectoriel) */
const EDUKISTO_MARK = `<svg viewBox="0 0 64 64" fill="none" aria-hidden="true"><path d="M32 3l5.2 18.2 10.8-5.2-5.2 10.8L61 32l-18.2 5.2 5.2 10.8-10.8-5.2L32 61l-5.2-18.2-10.8 5.2 5.2-10.8L3 32l18.2-5.2-5.2-10.8 10.8 5.2z" fill="#38bdf8"/><path d="M32 32c-1.6-2-3-3.1-4.8-3.1a4.7 4.7 0 1 0 0 9.4c1.8 0 3.2-1.1 4.8-3.1 1.6 2 3 3.1 4.8 3.1a4.7 4.7 0 1 0 0-9.4c-1.8 0-3.2 1.1-4.8 3.1z" stroke="#333333" stroke-width="2.2" fill="none"/></svg>`;

/* ---------- Utilitaires DOM ---------- */
const $ = (sel) => document.querySelector(sel);
const show = (el) => el.classList.remove("hidden");
const hide = (el) => el.classList.add("hidden");
function lighten(hex, amt) {
  const n = parseInt(hex.slice(1), 16);
  const r = Math.min(255, (n >> 16) + amt), g = Math.min(255, ((n >> 8) & 255) + amt), b = Math.min(255, (n & 255) + amt);
  return "#" + ((r << 16) | (g << 8) | b).toString(16).padStart(6, "0");
}

/* ---------- Écran de configuration ---------- */
function renderSetup() {
  const list = $("#players-list");
  list.innerHTML = "";
  players.forEach((p, i) => {
    const row = document.createElement("div");
    row.className = "player-row";
    row.innerHTML = `<span class="dot" style="background:${p.color}"></span>
      <span>${p.name}</span>
      <span class="group-tag">${window.QUESTION_PACKS[p.group].label}</span>
      <span class="pawn-tag">${PAWNS[p.pawn].emoji} ${PAWNS[p.pawn].name}</span>
      <button data-i="${i}" class="remove">✕</button>`;
    row.querySelector(".remove").onclick = () => { players.splice(i, 1); refreshSetup(); };
    list.appendChild(row);
  });

  const themes = $("#themes-list");
  themes.innerHTML = "";
  Object.keys(window.THEME_PACKS).forEach(key => {
    const pack = window.THEME_PACKS[key];
    const id = "theme-" + key;
    const div = document.createElement("div");
    div.className = "theme-option";
    div.innerHTML = `<input type="checkbox" id="${id}" ${activeThemes[key] ? "checked" : ""}>
      <label for="${id}">⭐ ${pack.label} — ${pack.questions.length} questions</label>`;
    div.querySelector("input").onchange = (e) => { activeThemes[key] = e.target.checked; };
    themes.appendChild(div);
  });

  renderPawnPicker();
  $("#btn-start").disabled = players.length < 2;
}

/* Choix du pion : un pion par catégorie, indisponible s'il est déjà pris */
function renderPawnPicker() {
  const taken = players.map(p => p.pawn);
  const wrap = $("#pawn-picker");
  if (!wrap) return;
  let html = "<div class='pawn-grid'>";
  for (const k of CAT_KEYS) {
    const isTaken = taken.includes(k);
    html += `<div class="pawn-choice ${isTaken ? 'taken' : ''}" data-cat="${k}" title="${PAWNS[k].name}${isTaken ? ' (déjà pris)' : ''}">
      <span class="pawn-mini" style="--pc:${CATEGORIES[k].color}">${PAWNS[k].emoji}</span>
      <span class="pawn-choice-name">${PAWNS[k].name}</span>
      ${isTaken ? '<span class="pawn-taken-label">pris</span>' : ''}
    </div>`;
  }
  html += "</div>";
  wrap.innerHTML = html;
  wrap.querySelectorAll(".pawn-choice:not(.taken)").forEach(el => {
    el.onclick = () => {
      pendingPawn = el.dataset.cat;
      wrap.querySelectorAll(".pawn-choice").forEach(c => c.classList.remove("selected"));
      el.classList.add("selected");
    };
  });
}
let pendingPawn = null;

function refreshSetup() { renderSetup(); }

$("#btn-add-player").onclick = () => {
  const name = $("#new-player-name").value.trim();
  const age = parseInt($("#new-player-age").value, 10);
  if (!name) return alert("Donnez un nom au joueur.");
  if (!age || age < 4 || age > 120) return alert("Donnez un âge valide (4 à 120).");
  if (players.length >= 6) return alert("Maximum 6 joueurs.");
  if (!pendingPawn) return alert("Choisissez un pion (cliquez sur un pion libre).");
  if (players.some(p => p.pawn === pendingPawn)) return alert("Ce pion est déjà pris.");
  players.push({
    name, age,
    group: ageGroupFor(age),
    pawn: pendingPawn,
    color: CATEGORIES[pendingPawn].color,
    pos: null,
    wedges: {}
  });
  pendingPawn = null;
  $("#new-player-name").value = "";
  $("#new-player-age").value = "";
  refreshSetup();
};

$("#btn-start").onclick = startGame;

/* ---------- Plateau officiel : 73 cases ----------
   - Moyeu central (1) : départ et question finale
   - 6 rayons de 6 cases (36) : couleurs alternées, jamais la couleur du QG
   - Piste circulaire extérieure (36) : les 6 QG en bout de rayon,
     les 30 autres cases alternent les catégories                      */
const HUB_R = 58;
const RING_R = 322, SPOKE_R = [104, 141, 178, 215, 252, 289];
const CELL_R = 17;

function polar(r, angleDeg) {
  const a = (angleDeg - 90) * Math.PI / 180;
  return [350 + r * Math.cos(a), 350 + r * Math.sin(a)];
}

function buildBoard() {
  board = { cells: {}, adj: {} };
  const add = (c) => { board.cells[c.id] = c; board.adj[c.id] = []; };
  const link = (a, b) => { board.adj[a].push(b); board.adj[b].push(a); };

  add({ id: "hub", x: 350, y: 350, cat: null, isCenter: true, isWedge: false });

  // Piste circulaire (36) : QG en bout de rayon (i multiple de 6), sinon catégorie alternée
  for (let i = 0; i < 36; i++) {
    const ang = i * 10;
    const [x, y] = polar(RING_R, ang);
    if (i % 6 === 0) {
      const qgCat = CATEGORY_ORDER[i / 6];
      add({ id: "ring" + i, x, y, cat: qgCat, isWedge: true, wedgeCat: qgCat });
    } else {
      add({ id: "ring" + i, x, y, cat: RING_CATS[i], isWedge: false });
    }
  }

  // 6 rayons de 6 cases (36) : jamais la couleur du QG du rayon
  for (let s = 0; s < 6; s++) {
    const ang = s * 60 + 30;
    const own = CATEGORY_ORDER[s];
    const others = CAT_KEYS.filter(k => k !== own);
    const cats = [...others, others[0]];
    let prev = "hub";
    for (let k = 0; k < 6; k++) {
      const [x, y] = polar(SPOKE_R[k], ang);
      const id = "sp" + s + "-" + k;
      add({ id, x, y, cat: cats[k], isWedge: false });
      link(prev, id);
      prev = id;
    }
    link(prev, "ring" + (s * 6));
  }

  for (let i = 0; i < 36; i++) link("ring" + i, "ring" + ((i + 1) % 36));

  renderBoard();
  renderLegend();
}

/* ---------- Rendu 2.5D ---------- */
function hexPoints(cx, cy, r) {
  const pts = [];
  for (let i = 0; i < 6; i++) {
    const a = (i * 60 + 30) * Math.PI / 180;
    pts.push((cx + r * Math.cos(a)).toFixed(1) + "," + (cy + r * Math.sin(a)).toFixed(1));
  }
  return pts.join(" ");
}

function renderBoard() {
  const svg = $("#board");
  let defs = `<defs>
    <filter id="f-drop" x="-40%" y="-40%" width="180%" height="180%">
      <feDropShadow dx="0" dy="3" stdDeviation="2.5" flood-color="#000" flood-opacity="0.35"/>
    </filter>
    <filter id="f-soft" x="-40%" y="-40%" width="180%" height="180%">
      <feDropShadow dx="0" dy="1.5" stdDeviation="1.2" flood-color="#000" flood-opacity="0.25"/>
    </filter>
    <radialGradient id="rg-board" cx="50%" cy="46%">
      <stop offset="0%" stop-color="#f8f4e6"/><stop offset="100%" stop-color="#e8dfc4"/></radialGradient>`;
  for (const k of CAT_KEYS) {
    defs += `<radialGradient id="rg-${k}" cx="38%" cy="32%">
      <stop offset="0%" stop-color="${lighten(CATEGORIES[k].color, 90)}"/>
      <stop offset="100%" stop-color="${CATEGORIES[k].color}"/></radialGradient>`;
  }
  defs += `</defs>`;

  let out = defs;
  out += `<circle cx="350" cy="352" r="350" fill="url(#rg-board)" stroke="#c9b98a" stroke-width="3" filter="url(#f-soft)"/>`;
  out += `<circle cx="350" cy="352" r="${HUB_R + 14}" fill="#f2e9cf" stroke="#c9b98a" stroke-width="2" opacity="0.8"/>`;

  for (const id in board.cells) {
    const c = board.cells[id];
    if (c.isCenter) {
      // Moyeu : anthracite + logo Edukisto (étoile bleue au sigle infini)
      out += `<g id="cell-hub" class="cell hub-cell">
        <circle cx="${c.x}" cy="${c.y + 2}" r="${HUB_R}" fill="#00000022"/>
        <circle cx="${c.x}" cy="${c.y}" r="${HUB_R}" fill="#333333" stroke="#38bdf8" stroke-width="3" filter="url(#f-drop)"/>
        <g transform="translate(${c.x - 34} ${c.y - 34}) scale(1.06)">${EDUKISTO_MARK}</g>
        <circle cx="${c.x}" cy="${c.y}" r="${HUB_R - 3}" fill="none" stroke="#38bdf8" stroke-width="1" opacity="0.35"/>
      </g>`;
      continue;
    }
    const grad = "rg-" + (c.isWedge ? c.wedgeCat : c.cat);
    if (c.isWedge) {
      out += `<g id="cell-${c.id}" class="cell wedge-cell">
        <polygon points="${hexPoints(c.x, c.y + 2.5, 24)}" fill="#00000026"/>
        <polygon points="${hexPoints(c.x, c.y, 24)}" fill="url(#${grad})" stroke="#2b2b2b" stroke-width="2.5" filter="url(#f-drop)"/>
        <text x="${c.x}" y="${c.y + 6}" text-anchor="middle" class="cell-icon">${HQ_ICON}</text>
      </g>`;
    } else {
      out += `<g id="cell-${c.id}" class="cell">
        <circle cx="${c.x}" cy="${c.y + 2.5}" r="${CELL_R}" fill="#00000026"/>
        <circle cx="${c.x}" cy="${c.y}" r="${CELL_R}" fill="url(#${grad})" stroke="#2b2b2b" stroke-width="2" filter="url(#f-drop)"/>
        <text x="${c.x}" y="${c.y + 6}" text-anchor="middle" class="cell-icon">${CATEGORIES[c.cat].icon}</text>
      </g>`;
    }
  }

  // pions 2.5D
  players.forEach((p, i) => {
    const c = board.cells[p.pos];
    if (!c) return;
    const px = c.x + ((i % 3) - 1) * 14, py = c.y + (Math.floor(i / 3) - 0.5) * 16;
    const moving = animating && i === current;
    out += `<g id="pawn-${i}" filter="url(#f-drop)" class="pawn-group ${moving ? "pawn-moving" : ""}">
      <ellipse cx="${px}" cy="${py + 13}" rx="10" ry="4" fill="#00000033"/>
      <circle cx="${px}" cy="${py}" r="11" fill="${p.color}" stroke="#1d1d1d" stroke-width="1.5"/>
      <circle cx="${px - 3.5}" cy="${py - 4}" r="3.2" fill="#ffffffcc"/>
      <text x="${px}" y="${py - 14}" text-anchor="middle" class="pawn-emoji">${PAWNS[p.pawn].emoji}</text>
    </g>`;
  });

  svg.innerHTML = out;
}

function renderLegend() {
  const el = $("#legend");
  if (!el) return;
  let html = "<b>Catégories</b><div class='legend-grid'>";
  for (const k of CAT_KEYS) {
    html += `<span class="legend-item"><span class="dot" style="background:${CATEGORIES[k].color}"></span>${CATEGORIES[k].icon} ${CATEGORIES[k].name}</span>`;
  }
  html += `</div><b>Case spéciale</b><div class="legend-grid">
    <span class="legend-item">🧀 QG (bout de chaque rayon, sur le cercle) : camembert de la couleur en jeu</span>
    <span class="legend-item">Le dé impose le nombre exact de pas</span>
  </div>`;
  el.innerHTML = html;
}

/* ---------- Déplacement : EXACTEMENT le nombre du dé ----------
   BFS sur les états (case, pas restant) : on ne retient que les trajets
   de longueur exactement égale au dé. Le moyeu n'est accessible qu'en
   dernier pas et uniquement avec les 6 camemberts.                        */
function neighbors(cellId) { return board.adj[cellId] || []; }

function exactPaths(startId, steps, player) {
  const hasAllWedges = player && Object.keys(player.wedges).length === 6;
  let frontier = new Map([[startId, null]]);   // cellule -> parent (couche précédente)
  const layers = [frontier];
  for (let s = 0; s < steps; s++) {
    const next = new Map();
    const isLast = s === steps - 1;
    for (const [cell] of frontier) {
      for (const n of neighbors(cell)) {
        const c = board.cells[n];
        if (c.isCenter && !(isLast && hasAllWedges)) continue; // moyeu : dernier pas + 6 camemberts
        if (!next.has(n)) next.set(n, cell);
      }
    }
    frontier = next;
    layers.push(frontier);
  }
  const paths = {};
  for (const [cell] of frontier) {
    const path = [cell];
    let c = cell;
    for (let s = layers.length - 1; s > 0; s--) {
      c = layers[s].get(c);
      path.unshift(c);
    }
    paths[cell] = path;   // longueur exacte : steps + 1 cases
  }
  return paths;
}

/* ---------- Animation du dé ---------- */
const PIPS = {
  1: [4],
  2: [0, 8],
  3: [0, 4, 8],
  4: [0, 2, 6, 8],
  5: [0, 2, 4, 6, 8],
  6: [0, 2, 3, 5, 6, 8]
};
function dieFaceHTML(n) {
  let pips = "";
  for (let i = 0; i < 9; i++) {
    pips += `<span class="pip-slot">${PIPS[n].includes(i) ? "<span class='pip'></span>" : ""}</span>`;
  }
  return `<div class="die"><div class="die-face">${pips}</div></div>`;
}

function rollDice(cb) {
  const el = $("#dice-result");
  let spins = 0;
  const interval = setInterval(() => {
    const d = 1 + Math.floor(Math.random() * 6);
    el.innerHTML = dieFaceHTML(d);
    el.firstChild.firstChild.classList.add("die-tumble");
    spins++;
    if (spins >= 10) {
      clearInterval(interval);
      const final = 1 + Math.floor(Math.random() * 6);
      el.innerHTML = dieFaceHTML(final);
      el.firstChild.firstChild.classList.add("die-land");
      setTimeout(() => cb(final), 400);
    }
  }, 100);
}

/* ---------- Questions ---------- */
function pickQuestion(player, catKey) {
  const pack = window.QUESTION_PACKS[player.group];
  let pool = pack.questions.filter(q => q[0] === catKey && !usedQuestions[q[1]]);
  if (pool.length === 0) pool = pack.questions.filter(q => q[0] === catKey);
  if (pool.length === 0) pool = pack.questions.filter(q => !usedQuestions[q[1]]);
  const q = pool[Math.floor(Math.random() * pool.length)];
  usedQuestions[q[1]] = true;
  return q;
}

/* Extensions : cartes bonus Disney/Musique/… servies sur la catégorie Divertissement */
function pickThemeQuestion(player) {
  const keys = Object.keys(window.THEME_PACKS).filter(k => activeThemes[k]);
  if (keys.length === 0) return null;
  const pack = window.THEME_PACKS[keys[Math.floor(Math.random() * keys.length)]];
  let pool = pack.questions.filter(q => !usedQuestions["T::" + q[0]]);
  if (pool.length === 0) pool = pack.questions;
  const q = pool[Math.floor(Math.random() * pool.length)];
  usedQuestions["T::" + q[0]] = true;
  return { theme: pack.label, q };
}

/* ---------- Tour de jeu ---------- */
function startGame() {
  usedQuestions = {};
  gameOver = false;
  current = 0;
  players.forEach(p => { p.pos = "hub"; p.wedges = {}; });
  buildBoard();
  hide($("#setup-screen"));
  hide($("#win-screen"));
  show($("#game-screen"));
  updateTurnUI();
}

function updateTurnUI() {
  const p = players[current];
  $("#turn-title").textContent = `${PAWNS[p.pawn].emoji} Au tour de ${p.name}`;
  const wd = $("#wedges-display");
  wd.innerHTML = `<div class="camembert">${CAT_KEYS.map(k =>
    `<span class="wedge ${p.wedges[k] ? 'got' : ''}" style="background:${p.wedges[k] ? CATEGORIES[k].color : '#dee2e6'}" title="${CATEGORIES[k].name}"></span>`).join("")}</div>
    <p class="hint">${Object.keys(p.wedges).length}/6 camemberts</p>`;
  const ps = $("#players-summary");
  ps.innerHTML = players.map((pl, i) =>
    `<div class="player-row ${i === current ? 'active' : ''}">
       <span class="pawn-mini-inline">${PAWNS[pl.pawn].emoji}</span>
       <span>${pl.name}</span>
       <span class="group-tag">${window.QUESTION_PACKS[pl.group].label}</span>
       <span>${Object.keys(pl.wedges).length}/6</span>
     </div>`).join("");
}

$("#btn-roll").onclick = () => {
  if (!awaitingRoll || gameOver || animating) return;
  awaitingRoll = false;
  $("#btn-roll").disabled = true;
  rollDice((dice) => {
    const p = players[current];
    lastPaths = exactPaths(p.pos, dice, p);
    const targets = Object.keys(lastPaths);
    if (targets.length === 0) {
      $("#dice-result").textContent = `🎲 ${dice} — aucune case accessible, au tour suivant.`;
      setTimeout(nextTurn, 1400);
      return;
    }
    const el = $("#dice-result");
    el.innerHTML = dieFaceHTML(dice) + `<span class="dice-info">Dé : ${dice} — cliquez sur la case de destination (exactement ${dice} pas).</span>`;
    el.querySelector(".die-face").classList.add("die-land");
    targets.forEach(id => {
      const cell = $("#cell-" + id);
      if (cell) { cell.classList.add("reachable"); cell.onclick = () => moveTo(id); }
    });
  });
};

function moveTo(cellId) {
  document.querySelectorAll(".reachable").forEach(el => { el.classList.remove("reachable"); el.onclick = null; });
  const p = players[current];
  const path = lastPaths[cellId];
  if (!path || path.length < 2) { arrive(cellId); return; }
  animating = true;
  let step = 1;
  const walk = () => {
    p.pos = path[step];
    renderBoard();
    if (step < path.length - 1) { step++; setTimeout(walk, 300); }
    else { animating = false; setTimeout(() => arrive(cellId), 250); }
  };
  walk();
}

function arrive(cellId) {
  const p = players[current];
  const cell = board.cells[cellId];
  askQuestion(cell, p);
}

function askQuestion(cell, player) {
  const panel = $("#question-panel");
  show(panel);
  $("#answer-feedback").textContent = "";
  let catName, question, options, correct;

  if (cell.isCenter) {
    const cat = CAT_KEYS[Math.floor(Math.random() * CAT_KEYS.length)];
    const q = pickQuestion(player, cat);
    catName = "🏆 Question finale — " + CATEGORIES[cat].icon + " " + CATEGORIES[cat].name;
    question = q[1]; options = q.slice(2, 6); correct = q[6];
  } else if (cell.cat === "D") {
    // Extensions activées ? Les cartes bonus servent la catégorie Divertissement.
    const t = pickThemeQuestion(player);
    if (t) {
      catName = "⭐ " + t.theme + " (carte bonus)";
      question = t.q[0]; options = t.q.slice(1, 5); correct = t.q[5];
    } else {
      const q = pickQuestion(player, "D");
      catName = CATEGORIES.D.icon + " " + CATEGORIES.D.name + (cell.isWedge ? " — 🧀 camembert en jeu !" : "");
      question = q[1]; options = q.slice(2, 6); correct = q[6];
    }
  } else {
    const q = pickQuestion(player, cell.cat);
    catName = CATEGORIES[cell.cat].icon + " " + CATEGORIES[cell.cat].name + (cell.isWedge ? " — 🧀 camembert en jeu !" : "");
    question = q[1]; options = q.slice(2, 6); correct = q[6];
  }

  $("#question-cat").textContent = catName;
  $("#question-cat").style.color = cell.cat ? CATEGORIES[cell.cat].color : "#38bdf8";
  $("#question-text").textContent = question;

  const answers = $("#answers");
  answers.innerHTML = "";
  const order = [0, 1, 2, 3].sort(() => Math.random() - 0.5);
  order.forEach(i => {
    const btn = document.createElement("button");
    btn.className = "answer";
    btn.textContent = options[i];
    btn.onclick = () => answer(btn, i === correct, cell, player, correct, options);
    answers.appendChild(btn);
  });
}

function answer(btn, isCorrect, cell, player, correct, options) {
  document.querySelectorAll(".answer").forEach(b => b.disabled = true);
  const fb = $("#answer-feedback");
  if (isCorrect) {
    btn.classList.add("correct");
    fb.textContent = "✅ Bonne réponse !";
    if (cell.isWedge && !player.wedges[cell.wedgeCat]) {
      player.wedges[cell.wedgeCat] = true;
      fb.textContent += ` ${player.name} gagne le camembert ${CATEGORIES[cell.wedgeCat].name} !`;
    }
    if (cell.isCenter) {
      if (Object.keys(player.wedges).length === 6) return win(player);
      fb.textContent += " Il vous faut encore tous les camemberts pour gagner au centre !";
    }
    updateTurnUI();
    setTimeout(() => { awaitingRoll = true; $("#btn-roll").disabled = false; hide($("#question-panel")); $("#dice-result").textContent = ""; }, 1600);
  } else {
    btn.classList.add("wrong");
    const correctBtn = [...document.querySelectorAll(".answer")].find(b => b.textContent === options[correct]);
    if (correctBtn) correctBtn.classList.add("correct");
    fb.textContent = `❌ Mauvaise réponse. C'était : ${options[correct]}.`;
    setTimeout(() => { nextTurn(); }, 2000);
  }
}

function nextTurn() {
  hide($("#question-panel"));
  $("#dice-result").textContent = "";
  current = (current + 1) % players.length;
  awaitingRoll = true;
  $("#btn-roll").disabled = false;
  updateTurnUI();
}

function win(player) {
  gameOver = true;
  hide($("#game-screen"));
  show($("#win-screen"));
  $("#winner-name").textContent = `🏆 ${player.name} remporte la partie !`;
  $("#winner-sub").textContent = `6 camemberts collectés et question finale réussie. Bravo !`;
}

$("#btn-restart").onclick = () => {
  show($("#setup-screen"));
  hide($("#game-screen"));
  hide($("#win-screen"));
};

/* Init */
renderSetup();
