// Composable central : tout l'état et la logique du jeu Trivial Quest.
// Utilisé par tous les composants — source unique de vérité.

// ---------- Catégories : couleurs du plateau ----------
export const CATEGORIES = {
  G: { name: "Géographie",         color: "#1f6fb2", icon: "🌍" },
  H: { name: "Histoire",           color: "#f2c500", icon: "🏛️" },
  S: { name: "Sciences",           color: "#2e9b4e", icon: "🔬" },
  L: { name: "Sports & Loisirs",   color: "#f07c1e", icon: "⚽" },
  A: { name: "Arts & Littérature", color: "#7a4fa3", icon: "🎨" },
  D: { name: "Divertissement",     color: "#d5368d", icon: "🎬" }
};
export const CAT_KEYS = Object.keys(CATEGORIES);

// Ordre alterné des couleurs sur l'anneau extérieur (jamais deux identiques adjacentes)
export const RING_CATS = [
  "G","S","A","H","L","D",
  "A","D","G","L","S","H",
  "L","H","S","D","A","G",
  "D","G","H","A","L","S",
  "H","L","D","S","G","A",
  "S","A","L","G","H","D"
];

// Décalages du carré latin des rayons (jamais la couleur du QG en bout)
const SHIFT = [2, 4, 0, 3, 5, 1];

// ---------- Pions (un par catégorie) ----------
export const PAWNS = {
  G: { name: "Le Voyageur", emoji: "🚀" },
  H: { name: "Le Sage",     emoji: "🦉" },
  S: { name: "Le Savant",   emoji: "🧪" },
  L: { name: "L'Athlète",   emoji: "🏆" },
  A: { name: "L'Artiste",   emoji: "🎭" },
  D: { name: "La Star",     emoji: "🎬" }
};

// ---------- Tranches d'âge ----------
export function ageGroupFor(age) {
  if (age <= 5) return "4-5";
  if (age <= 8) return "6-8";
  if (age <= 11) return "9-11";
  if (age <= 15) return "12-15";
  if (age <= 30) return "16-30";
  return "31+";
}
export function themeGroupFor(age) {
  if (age <= 12) return "4-12";
  if (age <= 21) return "13-21";
  return "22+";
}

// ---------- Plateau : 73 cases officielles ----------
export const BOARD_GEOM = { HUB_R: 58, RING_R: 322, SPOKE_R: [104, 141, 178, 215, 252, 289], CELL_R: 17 };

function polar(r, angleDeg) {
  const a = (angleDeg - 90) * Math.PI / 180;
  return [350 + r * Math.cos(a), 350 + r * Math.sin(a)];
}

export function buildBoard() {
  const cells = {}; const adj = {};
  const add = (c) => { cells[c.id] = c; adj[c.id] = []; };
  const link = (a, b) => { adj[a].push(b); adj[b].push(a); };

  add({ id: "hub", x: 350, y: 350, cat: null, isCenter: true, isWedge: false });

  for (let i = 0; i < 36; i++) {
    const [x, y] = polar(BOARD_GEOM.RING_R, i * 10);
    if (i % 6 === 0) {
      const qgCat = CAT_KEYS[i / 6];
      add({ id: "ring" + i, x, y, cat: qgCat, isWedge: true, wedgeCat: qgCat });
    } else {
      add({ id: "ring" + i, x, y, cat: RING_CATS[i], isWedge: false });
    }
  }

  for (let s = 0; s < 6; s++) {
    const ang = s * 60;
    let prev = "hub";
    for (let k = 0; k < 6; k++) {
      const [x, y] = polar(BOARD_GEOM.SPOKE_R[k], ang);
      const id = "sp" + s + "-" + k;
      add({ id, x, y, cat: CAT_KEYS[(SHIFT[s] + k) % 6], isWedge: false });
      link(prev, id);
      prev = id;
    }
    link(prev, "ring" + (s * 6));
  }

  for (let i = 0; i < 36; i++) link("ring" + i, "ring" + ((i + 1) % 36));
  return { cells, adj };
}

// ---------- Composable principal ----------
export const useGame = () => useState("game", () => {
  const themePacks = useState("themePacks");
  return {
    // état
    screen: "setup",        // setup | game | win
    players: [],
    current: 0,
    activeTheme: null,     // clé de la recharge (disney, musique) ou null
    board: buildBoard(),
    drawBags: {},
    // UI transitoire
    diceValue: null,
    destinations: {},      // cellId -> chemin
    question: null,         // { catName, color, text, options, correct, isFinal }
    feedback: "",
    awaitingRoll: true,
    animating: false,
    winner: null
  };
});
