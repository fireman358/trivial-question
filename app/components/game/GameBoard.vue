<template>
  <svg id="board" viewBox="0 0 700 700">
    <defs>
      <filter id="f-drop" x="-40%" y="-40%" width="180%" height="180%">
        <feDropShadow dx="0" dy="3" stdDeviation="2.5" flood-color="#000" flood-opacity="0.35"/>
      </filter>
      <radialGradient id="rg-board" cx="50%" cy="46%">
        <stop offset="0%" stop-color="#f8f4e6"/><stop offset="100%" stop-color="#e8dfc4"/>
      </radialGradient>
      <radialGradient v-for="(c, k) in categories" :id="'rg-' + k" :key="k" cx="38%" cy="32%">
        <stop offset="0%" :stop-color="lighten(c.color, 90)"/>
        <stop offset="100%" :stop-color="c.color"/>
      </radialGradient>
    </defs>

    <circle cx="350" cy="352" r="350" fill="url(#rg-board)" stroke="#c9b98a" stroke-width="3"/>
    <circle cx="350" cy="352" :r="HUB_R + 14" fill="#f2e9cf" stroke="#c9b98a" stroke-width="2" opacity="0.8"/>

    <!-- Moyeu : logo Edukisto -->
    <g class="cell hub-cell">
      <circle cx="350" cy="352" :r="HUB_R" fill="#00000022"/>
      <circle cx="350" cy="350" :r="HUB_R" fill="#333333" stroke="#38bdf8" stroke-width="3" filter="url(#f-drop)"/>
      <g :transform="`translate(${350 - 32 * hubScale} ${350 - 32 * hubScale}) scale(${hubScale})`">
        <path d="M32 3l5.2 18.2 10.8-5.2-5.2 10.8L61 32l-18.2 5.2 5.2 10.8-10.8-5.2L32 61l-5.2-18.2-10.8 5.2 5.2-10.8L3 32l18.2-5.2-5.2-10.8 10.8 5.2z" fill="#38bdf8"/>
        <path d="M32 32c-1.6-2-3-3.1-4.8-3.1a4.7 4.7 0 1 0 0 9.4c1.8 0 3.2-1.1 4.8-3.1 1.6 2 3 3.1 4.8 3.1a4.7 4.7 0 1 0 0-9.4c-1.8 0-3.2 1.1-4.8 3.1z" stroke="#7dd3fc" stroke-width="2.2" fill="none"/>
      </g>
    </g>

    <!-- Cases -->
    <g v-for="(cell, id) in cells" :key="id" v-show="!cell.isCenter"
       :id="'cell-' + id" class="cell" :class="{ 'wedge-cell': cell.isWedge, reachable: isReachable(id) }"
       @click="$emit('select', id)">
      <circle v-if="!cell.isWedge" :cx="cell.x" :cy="cell.y + 2.5" :r="CELL_R" fill="#00000026"/>
      <circle v-if="!cell.isWedge" :cx="cell.x" :cy="cell.y" :r="CELL_R" :fill="`url(#rg-${cell.cat})`" stroke="#2b2b2b" stroke-width="2" filter="url(#f-drop)"/>
      <polygon v-else :points="hexPoints(cell.x, cell.y + 2.5, 24)" fill="#00000026"/>
      <polygon v-if="cell.isWedge" :points="hexPoints(cell.x, cell.y, 24)" :fill="`url(#rg-${cell.wedgeCat})`" stroke="#2b2b2b" stroke-width="2.5" filter="url(#f-drop)"/>
      <text :x="cell.x" :y="cell.y + 6" text-anchor="middle" class="cell-icon">{{ cellIcon(cell) }}</text>
    </g>

    <!-- Pions -->
    <g v-for="(p, i) in players" :key="'pawn' + i" filter="url(#f-drop)" class="pawn-group" :class="{ 'pawn-moving': animating && i === current }">
      <ellipse :cx="pawnX(p, i)" :cy="pawnY(p, i) + 13" rx="10" ry="4" fill="#00000033"/>
      <circle :cx="pawnX(p, i)" :cy="pawnY(p, i)" r="11" :fill="p.color" stroke="#1d1d1d" stroke-width="1.5"/>
      <circle :cx="pawnX(p, i) - 3.5" :cy="pawnY(p, i) - 4" r="3.2" fill="#ffffffcc"/>
      <text :x="pawnX(p, i)" :y="pawnY(p, i) - 14" text-anchor="middle" class="pawn-emoji">{{ pawns[p.pawn].emoji }}</text>
    </g>
  </svg>
</template>

<script setup>
import { CATEGORIES, CAT_KEYS, PAWNS, BOARD_GEOM } from "~/composables/useGame.js";

const props = defineProps({
  cells: Object,
  players: Array,
  current: Number,
  destinations: Object,
  animating: Boolean
});
defineEmits(["select"]);

const HUB_R = BOARD_GEOM.HUB_R;
const CELL_R = BOARD_GEOM.CELL_R;
const categories = CATEGORIES;
const pawns = PAWNS;
const hubScale = (HUB_R - 8) / 32;

const lighten = (hex, amt) => {
  const n = parseInt(hex.slice(1), 16);
  const r = Math.min(255, (n >> 16) + amt), g = Math.min(255, ((n >> 8) & 255) + amt), b = Math.min(255, (n & 255) + amt);
  return "#" + ((r << 16) | (g << 8) | b).toString(16).padStart(6, "0");
};
const hexPoints = (cx, cy, r) => {
  const pts = [];
  for (let i = 0; i < 6; i++) {
    const a = (i * 60 + 30) * Math.PI / 180;
    pts.push((cx + r * Math.cos(a)).toFixed(1) + "," + (cy + r * Math.sin(a)).toFixed(1));
  }
  return pts.join(" ");
};
const cellIcon = (cell) => cell.isWedge ? "🧀" : CATEGORIES[cell.cat].icon;
const isReachable = (id) => props.destinations && id in props.destinations;
const pawnX = (p, i) => props.cells[p.pos].x + ((i % 3) - 1) * 14;
const pawnY = (p, i) => props.cells[p.pos].y + (Math.floor(i / 3) - 0.5) * 16;
</script>

<style scoped>
.cell { cursor: default; }
.cell.reachable { cursor: pointer; animation: pulse 1s infinite alternate; }
.cell.reachable :deep(circle), .cell.reachable :deep(polygon) { stroke: #fff !important; stroke-width: 3 !important; }
@keyframes pulse { from { opacity: 0.75; } to { opacity: 1; } }
.wedge-cell polygon { stroke-width: 3; }
.cell-icon { font-size: 13px; pointer-events: none; user-select: none; }
.pawn-emoji { font-size: 15px; pointer-events: none; filter: drop-shadow(0 2px 2px rgba(0,0,0,.4)); }
.pawn-moving circle, .pawn-moving .pawn-emoji { animation: pawn-hop 0.3s ease; }
@keyframes pawn-hop { 0% { transform: translateY(0); } 45% { transform: translateY(-9px); } 100% { transform: translateY(0); } }
</style>
