# Trivial Quest — Documentation du projet

Jeu de quiz type Trivial, jouable dans le navigateur, où **chaque joueur reçoit des questions adaptées à son âge**.

## Documents

- [structure.md](./structure.md) — architecture du projet et des composants
- [features.md](./features.md) — catalogue des fonctionnalités (existantes et planifiées)
- [sprints.md](./sprints.md) — découpage en sprints et avancement

## Aperçu rapide

| Élément | Détail |
|---|---|
| **Nom** | Trivial Quest |
| **Type** | Application web (Nuxt 3, rendu statique) |
| **Charte** | Edukisto — fond anthracite #333, accent cyan #38bdf8 |
| **Plateau** | 73 cases officielles : moyeu, 6 rayons de 6 cases, anneau de 36, QG en bout de rayon |
| **Questions** | 1357 au total — 6 tranches d'âge pour le jeu de base, 3 tranches par recharge |
| **Recharges** | Disney (300 q.) et Musique (300 q.) : remplacent les 6 catégories du plateau |
| **Déploiement** | Cloudflare Pages (branche `main` = version JS vanilla, `nuxt-migration` = version Nuxt) |

## Règles du jeu

1. Chaque joueur indique son âge (secret) et choisit un pion unique.
2. On lance le dé : le pion avance d'**exactement** le nombre de cases indiqué (pas de demi-tour immédiat).
3. La case détermine la catégorie de la question. Un **QG 🧀** (bout de rayon) met un camembert en jeu.
4. Bonne réponse = on rejoue. Mauvaise réponse (ou temps écoulé) = au joueur suivant.
5. Avec les 6 camemberts, retour au centre : question finale, victoire !
