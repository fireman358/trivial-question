<template>
  <div>
    <EduSplash />
    <AppHeader />

    <!-- ÉCRAN 1 : Configuration -->
    <div id="app" v-if="game.screen === 'setup'">
      <div class="panel">
        <h2>1. Ajoutez les joueurs</h2>
        <PlayerForm :players="game.players" :selected-pawn="pendingPawn" @add="addPlayer" @remove="removePlayer" />
        <PawnPicker :selected="pendingPawn" :taken="game.players.map(p => p.pawn)" @select="pendingPawn = $event" />
        <p class="hint">Chaque joueur reçoit des questions correspondant à son âge. L'âge peut rester secret : il n'est jamais affiché pendant la partie.</p>
      </div>

      <div class="panel">
        <h2>2. Recharges — changent tout le jeu (optionnel)</h2>
        <ThemeSelector v-model="game.activeTheme" />
      </div>

      <div class="panel">
        <h2>3. Rappel des règles</h2>
        <ul class="rules">
          <li>On joue avec un dé : cliquez sur la case de destination après le lancer.</li>
          <li>Répondez à une question de la catégorie de la case où vous arrivez.</li>
          <li>Les sièges 🧀 (QG, en bout de rayon) donnent un camembert en cas de bonne réponse.</li>
          <li>Quand les 6 camemberts sont collectés, revenez au centre : question finale, victoire !</li>
          <li>Bonne réponse = on rejoue ; mauvaise réponse = au joueur suivant.</li>
          <li>Chaque question est adaptée à l'âge du joueur qui répond.</li>
        </ul>
        <button class="primary" :disabled="game.players.length < 2" @click="startGame">Commencer la partie</button>
      </div>
    </div>

    <!-- ÉCRAN 2 : Jeu -->
    <div id="app" v-else-if="game.screen === 'game'" class="game-screen">
      <div class="left-col"><GameLegend :active-theme="game.activeTheme" /></div>
      <div class="board-wrap">
        <GameBoard :cells="game.board.cells" :players="game.players" :current="game.current"
                   :destinations="game.destinations" :animating="game.animating" @select="moveTo" />
      </div>
      <div class="sidebar">
        <DiceRoller :title="turnTitle" :wedges="currentPlayer.wedges" :value="game.diceValue"
                    :rolling="rolling" :tumble-value="tumbleValue" :tumble-key="tumbleKey"
                    :disabled="!game.awaitingRoll || game.animating" :active-theme="game.activeTheme"
                    @roll="roll" />
        <QuestionPanel v-if="game.question" :question="game.question" :answered="answeredIndex"
                       :feedback="game.feedback" @answer="answer" />
        <PlayersList :players="game.players" :current="game.current" />
      </div>
    </div>

    <!-- ÉCRAN 3 : Victoire -->
    <div id="app" v-else-if="game.screen === 'win'" class="win-screen">
      <div class="panel">
        <h1>🏆 {{ game.winner.name }} remporte la partie !</h1>
        <p>6 camemberts collectés et question finale réussie. Bravo !</p>
        <button class="primary" @click="restart">Rejouer</button>
      </div>
    </div>

    <AppFooter />
  </div>
</template>

<script setup>
import { CATEGORIES, CAT_KEYS, PAWNS, ageGroupFor } from "~/composables/useGame.js";
import { exactPaths } from "~/composables/board.js";
import { catInfo, pickQuestion, questionPacks } from "~/composables/useQuestions.js";

const game = useGame();
const pendingPawn = ref(null);
const answeredIndex = ref(null);
const rolling = ref(false);
const tumbleValue = ref(1);
const tumbleKey = ref(0);
let rollTimer = null;

const currentPlayer = computed(() => game.value.players[game.value.current] || { wedges: {} });
const turnTitle = computed(() => {
  const p = game.value.players[game.value.current];
  return p ? `${PAWNS[p.pawn].emoji} Au tour de ${p.name}` : "Au tour de…";
});

// ---------- Configuration ----------
function addPlayer({ name, age, pawn }) {
  game.value.players.push({
    name, age, pawn,
    group: ageGroupFor(age),
    groupLabel: questionPacks[ageGroupFor(age)].label,
    color: CATEGORIES[pawn].color,
    pos: "hub", wedges: {}
  });
  pendingPawn.value = null;
}
function removePlayer(i) { game.value.players.splice(i, 1); }

function startGame() {
  game.value.drawBags = {};
  game.value.players.forEach(p => { p.pos = "hub"; p.wedges = {}; });
  game.value.current = 0;
  game.value.question = null;
  game.value.screen = "game";
}

function restart() { game.value.screen = "setup"; game.value.winner = null; }

// ---------- Tour de jeu ----------
function roll() {
  if (!game.value.awaitingRoll || game.value.animating) return;
  game.value.awaitingRoll = false;
  rolling.value = true;
  let spins = 0;
  clearInterval(rollTimer);
  rollTimer = setInterval(() => {
    tumbleValue.value = 1 + Math.floor(Math.random() * 6);
    tumbleKey.value++;
    spins++;
    if (spins >= 10) {
      clearInterval(rollTimer);
      const final = 1 + Math.floor(Math.random() * 6);
      rolling.value = false;
      game.value.diceValue = final;
      const p = game.value.players[game.value.current];
      const hasAll = Object.keys(p.wedges).length === 6;
      const paths = exactPaths(game.value.board, p.pos, final, hasAll);
      game.value.destinations = Object.keys(paths).length ? paths : {};
      if (!Object.keys(paths).length) {
        game.value.feedback = "Aucune case accessible, au tour suivant.";
        setTimeout(nextTurn, 1400);
      }
    }
  }, 90);
}

function moveTo(cellId) {
  if (!(cellId in game.value.destinations)) return;
  const path = game.value.destinations[cellId];
  game.value.destinations = {};
  const p = game.value.players[game.value.current];
  game.value.animating = true;
  let step = 1;
  const walk = () => {
    p.pos = path[step];
    if (step < path.length - 1) { step++; setTimeout(walk, 240); }
    else {
      game.value.animating = false;
      setTimeout(() => askQuestion(cellId), 250);
    }
  };
  walk();
}

function askQuestion(cellId) {
  const p = game.value.players[game.value.current];
  const cell = game.value.board.cells[cellId];
  const slot = cell.isCenter ? CAT_KEYS[Math.floor(Math.random() * 6)] : cell.cat;
  const info = catInfo(slot, game.value.activeTheme);
  const q = pickQuestion(game.value, p, slot);
  game.value.question = {
    catName: info.icon + " " + info.name + (cell.isCenter ? " — 🏆 question finale" : cell.isWedge ? " — 🧀 camembert en jeu !" : ""),
    color: info.color,
    text: q[1], options: q.slice(2, 6), correct: q[6],
    slot, isFinal: cell.isCenter, isWedge: cell.isWedge, wedgeCat: cell.wedgeCat
  };
  answeredIndex.value = null;
  game.value.feedback = "";
}

function answer(i) {
  if (answeredIndex.value !== null) return;
  answeredIndex.value = i;
  const p = game.value.players[game.value.current];
  const q = game.value.question;
  const ok = i === q.correct;
  if (ok) {
    game.value.feedback = "✅ Bonne réponse !";
    if (q.isWedge && !p.wedges[q.wedgeCat]) {
      p.wedges[q.wedgeCat] = true;
      game.value.feedback += ` ${p.name} gagne le camembert ${catInfo(q.wedgeCat, game.value.activeTheme).name} !`;
    }
    if (q.isFinal) {
      if (Object.keys(p.wedges).length === 6) {
        game.value.winner = p;
        game.value.screen = "win";
        return;
      }
      game.value.feedback += " Il vous faut encore tous les camemberts pour gagner au centre !";
    }
    setTimeout(() => {
      game.value.question = null;
      game.value.diceValue = null;
      game.value.awaitingRoll = true;
    }, 1600);
  } else {
    game.value.feedback = `❌ Mauvaise réponse. C'était : ${q.options[q.correct]}.`;
    setTimeout(nextTurn, 2000);
  }
}

function nextTurn() {
  game.value.question = null;
  game.value.diceValue = null;
  game.value.current = (game.value.current + 1) % game.value.players.length;
  game.value.awaitingRoll = true;
}
</script>

<style scoped>
#app { max-width: 1280px; margin: 0 auto; padding: 16px; }
.panel { background: #3d3d3d; border-radius: 8px; padding: 16px 20px; border: 1px solid #4a4a4a; margin-bottom: 16px; }
.panel h2 { margin-top: 0; font-size: 1.1rem; color: #38bdf8; }
.hint { color: #fff; opacity: .7; font-size: .85rem; }
.rules { padding-left: 18px; font-size: .92rem; line-height: 1.5; color: #fff; }
button.primary {
  background: #38bdf8; color: #0f172a; border: none; padding: 10px 18px;
  border-radius: 8px; font-size: 1.05rem; cursor: pointer; font-weight: 600;
}
button.primary:disabled { background: #4a4a4a; color: #888; cursor: not-allowed; }
.game-screen { display: flex; gap: 16px; align-items: flex-start; flex-wrap: wrap; }
.left-col { flex: 0 0 230px; min-width: 200px; max-width: 260px; order: 0; }
.board-wrap { flex: 2 1 380px; min-width: 340px; order: 1; }
.sidebar { flex: 0 0 320px; min-width: 300px; max-width: 360px; order: 2; }
.win-screen .panel { text-align: center; padding: 40px 20px; }
</style>
