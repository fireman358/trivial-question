<template>
  <footer>
    <p>Trivial Quest adapté à l'âge — des questions pour chaque joueur, du tout-petit au grand.</p>
    <p class="small credits">
      <span class="sig-line">──</span>
      <a href="https://edukisto.win/" target="_blank" rel="noopener" title="edukisto — relier & orienter" class="edu-link">
        <svg width="14" height="14" viewBox="0 0 64 64" style="vertical-align:-2px"><path d="M32 3l5.2 18.2 10.8-5.2-5.2 10.8L61 32l-18.2 5.2 5.2 10.8-10.8-5.2L32 61l-5.2-18.2-10.8 5.2 5.2-10.8L3 32l18.2-5.2-5.2-10.8 10.8 5.2z" fill="currentColor"/></svg>
        edukisto
      </a>
      <span class="sig-line">──</span>
    </p>
    <p class="small">Trivial Quest · © {{ year }} David Demoulin</p>
  </footer>
</template>

<script setup>
const year = new Date().getFullYear();
</script>

<style scoped>
footer {
  text-align: center; padding: 1.6rem; margin-top: 12px;
  border-top: 1px solid #4a4a4a; color: #fff; font-size: .9rem;
}
footer .small { font-size: .75rem; opacity: .7; margin-top: 6px; }
.credits .sig-line { opacity: .5; letter-spacing: -2px; vertical-align: middle; }
.edu-link { color: #38bdf8; text-decoration: none; }
</style>
