<template>
  <div>
    <div v-for="(p, i) in players" :key="p.name" class="player-row">
      <span class="dot" :style="{ background: p.color }" />
      <span>{{ p.name }}</span>
      <span class="group-tag">{{ p.groupLabel }}</span>
      <span class="pawn-tag">{{ pawns[p.pawn].emoji }} {{ pawns[p.pawn].name }}</span>
      <button class="remove" @click="$emit('remove', i)">✕</button>
    </div>
    <div class="add-player">
      <input type="text" v-model="name" placeholder="Nom du joueur" maxlength="20">
      <input type="number" v-model="age" placeholder="Âge" min="4" max="120">
      <button @click="add">Ajouter</button>
    </div>
  </div>
</template>

<script setup>
import { PAWNS } from "~/composables/useGame.js";
const props = defineProps({ players: Array, selectedPawn: String });
const emit = defineEmits(["add", "remove"]);
const pawns = PAWNS;
const name = ref("");
const age = ref("");

function add() {
  if (!name.value.trim()) return alert("Donnez un nom au joueur.");
  const a = parseInt(age.value, 10);
  if (!a || a < 4 || a > 120) return alert("Donnez un âge valide (4 à 120).");
  if (props.players.length >= 6) return alert("Maximum 6 joueurs.");
  if (!props.selectedPawn) return alert("Choisissez un pion (cliquez sur un pion libre).");
  if (props.players.some(p => p.pawn === props.selectedPawn)) return alert("Ce pion est déjà pris.");
  emit("add", { name: name.value.trim(), age: a, pawn: props.selectedPawn });
  name.value = ""; age.value = "";
}
</script>

<style scoped>
.player-row { display: flex; align-items: center; gap: 8px; padding: 6px 8px; border-radius: 8px; color: #fff; }
.dot { width: 14px; height: 14px; border-radius: 50%; display: inline-block; border: 1px solid #4a4a4a; }
.group-tag { font-size: .78rem; background: #333; padding: 2px 8px; border-radius: 999px; border: 1px solid #4a4a4a; }
.pawn-tag { font-size: .74rem; background: #333; padding: 2px 8px; border-radius: 999px; border: 1px solid #4a4a4a; color: #38bdf8; }
.remove { background: none; color: #f87171; font-size: 1rem; padding: 0 4px; border: none; cursor: pointer; }
.add-player { display: flex; gap: 8px; margin: 10px 0; flex-wrap: wrap; }
.add-player input {
  padding: 8px 10px; border: 1px solid #4a4a4a; border-radius: 8px;
  background: #333; color: #fff; font-size: 1rem;
}
.add-player input:nth-child(1) { flex: 2; min-width: 140px; }
.add-player input:nth-child(2) { flex: 1; min-width: 70px; }
.add-player button {
  padding: 8px 14px; border: none; border-radius: 8px;
  background: #38bdf8; color: #0f172a; font-size: 1rem; cursor: pointer; font-weight: 600;
}
</style>
