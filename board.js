/* ===== Trivial Quest — topologie du plateau =====
   Ce module ne touche pas au DOM : il ne construit que le graphe du plateau
   (cases + voisinage) et la règle de déplacement. Il est chargé à la fois
   par la page (script classique) et par les tests (CommonJS), ce qui permet
   de vérifier les invariants du plateau sans navigateur.

   Plateau officiel : 73 cases
     1 moyeu central (départ + question finale)
     36 cases de piste circulaire, dont les 6 QG (losanges) en bout de rayon
     36 cases de rayon (6 rayons x 6 cases)                                */
(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  else root.BoardGraph = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";

  /* Ordre des QG sur l'anneau, à partir de l'angle 0 (haut), puis toutes les 60°. */
  const CATEGORY_ORDER = ["G", "S", "A", "H", "L", "D"];

  /* Ordre de référence des clés internes (identiques aux couleurs du jeu). */
  const CAT_KEYS = ["G", "H", "S", "L", "A", "D"];

  const RING_CELLS = 36;
  const SPOKE_COUNT = 6;
  const SPOKE_CELLS = 6;

  /* Couleurs de la piste circulaire.
     Contrainte : une case ne porte jamais la couleur de ses deux voisines
     d'anneau. Les indices multiples de 6 sont les QG (couleur imposée par
     CATEGORY_ORDER) et les indices i % 6 === 3 sont des cases « Relancer le
     dé » (sans couleur) : leurs valeurs ici ne sont donc pas utilisées. */
  const RING_CATS = [
    "G", "S", "A", "H", "L", "D",
    "A", "D", "G", "L", "S", "H",
    "L", "H", "S", "D", "A", "G",
    "D", "G", "H", "A", "L", "S",
    "H", "H", "D", "S", "G", "A",
    "S", "A", "L", "G", "H", "D"
  ];

  /* Décalage de couleur par rayon (carré latin) : pour une distance k donnée,
     les 6 rayons portent 6 catégories différentes. Les décalages sont aussi
     choisis pour que la case extérieure (k = 5) ne porte jamais la couleur
     du QG qu'elle touche. */
  const SHIFT = [2, 4, 0, 3, 5, 1];

  /* Construit le graphe : { cells: { id -> case }, adj: { id -> [ids] } } */
  function buildBoardGraph() {
    const cells = {};
    const adj = {};
    const add = (cell) => {
      cells[cell.id] = cell;
      adj[cell.id] = [];
    };
    const link = (a, b) => {
      adj[a].push(b);
      adj[b].push(a);
    };

    add({ id: "hub", cat: null, isCenter: true, isWedge: false, isRollAgain: false });

    /* Piste circulaire : 36 cases, un QG toutes les 6 cases. */
    for (let i = 0; i < RING_CELLS; i++) {
      if (i % 6 === 0) {
        const qgCat = CATEGORY_ORDER[i / 6];
        add({
          id: "ring" + i, ring: i, cat: qgCat,
          isWedge: true, wedgeCat: qgCat, isRollAgain: false
        });
      } else {
        const rollAgain = i % 6 === 3;
        add({
          id: "ring" + i, ring: i,
          cat: rollAgain ? null : RING_CATS[i],
          isWedge: false, isRollAgain: rollAgain
        });
      }
    }

    /* 6 rayons de 6 cases, du moyeu vers le QG. */
    for (let s = 0; s < SPOKE_COUNT; s++) {
      let prev = "hub";
      for (let k = 0; k < SPOKE_CELLS; k++) {
        const id = "sp" + s + "-" + k;
        add({
          id, spoke: s, k,
          cat: CAT_KEYS[(SHIFT[s] + k) % 6],
          isWedge: false, isRollAgain: false
        });
        link(prev, id);
        prev = id;
      }
      link(prev, "ring" + (s * 6));
    }

    for (let i = 0; i < RING_CELLS; i++) link("ring" + i, "ring" + ((i + 1) % RING_CELLS));

    return { cells, adj };
  }

  /* Destinations atteignables en EXACTEMENT `steps` pas.
     - on ne peut pas faire immédiatement demi-tour sur la case précédente ;
     - le moyeu ne peut être une destination finale qu'avec les 6 diamants ;
     - avec allowHubTransit === false, le moyeu ne peut pas être traversé non plus.
     Retourne { idCase: chemin }, le chemin partant de startId. */
  function reachableDestinations(graph, startId, steps, opts) {
    const options = opts || {};
    const cells = graph.cells;
    const adj = graph.adj;
    const hasAllWedges = !!options.hasAllWedges;
    const allowHubTransit = options.allowHubTransit !== false;

    let frontier = new Map([[startId + "|", [startId]]]);
    for (let s = 0; s < steps; s++) {
      const next = new Map();
      for (const [state, path] of frontier) {
        const sep = state.indexOf("|");
        const cell = state.slice(0, sep);
        const prev = state.slice(sep + 1);
        for (const n of adj[cell]) {
          if (n === prev) continue; // pas de demi-tour immédiat
          if (n === "hub" && s < steps - 1 && !allowHubTransit) continue;
          const key = n + "|" + cell;
          if (!next.has(key)) next.set(key, path.concat(n));
        }
      }
      frontier = next;
    }

    const paths = {};
    for (const path of frontier.values()) {
      const dest = path[path.length - 1];
      if (cells[dest].isCenter && !hasAllWedges) continue;
      if (!paths[dest]) paths[dest] = path;
    }
    return paths;
  }

  return {
    CATEGORY_ORDER,
    CAT_KEYS,
    RING_CATS,
    SHIFT,
    RING_CELLS,
    SPOKE_COUNT,
    SPOKE_CELLS,
    buildBoardGraph,
    reachableDestinations
  };
});
