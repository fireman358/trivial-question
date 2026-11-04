# ◈ Trivial Quest

**Trivial Quest** : un jeu de quiz jouable dans le navigateur, inspiré des grands classiques du genre, où **chaque joueur reçoit des questions adaptées à son âge**.

## ✨ Concept

Les jeux de quiz classiques ont un défaut : leurs questions sont calibrées pour des adultes et les jeunes joueurs décrochent vite. Trivial Quest reprend les mécaniques éprouvées du genre (6 catégories, diamants à collecter, case centrale) mais **chaque question est servie selon la tranche d'âge du joueur qui répond**.

### Règles

- Plateau de **73 cases** : 1 moyeu central (départ et question finale), 6 rayons de 6 cases, 1 piste circulaire de 36 cases.
- Les **QG (losanges diamant ◈)** sont en bout de rayon, sur le cercle extérieur — un par couleur.
- Couleurs alternées : jamais deux cases de même couleur adjacentes. C'est vérifié automatiquement par les tests.
- On lance le **dé**, on choisit une case atteignable en **exactement** ce nombre de pas, puis on répond à une **question de la catégorie de la case**.
- Un **QG** donne un diamant si la réponse est juste.
- Chaque joueur choisit un **pion unique** (un par catégorie, comme au Monopoly).
- **Bonne réponse = on rejoue** ; mauvaise réponse ou temps écoulé = au tour du joueur suivant.
- Une fois les **6 diamants** collectés, il faut revenir au **centre** et répondre à une question finale : **victoire !**
- Les cases ↻ « Relancer le dé » font relancer immédiatement, sans question.
- Chaque question a un temps limité, dégressif selon l'âge ; l'âge d'un joueur n'est jamais affiché pendant la partie.
- De 1 à 6 joueurs ; une partie en cours survit au rafraîchissement de la page.

### Tranches d'âge

Chaque tranche a son propre cursus de questions, réparties dans les 6 catégories (Géographie, Histoire, Sciences, Sports & Loisirs, Arts & Littérature, Divertissement) :

| Tranche | Questions |
|---|---|
| 4–5 ans | 100 |
| 6–8 ans | 119 |
| 9–11 ans | 131 |
| 12–15 ans | 140 |
| 16–30 ans | 133 |
| 31 ans et + | 134 |
| **Total** | **757** |

### Recharges — packs à thème

Une recharge remplace les 6 catégories du plateau par celles du thème choisi (300 questions par pack, 3 niveaux : 4–12, 13–21, 22+) :

| Recharge | Questions |
|---|---|
| 🎬 Cinéma populaire | 300 |
| 🏰 Spécial Disney | 300 |
| 🐉 Dragon Ball | 300 |
| 🎵 Spécial Musique | 300 |
| 🎧 Musique 2000-2020 | 300 |
| 🎸 Musique 70s-90s | 300 |
| 📺 Séries populaires | 300 |
| ⭐ Star Wars | 300 |
| 🦸 DC & Marvel | 300 |
| **Total** | **2 700** |

Soit **3 457 questions** au total, toutes adaptées à un niveau de lecture.

## 🚀 Comment jouer

Aucune installation, aucune dépendance :

```
1. Ouvrir index.html dans un navigateur.
2. Ajouter chaque joueur avec son âge.
3. (Optionnel) Choisir une recharge à thème.
4. Lancer le dé, cliquer sur la case de destination, répondre.
```

Pour tester le mode hors-ligne (service worker et installation PWA), il faut servir le dossier en HTTP — par exemple :

```bash
python -m http.server 8000
# puis http://localhost:8000
```

## 📁 Structure

- `index.html` — interface du jeu
- `board.js` — topologie du plateau et règle de déplacement (pur, sans DOM, testable)
- `game.js` — moteur de jeu (tours, questions, score, animations)
- `config.js` — tous les réglages (timers par âge, limites de joueurs, animations)
- `style.css` — styles
- `data/age-*.js` — packs de questions par tranche d'âge
- `data/theme-*.js` — packs à thème
- `test/run-tests.js` — tests de non-régression (plateau, données, config, PWA)
- `test/smoke-dom.js` — partie simulée dans un DOM minimal (diamant, victoire, sauvegarde)
- `sw.js`, `manifest.json`, `version.txt` — service worker, manifeste et version affichée

## 🧪 Tests

Aucune dépendance à installer :

```bash
node test/run-tests.js
# ou
npm test
```

Les tests vérifient notamment :

- les **73 cases**, les 6 QG, et qu'**aucune arête ne relie deux cases de même couleur** ;
- que le plateau est connexe et que chaque case a une destination pour chaque dé ;
- que le moyeu n'est atteignable qu'avec les 6 diamants ;
- que **chaque paramètre de `config.js` est réellement lu** par le jeu (anti-dérive) ;
- que chaque question est bien formée, sans doublon dans un même tirage ;
- que tous les fichiers référencés par `index.html` et par le cache du service worker existent ;
- qu'une **partie complète** se déroule sans erreur (dé, question, diamant, victoire, sauvegarde).

## ➕ Ajouter des questions

Ouvrez le fichier du pack correspondant (`data/age-9-11.js`, `data/theme-disney.js`…) et ajoutez une ligne :

```
[catégorie, question, réponse A, réponse B, réponse C, réponse D, index de la bonne réponse]
```

Catégories du jeu de base : `G` Géographie, `H` Histoire, `S` Sciences, `L` Sports & Loisirs, `A` Arts & Littérature, `D` Divertissement. Pour une recharge, la catégorie doit être une clé de `pack.categories`.

L'ordre affiché des réponses est mélangé à l'exécution : la position de la bonne réponse dans le fichier n'a pas d'importance.

## 📄 Licence

MIT — voir [LICENSE](LICENSE).

Trivial Quest · © 2026 David Demoulin · [edukisto.win](https://edukisto.win/)

Les packs à thème citent des œuvres et personnages appartenant à leurs détenteurs respectifs (Disney, Lucasfilm, DC, Marvel…). Ils sont fournis à titre ludique et privé : vérifiez vos droits avant tout usage commercial.
