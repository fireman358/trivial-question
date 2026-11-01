<template>
  <div>
    <p class="hint">Choisissez un pion ci-dessous, puis cliquez sur Ajouter. Chaque pion est unique : un par catégorie.</p>
    <div class="pawn-grid">
      <div v-for="k in catKeys" :key="k" class="pawn-choice"
           :class="{ taken: taken.includes(k), selected: selected === k }"
           @click="!taken.includes(k) && $emit('select', k)">
        <span class="pawn-mini" :style="{ '--pc': categories[k].color }">{{ pawns[k].emoji }}</span>
        <span class="pawn-choice-name">{{ pawns[k].name }}</span>
        <span v-if="taken.includes(k)" class="pawn-taken-label">pris</span>
      </div>
    </div>
  </div>
</template>

<script setup>
import { CATEGORIES, CAT_KEYS, PAWNS } from "~/composables/useGame.js";
defineProps({ selected: String, taken: Array });
defineEmits(["select"]);
const categories = CATEGORIES;
const catKeys = CAT_KEYS;
const pawns = PAWNS;
</script>

<style scoped>
.hint { color: #fff; opacity: .7; font-size: .85rem; }
.pawn-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(88px, 1fr)); gap: 8px; margin: 10px 0 6px; }
.pawn-choice {
  display: flex; flex-direction: column; align-items: center; gap: 4px;
  padding: 10px 6px; border: 2px solid #4a4a4a; border-radius: 8px;
  cursor: pointer; background: #333; transition: transform .12s ease, border-color .12s ease, box-shadow .12s ease;
}
.pawn-choice:hover:not(.taken) { transform: translateY(-3px); border-color: #38bdf8; }
.pawn-choice.selected { border-color: #38bdf8; box-shadow: 0 0 0 3px rgba(56,189,248,.25); }
.pawn-choice.taken { opacity: .38; cursor: not-allowed; filter: grayscale(.6); }
.pawn-choice-name { font-size: .72rem; text-align: center; color: #fff; }
.pawn-taken-label { font-size: .62rem; color: #f87171; }
.pawn-mini {
  width: 40px; height: 40px; border-radius: 50%;
  background: radial-gradient(circle at 32% 28%, #ffffffcc 0%, var(--pc) 55%, color-mix(in srgb, var(--pc) 60%, #000) 100%);
  border: 2px solid #1d1d1d; display: inline-flex; align-items: center; justify-content: center;
  font-size: 19px; box-shadow: 0 4px 8px rgba(0,0,0,.35), inset 0 -4px 8px rgba(0,0,0,.25);
}
</style>
