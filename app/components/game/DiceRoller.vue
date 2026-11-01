<template>
  <div class="panel">
    <h2>{{ title }}</h2>
    <div class="camembert">
      <span v-for="k in catKeys" :key="k" class="wedge" :class="{ got: wedges[k] }"
            :style="{ background: wedges[k] ? categories[k].color : '#dee2e6' }"
            :title="catName(k)" />
    </div>
    <p class="hint">{{ Object.keys(wedges).length }}/6 camemberts</p>
    <button class="primary" :disabled="disabled" @click="$emit('roll')">🎲 Lancer le dé</button>
    <div class="dice-result">
      <div v-if="rolling" class="die"><div class="die-face die-tumble" :key="tumbleKey">{{ pipsHtml(tumbleValue) }}</div></div>
      <div v-else-if="value" class="die"><div class="die-face die-land">{{ pipsHtml(value) }}</div></div>
      <span v-if="value && !rolling" class="dice-info">Dé : {{ value }} — cliquez sur la case de destination.</span>
    </div>
  </div>
</template>

<script setup>
import { CATEGORIES, CAT_KEYS } from "~/composables/useGame.js";
import { catInfo } from "~/composables/useQuestions.js";

const props = defineProps({
  title: String,
  wedges: Object,
  value: Number,
  rolling: Boolean,
  tumbleValue: Number,
  tumbleKey: Number,
  disabled: Boolean,
  activeTheme: String
});
defineEmits(["roll"]);

const categories = CATEGORIES;
const catKeys = CAT_KEYS;
const catName = (k) => catInfo(k, props.activeTheme).name;

const PIPS = { 1: [4], 2: [0, 8], 3: [0, 4, 8], 4: [0, 2, 6, 8], 5: [0, 2, 4, 6, 8], 6: [0, 2, 3, 5, 6, 8] };
const pipsHtml = (n) => Array.from({ length: 9 }, (_, i) =>
  `<span class="pip-slot">${PIPS[n].includes(i) ? "<span class='pip'></span>" : ""}</span>`).join("");
</script>

<style scoped>
.panel { background: #3d3d3d; border-radius: 8px; padding: 16px 20px; border: 1px solid #4a4a4a; margin-bottom: 16px; }
.panel h2 { margin-top: 0; font-size: 1.1rem; color: #38bdf8; }
.camembert { display: flex; gap: 6px; margin: 10px 0; }
.wedge {
  width: 26px; height: 26px; display: inline-block;
  clip-path: polygon(50% 0, 100% 15%, 100% 85%, 50% 100%, 0 85%, 0 15%);
  border: 1px solid #4a4a4a;
}
.hint { color: #fff; opacity: .7; font-size: .85rem; }
button.primary {
  background: #38bdf8; color: #0f172a; border: none; padding: 10px 18px;
  border-radius: 8px; font-size: 1.05rem; cursor: pointer; font-weight: 600;
}
button.primary:disabled { background: #4a4a4a; color: #888; cursor: not-allowed; }
.dice-result { margin-top: 10px; min-height: 92px; display: flex; align-items: center; }
.die { display: inline-block; vertical-align: middle; margin-right: 10px; }
.die-face {
  display: grid; grid-template-columns: repeat(3, 1fr); gap: 7px;
  width: 84px; height: 84px; padding: 13px;
  background: linear-gradient(145deg, #ffffff, #d8dde6);
  border-radius: 16px; border: 2px solid #9aa3b0;
  box-shadow: 0 5px 14px rgba(0,0,0,.4), inset 0 -4px 8px rgba(0,0,0,.12), inset 0 3px 6px #ffffff88;
}
.pip-slot { display: flex; align-items: center; justify-content: center; }
.pip {
  width: 16px; height: 16px; border-radius: 50%;
  background: radial-gradient(circle at 35% 30%, #4a4f58, #14161a 70%);
  box-shadow: inset 0 -2px 3px rgba(0,0,0,.5), 0 1px 1px #ffffff55;
}
.die-tumble { animation: dice-tumble 0.45s linear infinite; }
@keyframes dice-tumble {
  0% { transform: rotate(0) scale(1); } 25% { transform: rotate(90deg) scale(1.12); }
  50% { transform: rotate(180deg) scale(0.96); } 75% { transform: rotate(270deg) scale(1.08); }
  100% { transform: rotate(360deg) scale(1); }
}
.die-land { animation: dice-land 0.4s cubic-bezier(.2,1.4,.4,1); }
@keyframes dice-land { 0% { transform: scale(1.45) rotate(15deg); } 55% { transform: scale(0.94) rotate(-4deg); } 100% { transform: scale(1) rotate(0); } }
.dice-info { font-size: .95rem; font-weight: 600; vertical-align: middle; }
</style>
