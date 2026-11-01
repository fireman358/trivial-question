# 🧀 Trivial Pursuit adapté à l'âge

Un jeu de type **Trivial Pursuit** jouable dans le navigateur, où **chaque joueur reçoit des questions adaptées à son âge**.

## ✨ Concept

Le Trivial Pursuit classique a un défaut : ses questions sont calibrées pour des adultes et les jeunes joueurs décrochent vite. Ce jeu reprend les **règles et le plateau emblématiques** du jeu original (6 catégories, camemberts, case centrale) mais **chaque question est servie selon la tranche d'âge du joueur qui répond**.

### Règles (fidèles à l'original)

- Plateau circulaire en **6 rayons de couleurs**, un par catégorie.
- On lance le **dé**, on avance du nombre de cases, on répond à une **question de la catégorie de la case**.
- Une **case camembert** (le losange au milieu de chaque rayon) permet de gagner un partenaire si la réponse est juste — **une seule tentative par catégorie**.
- **Bonne réponse = on rejoue** ; mauvaise réponse = au tour du joueur suivant.
- Une fois les **6 camemberts** collectés, il faut revenir au **centre** et répondre à une question finale d'une catégorie tirée au sort : **victoire !**

### Tranches d'âge

Chaque tranche a son propre cursus (~100+ questions, réparties dans les 6 catégories) :

| Tranche | Questions |
|---|---|
| 6–8 ans | 109 |
| 9–11 ans | 119 |
| 12–15 ans | 128 |
| 16–30 ans | 124 |
| 31 ans et + | 123 |

### Packs à thème

Des cases **★** sur le plateau servent une question d'un pack à thème activable :

- ⭐ **Spécial Disney** (104 questions)
- ⭐ **Spécial Musique** (104 questions)

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
