<template>
  <div class="panel">
    <h2>Joueurs</h2>
    <div v-for="(p, i) in players" :key="p.name" class="player-row" :class="{ active: i === current }">
      <span class="pawn-emoji">{{ pawns[p.pawn].emoji }}</span>
      <span>{{ p.name }}</span>
      <span class="group-tag">{{ p.groupLabel }}</span>
      <span>{{ Object.keys(p.wedges).length }}/6</span>
    </div>
  </div>
</template>

<script setup>
import { PAWNS } from "~/composables/useGame.js";
defineProps({ players: Array, current: Number });
const pawns = PAWNS;
</script>

<style scoped>
.panel { background: #3d3d3d; border-radius: 8px; padding: 16px 20px; border: 1px solid #4a4a4a; margin-bottom: 16px; }
.panel h2 { margin-top: 0; font-size: 1.1rem; color: #38bdf8; }
.player-row { display: flex; align-items: center; gap: 8px; padding: 6px 8px; border-radius: 8px; }
.player-row.active { background: rgba(56, 189, 248, 0.12); }
.pawn-emoji { font-size: 1.05rem; }
.group-tag { font-size: .78rem; background: #333; padding: 2px 8px; border-radius: 999px; border: 1px solid #4a4a4a; color: #fff; margin-left: auto; }
</style>
