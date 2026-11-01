/* ===== Trivial Quest — paramètres du jeu =====
   Toutes les valeurs réglables du jeu sont ici. */

const GAME_CONFIG = {
  /* ---- Joueurs ---- */
  minPlayers: 2,
  maxPlayers: 6,
  minAge: 4,
  maxAge: 120,

  /* ---- Timer de réponse (en secondes), par tranche d'âge ----
     null = pas de limite de temps pour cette tranche */
  answerTimeByAge: {
    "4-5": 60,
    "6-8": 45,
    "9-11": 40,
    "12-15": 30,
    "16-30": 25,
    "31+": 25
  },

  /* ---- Timer pour les recharges (par tranche de recharge) ---- */
  answerTimeByTheme: {
    "4-12": 45,
    "13-21": 30,
    "22+": 25
  },

  /* ---- Animations (ms) ---- */
  pawnStepMs: 240,        // durée d'un bond de pion
  diceSpinMs: 90,         // intervalle de culbute du dé
  diceSpins: 10,          // nombre de faces pendant le lancer
  wedgeFlightMs: 1100,    // vol du camembert gagné

  /* ---- Déplacement ---- */
  allowHubTransit: true,  // le moyeu peut être traversé en cours de route

  /* ---- Statistiques ---- */
  statsEnabled: true,

  /* ---- Persistance ---- */
  storageKey: "trivial-quest-save"  // clé localStorage de la partie en cours
};
