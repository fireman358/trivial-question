# 🧀 Trivial Quest

**Trivial Quest** : un jeu de quiz jouable dans le navigateur, inspiré des grands classiques du genre, où **chaque joueur reçoit des questions adaptées à son âge**.

## ✨ Concept

Les jeux de quiz classiques ont un défaut : leurs questions sont calibrées pour des adultes et les jeunes joueurs décrochent vite. Trivial Quest reprend les mécaniques éprouvées du genre (6 catégories, camemberts à collecter, case centrale) mais **chaque question est servie selon la tranche d'âge du joueur qui répond**.

### Règles (fidèles à l'original)

- Plateau officiel de **73 cases** : moyeu central (départ), 6 rayons de 6 cases, piste circulaire de 36 cases.
- Les **QG (cases camembert 🧀)** sont en bout de rayon, sur le cercle extérieur — un par couleur.
- Couleurs alternées partout : jamais deux cases de même couleur adjacentes (anneau et rayons).
- On lance le **dé**, on avance du nombre de cases, on répond à une **question de la catégorie de la case**.
- Un **QG** donne un camembert si la réponse est juste — **une seule tentative par catégorie**.
- Chaque joueur choisit un **pion unique** (un par catégorie, comme au Monopoly).
- **Bonne réponse = on rejoue** ; mauvaise réponse = au tour du joueur suivant.
- Une fois les **6 camemberts** collectés, il faut revenir au **centre** et répondre à une question finale d'une catégorie tirée au sort : **victoire !**

### Tranches d'âge

Chaque tranche a son propre cursus de questions, réparties dans les 6 catégories :

| Tranche | Questions |
|---|---|
| 4–5 ans | 92 |
| 6–8 ans | 109 |
| 9–11 ans | 119 |
| 12–15 ans | 128 |
| 16–30 ans | 124 |
| 31 ans et + | 123 |

### Extensions — cartes bonus

Les extensions sont des **paquets de cartes supplémentaires** qui enrichissent la catégorie Divertissement (🎬) : quand un joueur tombe sur une case 🎬, il peut piocher une carte bonus du thème activé. Elles se cochent en option avant la partie :

- ⭐ **Spécial Disney** (104 questions)
- ⭐ **Spécial Musique** (104 questions)

D'autres thèmes pourront être ajoutés au fil du temps (cinéma, Star Wars, famille…).

## 🚀 Comment jouer

Aucune installation : ouvrir `index.html` dans un navigateur.

```
1. Ajouter chaque joueur avec son âge (l'âge reste secret pendant la partie).
2. (Optionnel) Activer les packs à thème.
3. Lancer le dé, cliquer sur la case de destination, répondre !
```

## 📁 Structure

- `index.html` — interface du jeu
- `game.js` — moteur de jeu (plateau, dé, tours, questions)
- `style.css` — styles
- `data/age-*.js` — packs de questions par tranche d'âge
- `data/theme-*.js` — packs à thème (Disney, Musique)

Format d'une question : `[catégorie, question, réponse A, réponse B, réponse C, réponse D, index de la bonne réponse]`
Catégories : `G` Géographie, `H` Histoire, `S` Sciences, `L` Loisirs & Sports, `A` Arts & Littérature, `D` Divertissement.

## ➕ Ajouter des questions

Ouvrez le fichier du pack correspondant (`data/age-9-11.js`, `data/theme-disney.js`…) et ajoutez une ligne en suivant le format ci-dessus. C'est tout.
