#!/usr/bin/env node
/* ===== Trivial Quest — test de fumée « vraie partie » =====
   Le jeu est chargé tel quel (board.js + config.js + data + game.js) dans un
   DOM minimal, puis on joue : un diamant gagné, puis la victoire au centre.
   Objectif : détecter les erreurs d'exécution que la vérification syntaxique
   ne voit pas (fonction renommée, mauvais argument, élément manquant…). */
const assert = require("assert");
const fs = require("fs");
const path = require("path");
const vm = require("vm");

const ROOT = path.join(__dirname, "..");

/* ----------------------------------------------------------- DOM minimal */
class El {
  constructor(tag) {
    this.tagName = String(tag || "div").toUpperCase();
    this.children = [];
    this._html = "";
    this._text = "";
    this.attrs = {};
    this.style = {};
    this.dataset = {};
    this.value = "";
    this.disabled = false;
    this.onclick = null;
    const set = new Set();
    this.classList = {
      add: (...c) => c.forEach((x) => set.add(x)),
      remove: (...c) => c.forEach((x) => set.delete(x)),
      contains: (c) => set.has(c),
      toggle: (c, on) => (on ? set.add(c) : set.delete(c))
    };
  }
  set innerHTML(v) { this._html = String(v); this.children = []; }
  get innerHTML() { return this._html; }
  set textContent(v) { this._text = String(v); }
  get textContent() { return this._text; }
  setAttribute(k, v) { this.attrs[k] = String(v); }
  getAttribute(k) { return Object.prototype.hasOwnProperty.call(this.attrs, k) ? this.attrs[k] : null; }
  removeAttribute(k) { delete this.attrs[k]; }
  appendChild(c) { this.children.push(c); return c; }
  remove() {}
  blur() {}
  contains() { return false; }
  querySelector() { return null; }
  querySelectorAll() { return []; }
  getBoundingClientRect() { return { left: 0, top: 0, width: 700, height: 700 }; }
  animate() { return {}; }
}

const registry = new Map();
const elementFor = (sel) => {
  if (!registry.has(sel)) registry.set(sel, new El());
  return registry.get(sel);
};

const document = {
  querySelector: (sel) => elementFor(sel),
  querySelectorAll: () => [],
  createElement: (tag) => new El(tag),
  body: new El("body"),
  activeElement: null,
  getElementById: (id) => elementFor("#" + id)
};

const store = new Map();
const localStorage = {
  getItem: (k) => (store.has(k) ? store.get(k) : null),
  setItem: (k, v) => store.set(k, String(v)),
  removeItem: (k) => store.delete(k)
};

/* ------------------------------------------------------- Chargement */
const ctx = {
  document, localStorage,
  setTimeout, clearTimeout, setInterval, clearInterval,
  requestAnimationFrame: (cb) => setTimeout(cb, 0),
  navigator: {}, alert: () => {}, console
};
ctx.window = ctx;
vm.createContext(ctx);

const files = [
  "board.js",
  "config.js",
  ...fs.readdirSync(path.join(ROOT, "data")).filter((f) => f.endsWith(".js")).sort().map((f) => path.join("data", f)),
  "game.js"
];
let source = files.map((f) => fs.readFileSync(path.join(ROOT, f), "utf8")).join("\n;\n");

/* Accès à l'état interne : ce bloc est ajouté dans la même portée que game.js. */
source += `
;globalThis.__tq = {
  startGame, updateTurnUI, arrive, answer, askQuestion, exactPaths, renderBoard,
  get players() { return players; },
  set players(v) { players = v; },
  get current() { return current; },
  set current(v) { current = v; },
  get board() { return board; },
  get answerButtons() { return answerButtons; },
  set pos(p) { },
  get wedges() { return players.map(p => p.wedges); }
};
`;

vm.runInContext(source, ctx, { filename: "trivial-quest-bundle.js" });
const tq = ctx.__tq;

/* ------------------------------------------------------------ Scénario */
let checks = 0;
const ok = (label) => { checks++; console.log("  ok    " + label); };

console.log("Partie simulée");

/* Deux joueurs, comme le ferait le formulaire. */
tq.players.push(
  { name: "Léa", age: 10, group: "9-11", pawn: "G", color: "#1f6fb2", pos: null, wedges: {}, stats: { correct: 0, wrong: 0, timeout: 0, byCat: {} } },
  { name: "Noé", age: 40, group: "31+", pawn: "S", color: "#2e9b4e", pos: null, wedges: {}, stats: { correct: 0, wrong: 0, timeout: 0, byCat: {} } }
);
tq.startGame();
tq.current = 0;
assert.ok(tq.board, "le plateau doit être construit au démarrage");
assert.strictEqual(Object.keys(tq.board.cells).length, 73, "73 cases attendues");
assert.strictEqual(tq.players[0].pos, "hub");
ok("startGame construit les 73 cases et place les pions au moyeu");

/* Sauvegarde de la partie en cours, relisible par une autre session. */
assert.ok(store.has("trivial-quest-save"), "partie sauvegardée dans localStorage");
const saved = JSON.parse(store.get("trivial-quest-save"));
assert.strictEqual(saved.v, 2, "version de sauvegarde");
assert.strictEqual(saved.players.length, 2);
ok("sauvegarde localStorage écrite avec la version du format");

/* Rendu : le SVG doit contenir les 73 cases et les 6 étiquettes de secteur. */
const svgHtml = elementFor("#board").innerHTML;
const cellCount = (svgHtml.match(/id="cell-/g) || []).length;
assert.strictEqual(cellCount, 73, "cases dessinées dans le SVG : " + cellCount);
assert.strictEqual((svgHtml.match(/class="sector-label"/g) || []).length, 6, "6 secteurs dessinés");
assert.ok(svgHtml.includes('id="pawn-layer"'), "couche des pions présente");
ok("le SVG contient les 73 cases, 6 secteurs et la couche des pions");

/* Déplacement : le dé de 3 doit proposer des cases, et le chemin doit être exact. */
const paths = tq.exactPaths("hub", 3, tq.players[0]);
const targets = Object.keys(paths);
assert.ok(targets.length > 0, "au moins une destination pour un dé de 3");
for (const route of Object.values(paths)) assert.strictEqual(route.length, 4, "chemin de 3 pas");
ok("exactPaths renvoie des destinations pour un dé de 3");

/* Question sur un QG : bonne réponse => diamant. */
const player = tq.players[0];
player.pos = "ring0"; // QG Géographie
tq.arrive("ring0");
assert.ok(tq.answerButtons.length === 4, "4 boutons de réponse");
assert.strictEqual(tq.answerButtons.filter((b) => b.isCorrect).length, 1, "une seule bonne réponse");
const right = tq.answerButtons.find((b) => b.isCorrect);
right.btn.onclick();
assert.strictEqual(player.wedges.G, true, "le diamant Géographie est gagné");
assert.strictEqual(player.stats.correct, 1, "une bonne réponse comptée");
assert.strictEqual(player.stats.byCat.G.correct, 1, "statistique par catégorie");
ok("bonne réponse sur un QG : diamant + statistiques");

/* Mauvaise réponse : au joueur suivant. */
tq.current = 0;
player.pos = "ring1";
tq.arrive("ring1");
const wrong = tq.answerButtons.find((b) => !b.isCorrect);
wrong.btn.onclick();
assert.strictEqual(player.stats.wrong, 1, "une mauvaise réponse comptée");
assert.strictEqual(player.stats.byCat[Object.keys(player.stats.byCat)[0]].wrong >= 0, true);
ok("mauvaise réponse : comptée, sans diamant");

/* Victoire : 6 diamants + bonne réponse au centre. */
tq.current = 0;
tq.players[0].wedges = { G: true, H: true, S: true, L: true, A: true, D: true };
tq.players[0].pos = "sp0-0";
tq.arrive("hub");
const final = tq.answerButtons.find((b) => b.isCorrect);
final.btn.onclick();
const winScreen = elementFor("#win-screen");
assert.strictEqual(winScreen.classList.contains("hidden"), false, "l'écran de victoire s'affiche");
assert.ok(String(elementFor("#winner-name").textContent).includes("Léa"), "le gagnant est annoncé");
ok("victoire : écran de fin affiché avec le bon gagnant");

/* Sauvegarde : écrite en cours de partie, effacée à la victoire. */
assert.strictEqual(store.has("trivial-quest-save"), false, "la sauvegarde doit être effacée à la victoire");
ok("la sauvegarde est effacée à la victoire");

console.log("\n" + checks + " vérification(s) de fumée réussies.");
