#!/usr/bin/env node
/* ===== Trivial Quest — tests de non-régression =====
   Aucune dépendance : `node test/run-tests.js` (ou `npm test`).
   Couvre le plateau (topologie + règle de déplacement), la configuration,
   les packs de questions et la cohérence des fichiers de la PWA. */
const assert = require("assert");
const fs = require("fs");
const path = require("path");
const vm = require("vm");

const ROOT = path.join(__dirname, "..");
const Board = require(path.join(ROOT, "board.js"));

let passed = 0;
const failures = [];

function test(name, fn) {
  try {
    fn();
    passed++;
    console.log("  ok    " + name);
  } catch (err) {
    failures.push({ name, err });
    console.log("  FAIL  " + name);
    console.log("        " + String(err.message).split("\n").join("\n        "));
  }
}
function group(title) {
  console.log("\n" + title);
}

/* ---------------------------------------------------------------- Plateau */
group("Plateau");
const graph = Board.buildBoardGraph();
const ids = Object.keys(graph.cells);
const colorOf = (id) => graph.cells[id].cat;

test("73 cases : 1 moyeu + 36 anneau + 36 rayons", () => {
  const center = ids.filter((id) => graph.cells[id].isCenter);
  const ring = ids.filter((id) => graph.cells[id].ring !== undefined);
  const spokes = ids.filter((id) => graph.cells[id].spoke !== undefined);
  assert.strictEqual(center.length, 1);
  assert.strictEqual(ring.length, 36);
  assert.strictEqual(spokes.length, 36);
  assert.strictEqual(ids.length, 73);
});

test("6 QG (diamants), une couleur par QG", () => {
  const qg = ids.filter((id) => graph.cells[id].isWedge);
  assert.strictEqual(qg.length, 6);
  assert.deepStrictEqual(
    qg.map((id) => graph.cells[id].wedgeCat).sort(),
    ["A", "D", "G", "H", "L", "S"]
  );
});

test("jamais deux cases adjacentes de la même couleur", () => {
  const clashes = [];
  for (const id of ids) {
    for (const n of graph.adj[id]) {
      if (id > n) continue; // chaque arête une seule fois
      const a = colorOf(id);
      const b = colorOf(n);
      if (a && b && a === b) clashes.push(id + " ~ " + n + " (" + a + ")");
    }
  }
  assert.deepStrictEqual(clashes, [], "arêtes fautives : " + clashes.join(", "));
});

test("un rayon = 6 cases de 6 couleurs différentes", () => {
  for (let s = 0; s < Board.SPOKE_COUNT; s++) {
    const cats = [];
    for (let k = 0; k < Board.SPOKE_CELLS; k++) cats.push(graph.cells["sp" + s + "-" + k].cat);
    assert.strictEqual(new Set(cats).size, 6, "rayon " + s + " : " + cats.join(""));
    assert.strictEqual(cats.length, 6);
  }
});

test("à distance égale du centre, chaque rayon a une couleur différente", () => {
  for (let k = 0; k < Board.SPOKE_CELLS; k++) {
    const cats = [];
    for (let s = 0; s < Board.SPOKE_COUNT; s++) cats.push(graph.cells["sp" + s + "-" + k].cat);
    assert.strictEqual(new Set(cats).size, 6, "distance k=" + k + " : " + cats.join(""));
  }
});

test("chaque QG est adjacent à la case extérieure d'un rayon d'une autre couleur", () => {
  for (let s = 0; s < Board.SPOKE_COUNT; s++) {
    const qg = graph.cells["ring" + s * 6];
    const outer = graph.cells["sp" + s + "-5"];
    assert.ok(graph.adj[qg.id].includes(outer.id), "QG " + qg.id + " non relié à " + outer.id);
    assert.notStrictEqual(qg.cat, outer.cat, "QG " + qg.id + " de la même couleur que " + outer.id);
  }
});

test("le plateau est connexe (toutes les cases atteignables depuis le moyeu)", () => {
  const seen = new Set(["hub"]);
  const queue = ["hub"];
  while (queue.length) {
    const cur = queue.shift();
    for (const n of graph.adj[cur]) {
      if (!seen.has(n)) {
        seen.add(n);
        queue.push(n);
      }
    }
  }
  assert.strictEqual(seen.size, ids.length, "cases inatteignables : " + ids.filter((i) => !seen.has(i)).join(", "));
});

test("chaque case a au moins une destination pour chaque dé (1 à 6)", () => {
  for (const id of ids) {
    for (let d = 1; d <= 6; d++) {
      const dest = Board.reachableDestinations(graph, id, d, { hasAllWedges: true });
      assert.ok(Object.keys(dest).length > 0, "aucune destination depuis " + id + " avec un dé de " + d);
    }
  }
});

test("les chemins retournés sont valides (longueur, arêtes, pas de demi-tour)", () => {
  for (const id of ids) {
    for (let d = 1; d <= 6; d++) {
      const dest = Board.reachableDestinations(graph, id, d, { hasAllWedges: true });
      for (const [target, route] of Object.entries(dest)) {
        assert.strictEqual(route.length, d + 1, "longueur du chemin vers " + target);
        assert.strictEqual(route[0], id);
        assert.strictEqual(route[route.length - 1], target);
        for (let i = 1; i < route.length; i++) {
          assert.ok(graph.adj[route[i - 1]].includes(route[i]), "arête absente " + route[i - 1] + " -> " + route[i]);
          if (i >= 2) assert.notStrictEqual(route[i], route[i - 2], "demi-tour immédiat sur " + route[i]);
        }
      }
    }
  }
});

test("le moyeu n'est une destination qu'avec les 6 diamants", () => {
  for (const id of ids) {
    for (let d = 1; d <= 6; d++) {
      const partial = Board.reachableDestinations(graph, id, d, { hasAllWedges: false });
      assert.ok(!Object.prototype.hasOwnProperty.call(partial, "hub"),
        id + " + dé " + d + " peut s'arrêter au moyeu sans les 6 diamants");
    }
  }
});

test("avec les 6 diamants, le moyeu est atteignable depuis chaque rayon", () => {
  for (let s = 0; s < Board.SPOKE_COUNT; s++) {
    const base = "sp" + s + "-0";
    let reachable = false;
    for (let d = 1; d <= 6 && !reachable; d++) {
      const dest = Board.reachableDestinations(graph, base, d, { hasAllWedges: true });
      reachable = Object.prototype.hasOwnProperty.call(dest, "hub");
    }
    assert.ok(reachable, "moyeu inatteignable depuis " + base);
  }
});

test("sans transit autorisé, le moyeu ne sert jamais de case de passage", () => {
  const dest = Board.reachableDestinations(graph, "ring5", 4, { hasAllWedges: false, allowHubTransit: false });
  for (const route of Object.values(dest)) {
    assert.ok(!route.includes("hub"), "chemin passant par le moyeu : " + route.join(" > "));
  }
});

test("couleurs de l'anneau : 36 entrées déclarées", () => {
  assert.strictEqual(Board.RING_CATS.length, 36);
});

/* ----------------------------------------------------------- Config */
group("Configuration");
const configCtx = {};
vm.createContext(configCtx);
vm.runInContext(fs.readFileSync(path.join(ROOT, "config.js"), "utf8") + "\nthis.GAME_CONFIG = GAME_CONFIG;", configCtx);
const GAME_CONFIG = configCtx.GAME_CONFIG;
const gameSrc = fs.readFileSync(path.join(ROOT, "game.js"), "utf8");

test("GAME_CONFIG est accessible", () => {
  assert.ok(GAME_CONFIG && typeof GAME_CONFIG === "object");
});

test("chaque paramètre de config.js est réellement lu par game.js", () => {
  const unused = Object.keys(GAME_CONFIG).filter((key) => !gameSrc.includes("GAME_CONFIG." + key));
  assert.deepStrictEqual(unused, [], "paramètres jamais utilisés : " + unused.join(", "));
});

test("les timers couvrent exactement les 6 tranches d'âge", () => {
  const keys = Object.keys(GAME_CONFIG.answerTimeByAge).sort();
  assert.deepStrictEqual(keys, ["12-15", "16-30", "31+", "4-5", "6-8", "9-11"]);
});

test("minAge / maxAge / maxPlayers sont cohérents", () => {
  assert.ok(GAME_CONFIG.minAge >= 0);
  assert.ok(GAME_CONFIG.maxAge > GAME_CONFIG.minAge);
  assert.ok(GAME_CONFIG.maxPlayers >= 1);
});

/* ------------------------------------------------------- Données */
group("Données de questions");
const dataDir = path.join(ROOT, "data");
const dataFiles = fs.readdirSync(dataDir).filter((f) => f.endsWith(".js"));
const agePacks = {};
const themePacks = {};

for (const file of dataFiles) {
  const ctx = { window: {} };
  vm.createContext(ctx);
  vm.runInContext(fs.readFileSync(path.join(dataDir, file), "utf8"), ctx, { filename: file });
  Object.assign(agePacks, ctx.window.QUESTION_PACKS || {});
  Object.assign(themePacks, ctx.window.THEME_PACKS || {});
}

test("les 6 tranches d'âge ont un pack", () => {
  assert.deepStrictEqual(
    Object.keys(agePacks).sort(),
    ["12-15", "16-30", "31+", "4-5", "6-8", "9-11"]
  );
});

test("chaque pack à thème a ses 3 groupes et ses 6 catégories", () => {
  for (const [key, pack] of Object.entries(themePacks)) {
    assert.deepStrictEqual(Object.keys(pack.groups).sort(), ["13-21", "22+", "4-12"], "groupes de " + key);
    assert.strictEqual(Object.keys(pack.categories).length, 6, "catégories de " + key);
    assert.ok(pack.label && pack.icon, "libellé/icône manquant pour " + key);
  }
});

test("chaque question est bien formée (7 champs, 4 options, index valide)", () => {
  const problems = [];
  const check = (q, where) => {
    if (!Array.isArray(q) || q.length !== 7) return problems.push(where + " : " + q.length + " champs", );
    if (!q[0] || typeof q[1] !== "string" || !q[1].trim()) problems.push(where + " : énoncé vide");
    for (let i = 2; i <= 5; i++) {
      if (typeof q[i] !== "string" || !q[i].trim()) problems.push(where + " : option " + (i - 1) + " vide");
    }
    if (!Number.isInteger(q[6]) || q[6] < 0 || q[6] > 3) problems.push(where + " : index de réponse " + q[6]);
  };
  for (const [key, pack] of Object.entries(agePacks)) {
    pack.questions.forEach((q, i) => check(q, "age:" + key + "#" + i));
  }
  for (const [key, pack] of Object.entries(themePacks)) {
    for (const [grp, g] of Object.entries(pack.groups)) {
      g.questions.forEach((q, i) => check(q, "theme:" + key + "/" + grp + "#" + i));
    }
  }
  assert.deepStrictEqual(problems.slice(0, 10), [], problems.length + " question(s) mal formée(s)");
});

test("les catégories des questions existent dans leur pack", () => {
  const problems = [];
  const baseCats = ["G", "H", "S", "L", "A", "D"];
  for (const [key, pack] of Object.entries(agePacks)) {
    for (const q of pack.questions) if (!baseCats.includes(q[0])) problems.push("age:" + key + " → " + q[0]);
  }
  for (const [key, pack] of Object.entries(themePacks)) {
    const cats = Object.keys(pack.categories);
    for (const g of Object.values(pack.groups)) {
      for (const q of g.questions) if (!cats.includes(q[0])) problems.push("theme:" + key + " → " + q[0]);
    }
  }
  assert.deepStrictEqual(problems.slice(0, 10), [], problems.length + " catégorie(s) inconnue(s)");
});

test("aucune question en double à l'intérieur d'un même tirage", () => {
  const problems = [];
  const scopes = new Map();
  const push = (scope, q) => {
    if (!scopes.has(scope)) scopes.set(scope, new Map());
    const seen = scopes.get(scope);
    const text = String(q[1]).trim().toLowerCase();
    if (seen.has(text)) problems.push(scope + " : « " + q[1] + " » (×2)");
    else seen.set(text, true);
  };
  for (const [key, pack] of Object.entries(agePacks)) pack.questions.forEach((q) => push("age:" + key, q));
  for (const [key, pack] of Object.entries(themePacks)) {
    for (const [grp, g] of Object.entries(pack.groups)) g.questions.forEach((q) => push("theme:" + key + "/" + grp, q));
  }
  assert.deepStrictEqual(problems.slice(0, 10), [], problems.length + " doublon(s)");
});

test("chaque catégorie déclarée a au moins une question", () => {
  const problems = [];
  const count = (label, questions, cats) => {
    const per = {};
    for (const c of cats) per[c] = 0;
    for (const q of questions) per[q[0]] = (per[q[0]] || 0) + 1;
    for (const c of cats) if (!per[c]) problems.push(label + " → " + c + " : 0 question");
  };
  for (const [key, pack] of Object.entries(agePacks)) count("age:" + key, pack.questions, ["G", "H", "S", "L", "A", "D"]);
  for (const [key, pack] of Object.entries(themePacks)) {
    for (const [grp, g] of Object.entries(pack.groups)) count("theme:" + key + "/" + grp, g.questions, Object.keys(pack.categories));
  }
  assert.deepStrictEqual(problems.slice(0, 10), [], problems.length + " catégorie(s) vide(s)");
});

/* --------------------------------------------------- Fichiers / PWA */
group("Fichiers de l'application");
const indexHtml = fs.readFileSync(path.join(ROOT, "index.html"), "utf8");
const swSrc = fs.readFileSync(path.join(ROOT, "sw.js"), "utf8");

test("un seul splash studio dans index.html", () => {
  const count = (indexHtml.match(/id="studio-splash"/g) || []).length;
  assert.strictEqual(count, 1, count + " occurrences de #studio-splash");
});

test("tous les scripts référencés par index.html existent", () => {
  const srcs = [...indexHtml.matchAll(/<script src="([^"]+)"/g)].map((m) => m[1]);
  const missing = srcs.filter((src) => !fs.existsSync(path.join(ROOT, src)));
  assert.deepStrictEqual(missing, [], "fichiers manquants : " + missing.join(", "));
});

test("board.js est chargé avant game.js", () => {
  assert.ok(indexHtml.indexOf('src="board.js"') < indexHtml.indexOf('src="game.js"'));
});

test("tous les identifiants du DOM utilisés par game.js existent dans index.html", () => {
  const used = new Set([...gameSrc.matchAll(/\$\("#([A-Za-z0-9_-]+)"\)/g)].map((m) => m[1]));
  const createdDynamically = new Set(["pawn-layer"]); // ajouté dans le SVG par renderBoard()
  const htmlIds = new Set([...indexHtml.matchAll(/id="([^"]+)"/g)].map((m) => m[1]));
  const missing = [...used].filter((id) => !createdDynamically.has(id) && !htmlIds.has(id));
  assert.deepStrictEqual(missing, [], "ids absents de index.html : " + missing.join(", "));
});

test("tous les fichiers du cache du service worker existent", () => {
  const block = swSrc.slice(swSrc.indexOf("const ASSETS"), swSrc.indexOf("];"));
  const assets = [...block.matchAll(/"\.\/([^"]*)"/g)].map((m) => m[1]).filter(Boolean);
  const missing = assets.filter((a) => !fs.existsSync(path.join(ROOT, a)));
  assert.deepStrictEqual(missing, [], "fichiers manquants : " + missing.join(", "));
});

test("board.js est présent dans le cache du service worker", () => {
  assert.ok(swSrc.includes('"./board.js"'));
});

test("la version du cache et version.txt concordent", () => {
  const version = fs.readFileSync(path.join(ROOT, "version.txt"), "utf8").trim();
  assert.ok(swSrc.includes(version), "CACHE ne contient pas " + version);
});

test("le manifeste PWA est un JSON valide", () => {
  const manifest = JSON.parse(fs.readFileSync(path.join(ROOT, "manifest.json"), "utf8"));
  assert.ok(manifest.icons.length >= 2);
  assert.ok(manifest.start_url);
});

test("aucun nom de joueur injecté dans du HTML sans échappement", () => {
  const offenders = [];
  gameSrc.split("\n").forEach((line, i) => {
    const rawName = /\$\{(p|pl|player)\.name\}/.test(line);
    if (!rawName) return;
    // Seules les affectations textContent sont sûres ; tout le reste doit passer par esc().
    if (line.includes("textContent")) return;
    if (/esc\((p|pl|player)\.name\)/.test(line)) return;
    offenders.push("game.js:" + (i + 1));
  });
  assert.deepStrictEqual(offenders, [], "interpolations non échappées : " + offenders.join(", "));
});

/* ------------------------------------------------------------- Bilan */
console.log("\n" + "-".repeat(52));
if (failures.length === 0) {
  console.log(`${passed} test(s) réussi(s).`);
  process.exit(0);
}
console.log(`${passed} réussi(s), ${failures.length} échec(s) :`);
for (const f of failures) console.log("  - " + f.name);
process.exit(1);
