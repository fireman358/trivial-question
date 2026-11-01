<template>
  <div>
    <p class="hint">Une recharge remplace les 6 catégories du plateau par les 6 catégories du thème : toutes les questions viennent du pack, adaptées à l'âge de chaque joueur. Sans recharge, le jeu reste en culture générale. D'autres thèmes arriveront (cinéma, Star Wars…).</p>
    <div v-for="(pack, key) in themePacks" :key="key" class="theme-option">
      <input type="radio" :id="'theme-' + key" name="theme-pack" :checked="modelValue === key" @change="$emit('update:modelValue', key)">
      <label :for="'theme-' + key">{{ pack.icon }} <b>{{ pack.label }}</b> — {{ total(pack) }} questions (3 tranches d'âge)</label>
    </div>
    <div class="theme-option">
      <input type="radio" id="theme-none" name="theme-pack" :checked="modelValue === null" @change="$emit('update:modelValue', null)">
      <label for="theme-none">🎓 <b>Culture générale</b> — sans recharge</label>
    </div>
  </div>
</template>

<script setup>
import { themePacks } from "~/composables/useQuestions.js";
defineProps({ modelValue: String });
defineEmits(["update:modelValue"]);
const total = (pack) => Object.values(pack.groups).reduce((a, g) => a + g.questions.length, 0);
</script>

<style scoped>
.hint { color: #fff; opacity: .7; font-size: .85rem; }
.theme-option { padding: 4px 0; color: #fff; }
.theme-option input { accent-color: #38bdf8; margin-right: 6px; }
</style>
