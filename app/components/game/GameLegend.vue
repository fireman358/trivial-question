<template>
  <div class="panel">
    <h2>Légende</h2>
    <div class="legend-grid">
      <span v-for="slot in catKeys" :key="slot" class="legend-item">
        <span class="dot" :style="{ background: info(slot).color }" />
        {{ info(slot).icon }} {{ info(slot).name }}
      </span>
    </div>
    <b>Case spéciale</b>
    <div class="legend-grid">
      <span class="legend-item">🧀 QG (bout de chaque rayon, sur le cercle) : camembert de la couleur en jeu</span>
      <span class="legend-item">Le dé impose le nombre exact de pas</span>
    </div>
  </div>
</template>

<script setup>
import { CAT_KEYS } from "~/composables/useGame.js";
import { catInfo } from "~/composables/useQuestions.js";

const props = defineProps({ activeTheme: String });
const catKeys = CAT_KEYS;
const info = (slot) => catInfo(slot, props.activeTheme);
</script>

<style scoped>
.panel { background: #3d3d3d; border-radius: 8px; padding: 16px 20px; border: 1px solid #4a4a4a; }
.panel h2 { margin-top: 0; font-size: 1.1rem; color: #38bdf8; margin-bottom: 6px; }
.legend-grid { display: flex; flex-direction: column; gap: 6px; margin: 8px 0 12px; font-size: 1.1rem; line-height: 1.5; }
.legend-item { display: inline-flex; align-items: center; gap: 8px; }
.legend-item .dot { width: 15px; height: 15px; border-radius: 50%; display: inline-block; border: 1px solid #4a4a4a; }
b { color: #38bdf8; display: block; margin-top: 6px; font-size: 1.05rem; }
</style>
