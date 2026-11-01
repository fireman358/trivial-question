/* ===== Trivial Quest adapté à l'âge — moteur de jeu ===== */

/* ---------- Catégories : couleurs du jeu ---------- */
const CATEGORIES = {
  G: { name: "Géographie",        color: "#1f6fb2", icon: "🗺️" },
  H: { name: "Histoire",          color: "#f2c500", icon: "🏛️" },
  S: { name: "Sciences",          color: "#2e9b4e", icon: "🔬" },
  L: { name: "Sports & Loisirs",  color: "#f07c1e", icon: "⚽" },
  A: { name: "Arts & Littérature",color: "#7a4fa3", icon: "🎨" },
  D: { name: "Divertissement",    color: "#d5368d", icon: "🎬" }
};
const CAT_KEYS = Object.keys(CATEGORIES);
const HQ_ICON = "◈";

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
// Sac sans remise : chaque question d'un même pool est posée une seule fois
// avant que le pool ne soit mélangé et réutilisé.
let drawBags = {};
// Une seule recharge à la fois : les cartes bonus ne se mélangent pas.
let activeTheme = null;

/* Timer de réponse + persistance */
let questionTimer = null;
let timeLeft = 0;

/* Tranche d'âge pour les recharges (plus larges que le jeu de base) */
function themeGroupFor(age) {
  if (age <= 12) return "4-12";
  if (age <= 21) return "13-21";
  return "22+";
}
let board = null;
let gameOver = false;
let animating = false;
let lastPaths = {};
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
      <span class="pawn-tag">${PAWNS[p.pawn].emoji} ${PAWNS[p.pawn].name}</span>
      <button data-i="${i}" class="remove">✕</button>`;
    row.querySelector(".remove").onclick = () => { players.splice(i, 1); refreshSetup(); };
    list.appendChild(row);
  });

  const themes = $("#themes-list");
  themes.innerHTML = "";
  // Culture générale d'abord : l'option par défaut, en tête de liste
  const noneDiv = document.createElement("div");
  noneDiv.className = "theme-option";
  noneDiv.innerHTML = `<input type="radio" name="theme-pack" id="theme-none" ${activeTheme === null ? "checked" : ""}>
    <label for="theme-none">🎓 <b>Culture générale</b> — jeu de base (par défaut)</label>`;
  noneDiv.querySelector("input").onchange = (e) => { if (e.target.checked) activeTheme = null; };
  themes.appendChild(noneDiv);
  // puis les recharges
  Object.keys(window.THEME_PACKS).forEach(key => {
    const pack = window.THEME_PACKS[key];
    const id = "theme-" + key;
    const div = document.createElement("div");
    div.className = "theme-option";
    const total = Object.values(pack.groups).reduce((a, g) => a + g.questions.length, 0);
    div.innerHTML = `<input type="radio" name="theme-pack" id="${id}" ${activeTheme === key ? "checked" : ""}>
      <label for="${id}">${pack.icon} <b>${pack.label}</b> — ${total} questions (3 tranches)</label>`;
    div.querySelector("input").onchange = (e) => { activeTheme = e.target.checked ? key : null; };
    themes.appendChild(div);
  });

  renderPawnPicker();
  $("#btn-start").disabled = players.length < GAME_CONFIG.minPlayers;
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
    wedges: {},
    stats: { correct: 0, wrong: 0, timeout: 0, byCat: {} }
  });
  pendingPawn = null;
  $("#new-player-name").value = "";
  $("#new-player-age").value = "";
  refreshSetup();
};

/* ---------- Persistance localStorage ---------- */
function saveGame() {
  try {
    if (!GAME_CONFIG.storageKey) return;
    localStorage.setItem(GAME_CONFIG.storageKey, JSON.stringify({
      players, current, activeTheme, gameOver, drawBags, v: 1
    }));
  } catch (e) { /* localStorage indisponible */ }
}
function loadGame() {
  try {
    const raw = localStorage.getItem(GAME_CONFIG.storageKey);
    if (!raw) return false;
    const snap = JSON.parse(raw);
    if (!snap.players || snap.players.length < GAME_CONFIG.minPlayers) return false;
    players = snap.players;
    current = snap.current || 0;
    activeTheme = snap.activeTheme || null;
    gameOver = !!snap.gameOver;
    drawBags = snap.drawBags || {};
    return true;
  } catch (e) { return false; }
}
function clearSave() {
  try { localStorage.removeItem(GAME_CONFIG.storageKey); } catch (e) {}
}
/* Une partie en cours survit au rafraîchissement de la page */
function tryResume() {
  if (!loadGame()) return false;
  if (gameOver) { clearSave(); return false; }
  hide($("#setup-screen"));
  show($("#game-screen"));
  show($("#btn-newgame-header"));
  buildBoard();
  updateTurnUI();
  renderSetup();
  return true;
}

$("#btn-start").onclick = startGame;

/* ---------- Plateau officiel : 73 cases ----------
   - Moyeu central (1) : départ et question finale
   - 6 rayons de 6 cases (36) : couleurs alternées, jamais la couleur du QG
   - Piste circulaire extérieure (36) : les 6 QG en bout de rayon,
     les 30 autres cases alternent les catégories                      */
const HUB_R = 78;
const RING_R = 322, SPOKE_R = [148, 185, 222, 259, 296];
const CELL_R = 13;

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

  // 6 rayons de 6 cases (36), alignés sur les QG (intersection rayon/anneau).
  // Couleurs en carré latin : à distance égale du centre, chaque rayon porte
  // une catégorie différente — un dé donné ne peut jamais tomber deux fois
  // sur la même catégorie. La case interne (k=0) porte la couleur du rayon,
  // la case externe (k=5) jamais (elle jouxte le QG de cette même couleur).
  // Décalages du carré latin : tous distincts entre rayons (latin) et choisis
  // pour que la case externe (k=5) ne porte jamais la couleur du QG du rayon.
  const SHIFT = [2, 4, 0, 3, 5, 1];
  for (let s = 0; s < 6; s++) {
    const ang = s * 60;
    const shift = SHIFT[s];
    let prev = "hub";
    for (let k = 0; k < SPOKE_R.length; k++) {
      const [x, y] = polar(SPOKE_R[k], ang);
      const id = "sp" + s + "-" + k;
      add({ id, x, y, cat: CAT_KEYS[(shift + k) % 6], isWedge: false });
      link(prev, id);
      prev = id;
    }
    link(prev, "ring" + (s * 6));
  }

  for (let i = 0; i < 36; i++) link("ring" + i, "ring" + ((i + 1) % 36));

  renderBoard();
}

/* ---------- Rendu 2.5D ---------- */
/* Losange (diamant) : 4 sommets, plus haut que large */
function diamondPoints(cx, cy, r) {
  return [
    (cx) + "," + (cy - r * 1.15),
    (cx + r * 0.75) + "," + (cy),
    (cx) + "," + (cy + r * 1.15),
    (cx - r * 0.75) + "," + (cy)
  ].join(" ");
}

function hexPoints(cx, cy, r) {
  const pts = [];
  for (let i = 0; i < 6; i++) {
    const a = (i * 60 + 30) * Math.PI / 180;
    pts.push((cx + r * Math.cos(a)).toFixed(1) + "," + (cy + r * Math.sin(a)).toFixed(1));
  }
  return pts.join(" ");
}

/* Auto-fit des labels de secteurs : mesure la boîte réelle de chaque texte
   (getBBox) et réduit la police jusqu'à ce que TOUTE la boîte soit dans le
   triangle du secteur — mesure réelle, aucune estimation. */
function fitSectorLabels(svgEl) {
  if (!svgEl || !svgEl.querySelectorAll) return;
  svgEl.querySelectorAll(".sector-label").forEach(g => {
    if (typeof g.querySelector !== "function" || typeof g.getBBox !== "function") return;
    const sector = +g.getAttribute("data-sector");
    if (isNaN(sector)) return;
    const ang = sector * 60 + 30;
    const [t1x, t1y] = polar(HUB_R + 6, ang - 29);
    const [t2x, t2y] = polar(HUB_R + 6, ang + 29);
    const [b1x, b1y] = polar(RING_R - 4, ang - 29);
    const [b2x, b2y] = polar(RING_R - 4, ang + 29);
    const quad = [[t1x, t1y], [t2x, t2y], [b2x, b2y], [b1x, b1y]];
    const inside = (px, py) => {
      for (let i = 0; i < 4; i++) {
        const [ax, ay] = quad[i], [bx, by] = quad[(i + 1) % 4];
        if ((bx - ax) * (py - ay) - (by - ay) * (px - ax) < -0.5) return false;
      }
      return true;
    };
    const nums = (g.getAttribute("transform").match(/-?[\d.]+/g) || []).map(Number);
    const [glx, gly, rot] = nums;
    const rad = rot * Math.PI / 180, cos = Math.cos(rad), sin = Math.sin(rad);
    const texts = [...g.querySelectorAll("text")];
    const nameText = texts.find(t => t.classList.contains("sector-radial")) || texts[0];
    let guard = 0;
    while (guard++ < 60) {
      if (typeof nameText.getBBox !== "function") return;
      const bb = nameText.getBBox();
      /* 1) dans le triangle (tous les textes) */
      let insideAll = true;
      for (const t of texts) {
        const tb = t.getBBox();
        const corners = [[tb.x, tb.y], [tb.x + tb.width, tb.y], [tb.x, tb.y + tb.height], [tb.x + tb.width, tb.y + tb.height]];
        for (const [cx, cy] of corners) {
          const px = glx + cx * cos - cy * sin;
          const py = gly + cx * sin + cy * cos;
          if (!inside(px, py)) { insideAll = false; break; }
        }
        if (!insideAll) break;
      }
      /* 2) remplir la course : longueur du texte ≈ course (±3px) */
      const len = bb.width;
      const fills = len >= course - 6;
      if (insideAll && fills) break;
      const cur = +nameText.getAttribute("font-size") || 10;
      if (!insideAll || len > course + 3) {
        /* trop grand : réduire */
        texts.forEach(t => t.setAttribute("font-size", Math.max(6, (+t.getAttribute("font-size") || 10) - 1)));
      } else {
        /* trop petit : agrandir */
        texts.forEach(t => t.setAttribute("font-size", Math.min(42, (+t.getAttribute("font-size") || 10) + 1)));
      }
    }
  });
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

  /* Légende intégrée : chaque secteur (l'espace vide entre deux rayons, du moyeu
     jusqu'à l'anneau extérieur) est un grand triangle coloré de sa catégorie,
     avec l'icône et le nom occupant l'espace. Suit la recharge via catInfo(). */
  for (let sector = 0; sector < 6; sector++) {
    const slot = CAT_KEYS[sector];
    const info = catInfo(slot);
    const ang = sector * 60 + 30;          // centre de l'espace VIDE entre deux rayons
    const a1 = ang - 29, a2 = ang + 29;    // limites calées entre les rayons voisins (60° d'écart)
    // Triangle : sommet au bord du moyeu, base élargie sur l'anneau extérieur
    const [t1x, t1y] = polar(HUB_R + 6, a1);
    const [t2x, t2y] = polar(HUB_R + 6, a2);
    const [b1x, b1y] = polar(RING_R - 4, a1);
    const [b2x, b2y] = polar(RING_R - 4, a2);
    out += `<polygon class="sector-fill"
      points="${t1x},${t1y} ${t2x},${t2y} ${b2x},${b2y} ${b1x},${b1y}"
      fill="${info.color}" opacity="0.92"/>`;
    /* Icône + nom sur deux lignes, dans le sens de la lecture.
       La taille du texte s'adapte au nom : elle est calculée pour que le
       nom le plus long tienne dans la largeur du triangle à ce rayon. */
    /* TEXTE RADIAL PLEINE COURSE : le mot occupe toute la bande libre,
       de la base du triangle (près de l'anneau) jusqu'à l'arc du logo
       central. La taille se calcule pour que la dernière lettre finisse
       EXACTEMENT au bord du logo. */
    const textLen = info.name.length;
    const startR = RING_R - 26;                 // première lettre : contre la base
    const endR = HUB_R + 16;                    // dernière lettre : bord du logo (HUB_R=72)
    const course = startR - endR;              // course totale disponible
    /* taille pour que : textLen × 0.62 × font = course */
    let effFont = Math.floor(course / (textLen * 0.66));
    effFont = Math.max(8, Math.min(36, effFont));
    const charW = effFont * 0.66;
    /* sens de lecture : sur la moitié DROITE du plateau (ang entre 0 et 180),
       la lecture naturelle va du centre vers l'extérieur — la DERNIÈRE lettre
       est donc près de l'anneau. Sur la moitié gauche : la première lettre
       près de l'anneau. L'icône au-dessus du texte, centrée. */
    const rightSide = ang > 0 && ang < 180;
    let rotate = ang - 90;
    let anchorR, anchorX;
    if (rightSide) {
      if (ang > 90) rotate += 180;   // secteur bas-droit : retourner pour rester lisible
      /* lecture du centre vers l'extérieur : la première lettre près du logo */
      anchorR = endR + (textLen * charW) / 2;
      anchorX = -(textLen * charW) / 2;   // première lettre à x local négatif... 
    } else {
      if (ang > 180) rotate += 180;
      /* lecture de l'extérieur vers le centre : première lettre près de l'anneau */
      anchorR = startR - (textLen * charW) / 2;
      anchorX = (textLen * charW) / 2;
    }
    const [tx2, ty2] = polar(anchorR, ang);
    const halfText = (textLen * charW) / 2;
    out += `<g class="sector-label" data-sector="${sector}" transform="translate(${tx2} ${ty2}) rotate(${rotate})">
      <text x="0" y="${Math.round(effFont * 0.35)}" text-anchor="middle" class="sector-radial" font-size="${effFont}">${info.name}</text>
      <text x="0" y="${Math.round(-effFont * 0.55)}" text-anchor="middle" class="sector-icon" font-size="${Math.round(effFont * 1.3)}">${info.icon}</text>
    </g>`;
  }
  out += `<circle cx="350" cy="352" r="${HUB_R + 14}" fill="#f2e9cf" stroke="#c9b98a" stroke-width="2" opacity="0.8"/>`;

  for (const id in board.cells) {
    const c = board.cells[id];
    if (c.isCenter) {
      // Moyeu : anthracite + logo Edukisto (étoile bleue au sigle infini), à l'échelle du cercle
      const ms = (HUB_R - 8) / 32;   // le mark couvre 0..64, on le centre
      out += `<g id="cell-hub" class="cell hub-cell">
        <circle cx="${c.x}" cy="${c.y + 2}" r="${HUB_R}" fill="#00000022"/>
        <circle cx="${c.x}" cy="${c.y}" r="${HUB_R}" fill="#333333" stroke="#38bdf8" stroke-width="3" filter="url(#f-drop)"/>
        <g transform="translate(${c.x - 32 * ms} ${c.y - 32 * ms}) scale(${ms})">
          <path d="M32 3l5.2 18.2 10.8-5.2-5.2 10.8L61 32l-18.2 5.2 5.2 10.8-10.8-5.2L32 61l-5.2-18.2-10.8 5.2 5.2-10.8L3 32l18.2-5.2-5.2-10.8 10.8 5.2z" fill="#38bdf8"/>
          <path d="M32 32c-1.6-2-3-3.1-4.8-3.1a4.7 4.7 0 1 0 0 9.4c1.8 0 3.2-1.1 4.8-3.1 1.6 2 3 3.1 4.8 3.1a4.7 4.7 0 1 0 0-9.4c-1.8 0-3.2 1.1-4.8 3.1z" stroke="#7dd3fc" stroke-width="2.2" fill="none"/>
        </g>
        <circle cx="${c.x}" cy="${c.y}" r="${HUB_R - 2}" fill="none" stroke="#38bdf8" stroke-width="1" opacity="0.3"/>
      </g>`;
      continue;
    }
    const grad = "rg-" + (c.isWedge ? c.wedgeCat : c.cat);
    if (c.isWedge) {
      out += `<g id="cell-${c.id}" class="cell wedge-cell">
        <polygon points="${diamondPoints(c.x, c.y + 2.5, 26)}" fill="#00000026"/>
        <polygon points="${diamondPoints(c.x, c.y, 26)}" fill="url(#${grad})" stroke="#2b2b2b" stroke-width="2.5" filter="url(#f-drop)"/>
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
    const px = c.x + ((i % 3) - 1) * 19, py = c.y + (Math.floor(i / 3) - 0.5) * 20;
    const moving = animating && i === current;
    out += `<g id="pawn-${i}" filter="url(#f-drop)" class="pawn-group ${moving ? "pawn-moving" : ""}">
      <ellipse cx="${px}" cy="${py + 17}" rx="13" ry="5" fill="#00000033"/>
      <circle cx="${px}" cy="${py}" r="14" fill="${p.color}" stroke="#1d1d1d" stroke-width="2"/>
      <circle cx="${px - 4.5}" cy="${py - 5}" r="4" fill="#ffffffcc"/>
      <text x="${px}" y="${py + 5}" text-anchor="middle" class="pawn-label">${p.name[0]}</text>
      <text x="${px}" y="${py - 18}" text-anchor="middle" class="pawn-emoji">${PAWNS[p.pawn].emoji}</text>
    </g>`;
  });

  svg.innerHTML = out;
  fitSectorLabels(svg);
}


/* ---------- Déplacement : EXACTEMENT le nombre du dé ----------
   BFS par couches sur les états (case courante, case précédente) :
   - longueur exactement égale au dé (pas de trajet raccourci) ;
   - pas de demi-tour immédiat : on ne peut pas rebrousser chemin sur
     la case d'où l'on vient (le pion continue dans sa direction) ;
   - le moyeu n'est accessible qu'en dernier pas, avec les 6 diamants. */
function neighbors(cellId) { return board.adj[cellId] || []; }

function exactPaths(startId, steps, player) {
  const hasAllWedges = player && Object.keys(player.wedges).length === 6;
  // état : "case|précédente" -> chemin complet depuis le départ
  let frontier = new Map([[startId + "|", [startId]]]);
  for (let s = 0; s < steps; s++) {
    const next = new Map();
    for (const [state, path] of frontier) {
      const cell = state.split("|")[0];
      const prev = state.split("|")[1];
      for (const n of neighbors(cell)) {
        if (n === prev) continue;                    // pas de demi-tour immédiat
        // le moyeu se traverse librement en cours de route
        const key = n + "|" + cell;
        if (!next.has(key)) next.set(key, [...path, n]);
      }
    }
    frontier = next;
  }
  // destinations finales : on ne peut s'arrêter au moyeu qu'avec les 6 diamants
  const paths = {};
  for (const path of frontier.values()) {
    const dest = path[path.length - 1];
    if (board.cells[dest].isCenter && !hasAllWedges) continue;
    if (!paths[dest]) paths[dest] = path;
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

/* ---------- Catégories actives ----------
   Sans recharge : les 6 catégories du jeu de base.
   Avec recharge : les 6 catégories du thème prennent place sur les
   couleurs du plateau (la couleur du slot garde sa position, seul le
   nom de la catégorie change). Toutes les questions viennent du pack. */
function activeCatKeys() {
  if (activeTheme) return Object.keys(window.THEME_PACKS[activeTheme].categories);
  return CAT_KEYS;
}
function catInfo(slotKey) {
  const idx = CAT_KEYS.indexOf(slotKey);
  if (activeTheme) {
    const pack = window.THEME_PACKS[activeTheme];
    const k = activeCatKeys()[idx];
    return { key: k, name: pack.categories[k], color: CATEGORIES[slotKey].color, icon: pack.icon };
  }
  return { key: slotKey, name: CATEGORIES[slotKey].name, color: CATEGORIES[slotKey].color, icon: CATEGORIES[slotKey].icon };
}

/* ---------- Questions (tirage sans remise par pool) ----------
   Une question d'un pool donné ne revient qu'après que TOUTES les
   questions de ce pool ont été posées : on vide le sac, puis on le
   remélange. Pool = (pack d'âge, catégorie).                    */
function drawFromBag(bagKey, pool) {
  if (!drawBags[bagKey] || drawBags[bagKey].length === 0) {
    drawBags[bagKey] = pool.map((_, i) => i);
    for (let i = drawBags[bagKey].length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [drawBags[bagKey][i], drawBags[bagKey][j]] = [drawBags[bagKey][j], drawBags[bagKey][i]];
    }
  }
  return pool[drawBags[bagKey].pop()];
}

function pickQuestion(player, slotKey) {
  const info = catInfo(slotKey);
  if (activeTheme) {
    const pack = window.THEME_PACKS[activeTheme];
    const group = pack.groups[themeGroupFor(player.age)];
    let pool = group.questions.filter(q => q[0] === info.key);
    if (pool.length === 0) pool = group.questions.slice();
    return drawFromBag("T::" + activeTheme + "::" + themeGroupFor(player.age) + "::" + info.key, pool);
  }
  const pack = window.QUESTION_PACKS[player.group];
  let pool = pack.questions.filter(q => q[0] === info.key);
  if (pool.length === 0) pool = pack.questions.slice();
  return drawFromBag(player.group + "::" + info.key, pool);
}



/* ---------- Tour de jeu ---------- */
function startGame() {
  drawBags = {};
  gameOver = false;
  current = 0;
  players.forEach(p => { p.pos = "hub"; p.wedges = {}; });
  buildBoard();
  hide($("#setup-screen"));
  hide($("#win-screen"));
  show($("#game-screen"));
  show($("#btn-newgame-header"));
  updateTurnUI();
  saveGame();
}

function updateTurnUI() {
  const p = players[current];
  $("#turn-title").textContent = `${PAWNS[p.pawn].emoji} Au tour de ${p.name}`;
  const wd = $("#wedges-display");
  wd.innerHTML = `<div class="diamant">${CAT_KEYS.map(k =>
    `<span class="wedge ${p.wedges[k] ? 'got' : ''}" style="background:${p.wedges[k] ? CATEGORIES[k].color : '#dee2e6'}" title="${catInfo(k).name}"></span>`).join("")}</div>
    <p class="hint">${Object.keys(p.wedges).length}/6 diamants</p>`;
  const ps = $("#players-summary");
  ps.innerHTML = players.map((pl, i) =>
    `<div class="player-row ${i === current ? 'active' : ''}">
       <span class="pawn-mini-inline">${PAWNS[pl.pawn].emoji}</span>
       <span>${pl.name}</span>
       <span class="group-tag">${window.QUESTION_PACKS[pl.group].label}</span>
       <span>${Object.keys(pl.wedges).length}/6</span>
     </div>`).join("");
  renderStats();
}

/* Statistiques par joueur : global + détail par catégorie */
function renderStats() {
  const el = $("#stats-display");
  if (!el || !GAME_CONFIG.statsEnabled) return;
  let html = "";
  players.forEach(p => {
    const st = p.stats || { correct: 0, wrong: 0, timeout: 0, byCat: {} };
    const total = st.correct + st.wrong + st.timeout;
    const pct = total ? Math.round(st.correct / total * 100) : 0;
    html += `<div class="stats-player">
      <div class="stats-head"><span class="pawn-mini-inline">${PAWNS[p.pawn].emoji}</span> <b>${p.name}</b>
        <span class="stats-pct">${pct}%</span></div>
      <div class="stats-line">✅ ${st.correct} · ❌ ${st.wrong} · ⏰ ${st.timeout} <span class="muted">(${total} q.)</span></div>
      <div class="stats-cats">`;
    CAT_KEYS.forEach(k => {
      const c = st.byCat[k];
      if (!c) return;
      const info = catInfo(k);
      const t = c.correct + c.wrong + c.timeout;
      const cp = t ? Math.round(c.correct / t * 100) : 0;
      html += `<span class="stats-cat"><span class="dot" style="background:${info.color}"></span>${info.icon} ${info.name} : ${cp}% (${c.correct}/${t})</span>`;
    });
    html += `</div></div>`;
  });
  el.innerHTML = html || "<p class='hint'>Les statistiques apparaîtront après les premières questions.</p>";
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
    if (step < path.length - 1) { step++; setTimeout(walk, GAME_CONFIG.pawnStepMs); }
    else { animating = false; saveGame(); setTimeout(() => arrive(cellId), 250); }
  };
  walk();
}

function arrive(cellId) {
  const p = players[current];
  const cell = board.cells[cellId];
  askQuestion(cell, p);
}

function askQuestion(cell, player) {
  $("#answer-feedback").textContent = "";
  let catName, question, options, correct;

  const slot = cell.isCenter ? CAT_KEYS[Math.floor(Math.random() * CAT_KEYS.length)] : cell.cat;
  const info = catInfo(slot);
  const q = pickQuestion(player, slot);
  catName = info.icon + " " + info.name + (cell.isCenter ? " — 🏆 question finale" : cell.isWedge ? " — 🧀 diamant en jeu !" : "");
  question = q[1]; options = q.slice(2, 6); correct = q[6];

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

  /* Bandeau de question + timer */
  showQuestionBanner(catName, cell.cat ? CATEGORIES[cell.cat].color : "#38bdf8");
  startTimer(cell, player, correct, options);
  saveGame();
}

/* Bandeau question : slide depuis le bas */
function showQuestionBanner(catName, color) {
  const banner = $("#question-banner");
  $("#banner-cat").textContent = catName;
  $("#banner-cat").style.color = color;
  banner.classList.add("open");
}
function hideQuestionBanner() {
  const banner = $("#question-banner");
  if (banner) banner.classList.remove("open");
}

/* ---------- Timer de réponse ---------- */
function stopTimer() {
  if (questionTimer) { clearInterval(questionTimer); questionTimer = null; }
  const wrap = $("#question-timerwrap");
  if (wrap) hide(wrap);
}
function answerTimeFor(player) {
  if (activeTheme && GAME_CONFIG.answerTimeByTheme) {
    const t = GAME_CONFIG.answerTimeByTheme[themeGroupFor(player.age)];
    if (t) return t;
  }
  return GAME_CONFIG.answerTimeByAge ? (GAME_CONFIG.answerTimeByAge[player.group] || null) : null;
}
function startTimer(cell, player, correct, options) {
  const total = answerTimeFor(player);
  if (!total) return;
  timeLeft = total;
  const wrap = $("#question-timerwrap");
  const bar = $("#question-timerbar");
  show(wrap);
  bar.style.transition = "none";
  bar.style.width = "100%";
  requestAnimationFrame(() => {
    bar.style.transition = "width " + total + "s linear";
    bar.style.width = "0%";
  });
  $("#question-timertext").textContent = total + " s";
  questionTimer = setInterval(() => {
    timeLeft--;
    if (timeLeft > 0) {
      $("#question-timertext").textContent = timeLeft + " s";
    } else {
      stopTimer();
      player.stats.timeout++;
      recordCatStat(player, cell, "timeout");
      document.querySelectorAll(".answer").forEach(b => b.disabled = true);
      const correctBtn = [...document.querySelectorAll(".answer")].find(b => b.textContent === options[correct]);
      if (correctBtn) correctBtn.classList.add("correct");
      $("#answer-feedback").textContent = "\u23f0 Temps écoulé ! C'était : " + options[correct] + ".";
      saveGame();
      setTimeout(nextTurn, 2200);
    }
  }, 1000);
}
/* Statistiques par catégorie */
function recordCatStat(player, cell, kind) {
  const cat = cell.isWedge ? cell.wedgeCat : cell.cat;
  if (!cat) return;
  if (!player.stats.byCat[cat]) player.stats.byCat[cat] = { correct: 0, wrong: 0, timeout: 0 };
  player.stats.byCat[cat][kind]++;
}

function answer(btn, isCorrect, cell, player, correct, options) {
  stopTimer();
  document.querySelectorAll(".answer").forEach(b => b.disabled = true);
  const fb = $("#answer-feedback");
  if (isCorrect) {
    player.stats.correct++;
    recordCatStat(player, cell, "correct");
    btn.classList.add("correct");
    fb.textContent = "✅ Bonne réponse !";
    if (cell.isWedge && !player.wedges[cell.wedgeCat]) {
      player.wedges[cell.wedgeCat] = true;
      fb.textContent += ` ${player.name} gagne le diamant ${catInfo(cell.wedgeCat).name} !`;
      animateWedge(cell, cell.wedgeCat);
    }
    if (cell.isCenter) {
      if (Object.keys(player.wedges).length === 6) return win(player);
      fb.textContent += " Il vous faut encore tous les diamants pour gagner au centre !";
    }
    updateTurnUI();
    saveGame();
    hideQuestionBanner();
    showCorrectSplash();
    setTimeout(() => { awaitingRoll = true; $("#btn-roll").disabled = false; $("#dice-result").textContent = ""; }, 1600);
  } else {
    player.stats.wrong++;
    recordCatStat(player, cell, "wrong");
    btn.classList.add("wrong");
    const correctBtn = [...document.querySelectorAll(".answer")].find(b => b.textContent === options[correct]);
    if (correctBtn) correctBtn.classList.add("correct");
    fb.textContent = `❌ Mauvaise réponse. C'était : ${options[correct]}.`;
    saveGame();
    setTimeout(() => { nextTurn(); }, 2000);
  }
}

/* Le diamant gagné quitte le plateau et se loge dans l'emplacement du joueur */
function animateWedge(cell, catKey) {
  const color = CATEGORIES[catKey].color;
  const svg = $("#board");
  const rect = svg.getBoundingClientRect();
  const scale = rect.width / 700;
  const from = { x: cell.x * scale + rect.left, y: cell.y * scale + rect.top };
  const slot = document.querySelector(`#wedges-display .wedge[title="${CATEGORIES[catKey].name}"]`);
  const chip = document.createElement("div");
  chip.className = "flying-wedge";
  chip.style.background = color;
  document.body.appendChild(chip);
  const to = slot ? slot.getBoundingClientRect() : { left: window.innerWidth - 100, top: 40, width: 26, height: 26 };
  chip.style.left = from.x - 13 + "px";
  chip.style.top = from.y - 13 + "px";
  const dx = (to.left + to.width / 2) - from.x;
  const dy = (to.top + to.height / 2) - from.y;
  chip.animate([
    { transform: "translate(0,0) scale(1)", opacity: 0.95 },
    { transform: `translate(${dx * 0.5}px, ${dy * 0.5 - 60}px) scale(1.5)`, opacity: 1, offset: 0.5 },
    { transform: `translate(${dx}px, ${dy}px) scale(0.55)`, opacity: 0.9 }
  ], { duration: 1100, easing: "cubic-bezier(.3,.7,.4,1)" }).onfinish = () => { chip.remove(); updateTurnUI(); };
}

/* Splash de bonne réponse : flash plein écran bref */
function showCorrectSplash() {
  const splash = $("#correct-splash");
  splash.classList.add("show");
  setTimeout(() => splash.classList.remove("show"), 900);
}

function nextTurn() {
  stopTimer();
  hideQuestionBanner();
  $("#dice-result").textContent = "";
  current = (current + 1) % players.length;
  awaitingRoll = true;
  $("#btn-roll").disabled = false;
  updateTurnUI();
}

function win(player) {
  gameOver = true;
  clearSave();
  stopTimer();
  hideQuestionBanner();
  hide($("#game-screen"));
  show($("#win-screen"));
  $("#winner-name").textContent = `🏆 ${player.name} remporte la partie !`;
  $("#winner-sub").textContent = `6 diamants collectés et question finale réussie. Bravo !`;
  // Statistiques complètes de tous les joueurs sur l'écran de victoire
  let statsHtml = "";
  players.forEach(p => {
    const st = p.stats || { correct: 0, wrong: 0, timeout: 0, byCat: {} };
    const total = st.correct + st.wrong + st.timeout;
    const pct = total ? Math.round(st.correct / total * 100) : 0;
    statsHtml += `<div class="stats-player">
      <div class="stats-head"><span class="pawn-mini-inline">${PAWNS[p.pawn].emoji}</span> <b>${p.name}</b>${p === player ? ' <span class="win-badge">🏆</span>' : ''}
        <span class="stats-pct">${pct}%</span></div>
      <div class="stats-line">✅ ${st.correct} · ❌ ${st.wrong} · ⏰ ${st.timeout} <span class="muted">(${total} questions)</span></div>
      <div class="stats-cats">`;
    CAT_KEYS.forEach(k => {
      const c = st.byCat[k];
      if (!c) return;
      const info = catInfo(k);
      const t = c.correct + c.wrong + c.timeout;
      const cp = t ? Math.round(c.correct / t * 100) : 0;
      statsHtml += `<span class="stats-cat"><span class="dot" style="background:${info.color}"></span>${info.icon} ${info.name} : ${cp}% (${c.correct}/${t})</span>`;
    });
    statsHtml += `</div></div>`;
  });
  $("#win-stats").innerHTML = statsHtml;
}

/* Nouvelle partie : efface la sauvegarde et revient à la configuration */
function newGame() {
  stopTimer();
  hideQuestionBanner();
  clearSave();
  gameOver = false;
  current = 0;
  players = [];
  pendingPawn = null;
  activeTheme = activeTheme; // la recharge choisie est conservée dans le formulaire
  $("#dice-result").textContent = "";
  $("#btn-roll").disabled = false;
  awaitingRoll = true;
  show($("#setup-screen"));
  hide($("#game-screen"));
  hide($("#win-screen"));
  hide($("#btn-newgame-header"));
  renderSetup();
}
$("#btn-newgame-header").onclick = newGame;

$("#btn-restart").onclick = () => {
  show($("#setup-screen"));
  hide($("#game-screen"));
  hide($("#win-screen"));
};

/* Init : restituer la partie en cours au chargement */
renderSetup();
tryResume();
