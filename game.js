/* ===== Trivial Pursuit adapté à l'âge — moteur de jeu ===== */

/* ---------- Catégories (fidèles au Trivial Pursuit classique : 6 camemberts) ---------- */
const CATEGORIES = {
  G: { name: "Géographie",        color: "#0d6efd", icon: "🌍" },
  H: { name: "Histoire",          color: "#f4c20d", icon: "🏛️" },
  S: { name: "Sciences",          color: "#20c997", icon: "🔬" },
  L: { name: "Loisirs & Sports",  color: "#fd7e14", icon: "⚽" },
  A: { name: "Arts & Littérature",color: "#6f42c1", icon: "🎨" },
  D: { name: "Divertissement",    color: "#e83e8c", icon: "🎬" }
};
const CAT_KEYS = Object.keys(CATEGORIES);

const ROLL_COLOR = "#8d99ae", ROLL_ICON = "↻";
const THEME_COLOR = "#343a40", THEME_ICON = "★";
const HQ_ICON = "🧀";

/* ---------- Tranches d'âge ---------- */
const AGE_GROUPS = ["6-8", "9-11", "12-15", "16-30", "31+"];
function ageGroupFor(age) {
  if (age <= 8) return "6-8";
  if (age <= 11) return "9-11";
  if (age <= 15) return "12-15";
  if (age <= 30) return "16-30";
  return "31+";
}

/* ---------- État ---------- */
let players = [];
let current = 0;
let awaitingRoll = true;
let usedQuestions = {};
let activeThemes = { disney: true, musique: true };
let board = null;
let gameOver = false;
var CATEGORY_ORDER = ["G", "S", "A", "H", "L", "D"];

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
      <label for="${id}">⭐ ${pack.label} (${pack.questions.length} questions)</label>`;
    div.querySelector("input").onchange = (e) => { activeThemes[key] = e.target.checked; };
    themes.appendChild(div);
  });

  $("#btn-start").disabled = players.length < 2;
}

function refreshSetup() { renderSetup(); }

const PLAYER_COLORS = ["#e63946", "#2a9d8f", "#457b9d", "#ffb703", "#8338ec", "#ff7096"];
$("#btn-add-player").onclick = () => {
  const name = $("#new-player-name").value.trim();
  const age = parseInt($("#new-player-age").value, 10);
  if (!name) return alert("Donnez un nom au joueur.");
  if (!age || age < 4 || age > 120) return alert("Donnez un âge valide (4 à 120).");
  if (players.length >= 6) return alert("Maximum 6 joueurs.");
  players.push({
    name, age,
    group: ageGroupFor(age),
    color: PLAYER_COLORS[players.length % PLAYER_COLORS.length],
    pos: null,
    wedges: {}
  });
  $("#new-player-name").value = "";
  $("#new-player-age").value = "";
  refreshSetup();
};

$("#btn-start").onclick = startGame;

/* ---------- Plateau (fidèle au jeu original) ----------
   - Moyeu central (question finale)
   - 6 rayons de 3 cases : interne / SIÈGE camembert (au milieu) / externe
   - Anneau extérieur de 36 cases ; « Rejouez » (↻) à l'entrée de chaque rayon,
     case à thème (★) à l'opposée de chaque sextant
   - Total : 1 + 18 + 36 = 55 cases, comme le plateau classique                */
const HUB_R = 68;
const RING_R = 305, SPOKE_OUT_R = 248, HQ_R = 192, SPOKE_IN_R = 136;
const CELL_R = 21;

function polar(r, angleDeg) {
  const a = (angleDeg - 90) * Math.PI / 180;
  return [350 + r * Math.cos(a), 350 + r * Math.sin(a)];
}

function buildBoard() {
  board = { cells: {}, adj: {} };
  const add = (c) => { board.cells[c.id] = c; board.adj[c.id] = []; };
  const link = (a, b) => { board.adj[a].push(b); board.adj[b].push(a); };

  add({ id: "hub", x: 350, y: 350, cat: null, isCenter: true, isWedge: false, isRollAgain: false, isTheme: false });

  for (let s = 0; s < 6; s++) {
    const cat = CATEGORY_ORDER[s];
    const ang = s * 60 + 30;
    const [ix, iy] = polar(SPOKE_IN_R, ang);
    const [hx, hy] = polar(HQ_R, ang);
    const [ox, oy] = polar(SPOKE_OUT_R, ang);
    add({ id: "in-" + cat, x: ix, y: iy, cat, isWedge: false, isRollAgain: false, isTheme: false });
    add({ id: "hq-" + cat, x: hx, y: hy, cat, isWedge: true, wedgeCat: cat, isRollAgain: false, isTheme: false });
    add({ id: "out-" + cat, x: ox, y: oy, cat, isWedge: false, isRollAgain: false, isTheme: false });
    link("hub", "in-" + cat);
    link("in-" + cat, "hq-" + cat);
    link("hq-" + cat, "out-" + cat);
  }

  for (let i = 0; i < 36; i++) {
    const ang = i * 10;
    const [x, y] = polar(RING_R, ang);
    const m = i % 6;
    // Chaque sextant contient 4 cases de la même catégorie que son rayon,
    // sauf l'entrée (Rejouez ↻) et la case opposée (thème ★).
    add({
      id: "ring" + i, x, y,
      cat: (m === 0 || m === 3) ? null : CATEGORY_ORDER[Math.floor(i / 6)],
      isWedge: false,
      isRollAgain: m === 0,
      isTheme: m === 3
    });
  }
  for (let i = 0; i < 36; i++) {
    link("ring" + i, "ring" + ((i + 1) % 36));
    if (i % 6 === 0) link("ring" + i, "out-" + CATEGORY_ORDER[i / 6]);
  }

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

function cellPaint(cell) {
  if (cell.isRollAgain) return { c: ROLL_COLOR, icon: ROLL_ICON };
  if (cell.isTheme) return { c: THEME_COLOR, icon: THEME_ICON };
  if (cell.isWedge) return { c: CATEGORIES[cell.wedgeCat].color, icon: HQ_ICON };
  return { c: CATEGORIES[cell.cat].color, icon: CATEGORIES[cell.cat].icon };
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
    <radialGradient id="rg-hub" cx="38%" cy="35%">
      <stop offset="0%" stop-color="#fff3c4"/><stop offset="100%" stop-color="#e9b949"/>
    </radialGradient>
    <radialGradient id="rg-roll" cx="38%" cy="32%">
      <stop offset="0%" stop-color="#cfd6e4"/><stop offset="100%" stop-color="${ROLL_COLOR}"/></radialGradient>
    <radialGradient id="rg-theme" cx="38%" cy="32%">
      <stop offset="0%" stop-color="#59606a"/><stop offset="100%" stop-color="${THEME_COLOR}"/></radialGradient>
    <radialGradient id="rg-board" cx="50%" cy="46%">
      <stop offset="0%" stop-color="#fffdf5"/><stop offset="100%" stop-color="#f3ead6"/></radialGradient>`;
  for (const k of CAT_KEYS) {
    defs += `<radialGradient id="rg-${k}" cx="38%" cy="32%">
      <stop offset="0%" stop-color="${lighten(CATEGORIES[k].color, 90)}"/>
      <stop offset="100%" stop-color="${CATEGORIES[k].color}"/></radialGradient>`;
  }
  defs += `</defs>`;

  let out = defs;
  out += `<circle cx="350" cy="352" r="336" fill="url(#rg-board)" stroke="#c9b98a" stroke-width="3" filter="url(#f-soft)"/>`;
  out += `<circle cx="350" cy="352" r="${HUB_R + 16}" fill="#f7efd8" stroke="#c9b98a" stroke-width="2" opacity="0.8"/>`;

  for (const id in board.cells) {
    const c = board.cells[id];
    if (c.isCenter) {
      out += `<g id="cell-hub" class="cell hub-cell">
        <circle cx="${c.x}" cy="${c.y + 2}" r="${HUB_R}" fill="#00000022"/>
        <circle cx="${c.x}" cy="${c.y}" r="${HUB_R}" fill="url(#rg-hub)" stroke="#8a6d1d" stroke-width="3" filter="url(#f-drop)"/>
        <text x="${c.x}" y="${c.y - 4}" text-anchor="middle" class="center-label">CENTRE</text>
        <text x="${c.x}" y="${c.y + 16}" text-anchor="middle" class="center-sub">6 🧀 → victoire</text>
      </g>`;
      continue;
    }
    const paint = cellPaint(c);
    const grad = c.isRollAgain ? "rg-roll" : c.isTheme ? "rg-theme" : "rg-" + (c.isWedge ? c.wedgeCat : c.cat);
    if (c.isWedge) {
      out += `<g id="cell-${c.id}" class="cell wedge-cell">
        <polygon points="${hexPoints(c.x, c.y + 2.5, 25)}" fill="#00000026"/>
        <polygon points="${hexPoints(c.x, c.y, 25)}" fill="url(#${grad})" stroke="#2b2b2b" stroke-width="2.5" filter="url(#f-drop)"/>
        <text x="${c.x}" y="${c.y + 6}" text-anchor="middle" class="cell-icon">${HQ_ICON}</text>
      </g>`;
    } else {
      out += `<g id="cell-${c.id}" class="cell">
        <circle cx="${c.x}" cy="${c.y + 2.5}" r="${CELL_R}" fill="#00000026"/>
        <circle cx="${c.x}" cy="${c.y}" r="${CELL_R}" fill="url(#${grad})" stroke="#2b2b2b" stroke-width="2" filter="url(#f-drop)"/>
        <text x="${c.x}" y="${c.y + 6}" text-anchor="middle" class="cell-icon">${paint.icon}</text>
      </g>`;
    }
  }

  players.forEach((p, i) => {
    const c = board.cells[p.pos];
    if (!c) return;
    const px = c.x + ((i % 3) - 1) * 15, py = c.y + (Math.floor(i / 3) - 0.5) * 18;
    out += `<g id="pawn-${i}" filter="url(#f-drop)">
      <ellipse cx="${px}" cy="${py + 13}" rx="10" ry="4" fill="#00000033"/>
      <circle cx="${px}" cy="${py}" r="11" fill="${p.color}" stroke="#1d1d1d" stroke-width="1.5"/>
      <circle cx="${px - 3.5}" cy="${py - 4}" r="3.2" fill="#ffffffcc"/>
      <text x="${px}" y="${py + 4}" text-anchor="middle" class="pawn-label">${p.name[0]}</text>
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
  html += `</div><b>Cases spéciales</b><div class="legend-grid">
    <span class="legend-item"><span class="dot" style="background:${ROLL_COLOR}"></span>↻ Rejouez : relancez le dé</span>
    <span class="legend-item"><span class="dot" style="background:${THEME_COLOR}"></span>★ Thème : question Disney / Musique</span>
    <span class="legend-item">🧀 Siège de catégorie (milieu des rayons) : camembert en jeu</span>
  </div>`;
  el.innerHTML = html;
}

/* ---------- Déplacement (adjacence explicite) ---------- */
function neighbors(cellId) { return board.adj[cellId] || []; }

function reachable(startId, steps, player) {
  const hasAllWedges = player && Object.keys(player.wedges).length === 6;
  let frontier = new Set([startId]);
  for (let s = 0; s < steps; s++) {
    const next = new Set();
    frontier.forEach(id => neighbors(id).forEach(n => {
      if (board.cells[n].isCenter && !hasAllWedges) return;
      next.add(n);
    }));
    frontier = next;
  }
  frontier.delete(startId);
  return [...frontier];
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
  players.forEach((p, i) => { p.pos = "ring" + (2 + i * 6); p.wedges = {}; });
  buildBoard();
  hide($("#setup-screen"));
  hide($("#win-screen"));
  show($("#game-screen"));
  updateTurnUI();
}

function updateTurnUI() {
  const p = players[current];
  $("#turn-title").textContent = `Au tour de ${p.name}`;
  const wd = $("#wedges-display");
  wd.innerHTML = `<div class="camembert">${CAT_KEYS.map(k =>
    `<span class="wedge ${p.wedges[k] ? 'got' : ''}" style="background:${p.wedges[k] ? CATEGORIES[k].color : '#dee2e6'}" title="${CATEGORIES[k].name}"></span>`).join("")}</div>
    <p class="hint">${Object.keys(p.wedges).length}/6 camemberts</p>`;
  const ps = $("#players-summary");
  ps.innerHTML = players.map((pl, i) =>
    `<div class="player-row ${i === current ? 'active' : ''}">
       <span class="dot" style="background:${pl.color}"></span><span>${pl.name}</span>
       <span class="group-tag">${window.QUESTION_PACKS[pl.group].label}</span>
       <span>${Object.keys(pl.wedges).length}/6</span>
     </div>`).join("");
}

$("#btn-roll").onclick = () => {
  if (!awaitingRoll || gameOver) return;
  const dice = 1 + Math.floor(Math.random() * 6);
  const p = players[current];
  const targets = reachable(p.pos, dice, p);
  if (targets.length === 0) {
    $("#dice-result").textContent = `🎲 ${dice} — aucune case accessible, au tour suivant.`;
    setTimeout(nextTurn, 1400);
    return;
  }
  $("#dice-result").textContent = `🎲 ${dice} — cliquez sur la case de destination.`;
  targets.forEach(id => {
    const el = $("#cell-" + id);
    if (el) { el.classList.add("reachable"); el.onclick = () => moveTo(id); }
  });
  $("#btn-roll").disabled = true;
};

function moveTo(cellId) {
  document.querySelectorAll(".reachable").forEach(el => { el.classList.remove("reachable"); el.onclick = null; });
  const p = players[current];
  p.pos = cellId;
  renderBoard();
  const cell = board.cells[cellId];
  if (cell.isRollAgain) {
    $("#dice-result").textContent = "↻ Rejouez ! Relancez le dé.";
    awaitingRoll = true;
    $("#btn-roll").disabled = false;
    return;
  }
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
  } else if (cell.isTheme) {
    const t = pickThemeQuestion(player);
    if (!t) {
      const cat = cell.cat || CAT_KEYS[0];
      const q = pickQuestion(player, cat);
      catName = CATEGORIES[cat].name; question = q[1]; options = q.slice(2, 6); correct = q[6];
    } else {
      catName = "⭐ " + t.theme;
      question = t.q[0]; options = t.q.slice(1, 5); correct = t.q[5];
    }
  } else {
    const q = pickQuestion(player, cell.cat);
    catName = CATEGORIES[cell.cat].icon + " " + CATEGORIES[cell.cat].name + (cell.isWedge ? " — 🧀 camembert en jeu !" : "");
    question = q[1]; options = q.slice(2, 6); correct = q[6];
  }

  $("#question-cat").textContent = catName;
  $("#question-cat").style.color = cell.cat ? CATEGORIES[cell.cat].color : "#333";
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
    awaitingRoll = false;
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
