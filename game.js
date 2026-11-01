/* ===== Trivial Pursuit adapté à l'âge — moteur de jeu ===== */

/* ---------- Catégories (fidèles au Trivial Pursuit classique : 6 camemberts) ---------- */
const CATEGORIES = {
  G: { name: "Géographie",      color: "#0d6efd" },
  H: { name: "Histoire",        color: "#f4c20d" },
  S: { name: "Sciences",        color: "#20c997" },
  L: { name: "Loisirs & Sports",color: "#fd7e14" },
  A: { name: "Arts & Littérature", color: "#6f42c1" },
  D: { name: "Divertissement",  color: "#e83e8c" }
};
const CAT_KEYS = Object.keys(CATEGORIES);

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
let usedQuestions = {};   // clé -> true
let activeThemes = { disney: true, musique: true };
let board = null;
let gameOver = false;

/* ---------- Utilitaires DOM ---------- */
const $ = (sel) => document.querySelector(sel);
const show = (el) => el.classList.remove("hidden");
const hide = (el) => el.classList.add("hidden");

/* ---------- Écran de configuration ---------- */
function renderSetup() {
  const list = $("#players-list");
  list.innerHTML = "";
  players.forEach((p, i) => {
    const row = document.createElement("div");
    row.className = "player-row";
    row.innerHTML = `<span class="dot" style="background:${p.color}"></span>
      <span>${p.name}</span>
      <span class="group-tag">${AGE_GROUPS.includes(p.group) ? window.QUESTION_PACKS[p.group].label : ""}</span>
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
    pos: "center",
    wedges: {},
    turnOrder: players.length
  });
  $("#new-player-name").value = "";
  $("#new-player-age").value = "";
  refreshSetup();
};

$("#btn-start").onclick = startGame;

/* ---------- Plateau (rayons de 3 cases, comme le jeu original) ---------- */
const RING_R = 300, MID_R = 210, INNER_R = 120, CENTER_R = 80;
const CATEGORY_ORDER = ["G", "S", "A", "H", "L", "D"]; // ordre des rayons

function polar(r, angleDeg) {
  const a = (angleDeg - 90) * Math.PI / 180;
  return [350 + r * Math.cos(a), 350 + r * Math.sin(a)];
}

function buildBoard() {
  board = { cells: {}, ring: [] };
  const svg = $("#board");

  // Cases de l'anneau extérieur (36 cases)
  const ringAngles = [];
  for (let i = 0; i < 36; i++) ringAngles.push(i * 10);
  ringAngles.forEach((ang, i) => {
    const [x, y] = polar(RING_R, ang);
    const cell = {
      id: "ring" + i, x, y, cat: CATEGORY_ORDER[i % 6],
      isWedge: i % 6 === 0, isTheme: i % 6 === 3, wedgeCat: CATEGORY_ORDER[i % 6]
    };
    board.cells[cell.id] = cell;
    board.ring.push(cell);
  });

  // Cases médianes (24 cases) et cases camembert internes (6)
  CATEGORY_ORDER.forEach((cat, s) => {
    const ang = s * 60;
    // case camembert interne (proche du centre)
    const [wx, wy] = polar(INNER_R, ang + 30);
    const wedgeCell = { id: "wedge-" + cat, x: wx, y: wy, cat, isWedge: true, wedgeCat: cat, isTheme: false };
    board.cells[wedgeCell.id] = wedgeCell;

    // deux cases du rayon
    [MID_R - 40, RING_R - 45].forEach((r, k) => {
      const [x, y] = polar(r, ang + 30);
      const id = "mid-" + s + "-" + k;
      board.cells[id] = { id, x, y, cat, isWedge: false, isTheme: false };
    });
  });

  // Centre
  board.cells["center"] = { id: "center", x: 350, y: 350, cat: null, isCenter: true, isWedge: false, isTheme: false };

  renderBoard();
}

function renderBoard() {
  const svg = $("#board");
  let out = "";

  // anneau central décoratif
  const [cx0] = polar(0, 0);
  out += `<circle cx="350" cy="350" r="${CENTER_R}" fill="#fff8e7" stroke="#333" stroke-width="2" id="cell-center"/>
          <text x="350" y="345" text-anchor="middle" class="center-label">CENTRE</text>
          <text x="350" y="365" text-anchor="middle" class="center-sub">6 camemberts → victoire</text>`;

  for (const id in board.cells) {
    const c = board.cells[id];
    if (c.id === "center") continue;
    const color = c.isTheme ? "#adb5bd" : CATEGORIES[c.cat].color;
    const shape = c.isWedge ? "polygon hexsmall" : "circle cell";
    if (c.isWedge) {
      const pts = hexPoints(c.x, c.y, 26);
      out += `<polygon points="${pts}" fill="${color}" stroke="#333" id="cell-${c.id}" class="cell wedge-cell"/>`;
    } else {
      out += `<circle cx="${c.x}" cy="${c.y}" r="${c.isTheme ? 18 : 20}" fill="${color}" stroke="#333" id="cell-${c.id}" class="cell ${c.isTheme ? 'theme-cell' : ''}"/>`;
      if (c.isTheme) out += `<text x="${c.x}" y="${c.y + 5}" text-anchor="middle" class="theme-star">★</text>`;
    }
  }

  // pions
  players.forEach((p, i) => {
    const c = board.cells[p.pos];
    const [px, py] = [c.x + ((i % 3) - 1) * 14, c.y + (Math.floor(i / 3) - 0.5) * 16];
    out += `<g id="pawn-${i}"><circle cx="${px}" cy="${py}" r="9" fill="${p.color}" stroke="#222" stroke-width="1.5"/>
            <text x="${px}" y="${py + 3.5}" text-anchor="middle" class="pawn-label">${p.name[0]}</text></g>`;
  });

  svg.innerHTML = out;
}

function hexPoints(cx, cy, r) {
  const pts = [];
  for (let i = 0; i < 6; i++) {
    const a = i * 60 * Math.PI / 180;
    pts.push((cx + r * Math.cos(a)).toFixed(1) + "," + (cy + r * Math.sin(a)).toFixed(1));
  }
  return pts.join(" ");
}

/* ---------- Déplacement ---------- */
function neighbors(cellId) {
  const c = board.cells[cellId];
  const res = [];
  if (c.id === "center") {
    CATEGORY_ORDER.forEach(cat => res.push("wedge-" + cat));
    return res;
  }
  if (c.isWedge) {
    res.push("center");
    const s = CATEGORY_ORDER.indexOf(c.cat);
    res.push("mid-" + s + "-0");
    res.push("mid-" + s + "-1");
    const prev = (s + 5) % 6, next = (s + 1) % 6;
    res.push("mid-" + prev + "-1");
    res.push("mid-" + next + "-0");
    return res;
  }
  // cases médianes : reconstruire via distance angulaire
  const all = Object.values(board.cells).filter(x => x.id !== "center");
  for (const o of all) {
    if (o.id === cellId) continue;
    const d = Math.hypot(o.x - c.x, o.y - c.y);
    if (d < 95) res.push(o.id);
  }
  return res;
}

function reachable(startId, steps, player) {
  // Règle officielle : le centre n'est accessible qu'avec les 6 camemberts.
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
  if (frontier.has("center")) {
    // On ne peut finir au centre que si le trajet est possible : gardé tel quel si permis.
    return [...frontier].sort((a, b) => (a === "center" ? -1 : b === "center" ? 1 : 0));
  }
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
  if (keys.length === 0) return pickQuestion(player, CAT_KEYS[Math.floor(Math.random() * 6)]);
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
  players.forEach(p => { p.pos = "center"; p.wedges = {}; });
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
  $("#dice-result").textContent = `🎲 ${dice} — choisissez la case de destination.`;
  const p = players[current];
  const targets = reachable(p.pos, dice, p);
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
  askQuestion(board.cells[cellId], p);
}

function askQuestion(cell, player) {
  const panel = $("#question-panel");
  show(panel);
  $("#answer-feedback").textContent = "";
  let catName, question, options, correct;

  if (cell.isCenter) {
    // Question finale : catégorie au hasard
    const cat = CAT_KEYS[Math.floor(Math.random() * CAT_KEYS.length)];
    const q = pickQuestion(player, cat);
    catName = "🏆 Question finale — " + CATEGORIES[cat].name;
    question = q[1]; options = q.slice(2, 6); correct = q[6];
    panel.dataset.final = "1";
  } else if (cell.isTheme) {
    const t = pickThemeQuestion(player);
    catName = "⭐ " + t.theme;
    question = t.q[0]; options = t.q.slice(1, 5); correct = t.q[5];
    panel.dataset.final = "0";
  } else {
    const q = pickQuestion(player, cell.cat);
    catName = CATEGORIES[cell.cat].name + (cell.isWedge ? " — 🧀 camembert en jeu !" : "");
    question = q[1]; options = q.slice(2, 6); correct = q[6];
    panel.dataset.final = "0";
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
    if (cell.isCenter && Object.keys(player.wedges).length === 6) {
      return win(player);
    }
    if (cell.isCenter) {
      fb.textContent += " Il vous faut encore tous les camemberts pour gagner au centre !";
    }
    updateTurnUI();
    awaitingRoll = false;
    setTimeout(() => { awaitingRoll = true; $("#btn-roll").disabled = false; hide($("#question-panel")); $("#dice-result").textContent=""; }, 1600);
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
