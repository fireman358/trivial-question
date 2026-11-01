# Structure du projet

Deux versions coexistent dans le dépôt :

| Branche | Stack | État |
|---|---|---|
| `main` | HTML/CSS/JS vanilla (un seul `game.js`) | En production sur Cloudflare Pages |
| `nuxt-migration` | Nuxt 3, composants Vue | Migration en cours |

## Architecture Nuxt (`nuxt-migration`)

```
├── nuxt.config.ts          # SSR statique (preset nitro), head, CSS global
├── package.json
├── version.txt              # badge de version (affiché dans le header)
├── data/
│   ├── questions.mjs        # jeu de base : 6 tranches d'âge (packs d'âge → questions)
│   └── themes.mjs           # recharges : disney, musique (catégories + 3 tranches × 100 q.)
├── app/
│   ├── app.vue             # conteneur racine (<NuxtPage />)
│   ├── assets/css/main.css # variables charte edukisto, reset
│   ├── composables/        # logique partagée (source unique de vérité)
│   │   ├── useGame.js      # constantes (catégories, pions, plateau), état global
│   │   ├── useQuestions.js # catégories actives + tirage sans remise
│   │   └── board.js        # déplacement exact (BFS sans demi-tour)
│   ├── components/
│   │   ├── EduSplash.vue       # splash « Studio Edukisto présente »
│   │   ├── AppHeader.vue       # header applicatif (logo + nom + version)
│   │   ├── AppFooter.vue       # footer signé edukisto
│   │   ├── setup/
│   │   │   ├── PlayerForm.vue  # saisie joueur + liste des joueurs ajoutés
│   │   │   ├── PawnPicker.vue  # grille de choix du pion (6 uniques)
│   │   │   └── ThemeSelector.vue # radio : culture générale / recharges
│   │   ├── game/
│   │   │   ├── GameBoard.vue   # plateau SVG 73 cases + pions 2.5D
│   │   │   ├── DiceRoller.vue  # dé animé 3×3 + camemberts du joueur
│   │   │   ├── QuestionPanel.vue # question + 4 réponses + feedback
│   │   │   ├── GameLegend.vue  # légende dynamique (suit la recharge)
│   │   │   └── PlayersList.vue # liste des joueurs + score
│   └── pages/
│       └── index.vue        # orchestration : écrans setup/game/win, logique de tour
└── doc/                     # cette documentation
```

## Principes

- **Source unique de vérité** : tout l'état vit dans le composable `useGame()` (via `useState`). Les composants lisent ce state et émettent des événements ; la logique de tour reste dans la page.
- **Réutilisation maximale** : `catInfo()` traduit chaque couleur du plateau en catégorie (base ou recharge) — plateau, questions, légende et annonces passent tous par cette même fonction. Un composant ne connaît jamais la différence entre jeu de base et recharge.
- **Tirage sans remise** (`useQuestions.js`) : un sac par pool (tranche × catégorie, ou recharge × tranche × catégorie). Une question ne revient qu'après épuisement de son sac.
- **Rendu statique** : `nitro.preset: 'static'` → sortie `.output/public` déployable tel quel sur Cloudflare Pages.
- **Ajouter une recharge** : créer `data/theme-<nom>.mjs` (ou étendre `themes.mjs`) avec `icon`, `label`, `categories` (6) et `groups` (3 tranches × 100 questions). Elle apparaît automatiquement dans le sélecteur.
