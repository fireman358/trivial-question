<template>
  <header class="app-header">
    <div class="brand">
      <a href="https://edukisto.win/" target="_blank" rel="noopener" class="brand-logo" title="edukisto — relier & orienter">
        <svg viewBox="0 0 64 64" fill="none" aria-hidden="true">
          <path d="M32 3l5.2 18.2 10.8-5.2-5.2 10.8L61 32l-18.2 5.2 5.2 10.8-10.8-5.2L32 61l-5.2-18.2-10.8 5.2 5.2-10.8L3 32l18.2-5.2-5.2-10.8 10.8 5.2z" fill="#38bdf8"/>
          <path d="M32 32c-1.6-2-3-3.1-4.8-3.1a4.7 4.7 0 1 0 0 9.4c1.8 0 3.2-1.1 4.8-3.1 1.6 2 3 3.1 4.8 3.1a4.7 4.7 0 1 0 0-9.4c-1.8 0-3.2 1.1-4.8 3.1z" stroke="#0f1115" stroke-width="2.4"/>
        </svg>
      </a>
      <span class="brand-name">🧀 Trivial <span>Quest</span></span>
    </div>
    <span class="app-version">{{ version }}</span>
  </header>
</template>

<script setup>
// Version chargée depuis version.txt (récupéré à la génération statique)
const version = ref("");
onMounted(async () => {
  try {
    const r = await fetch("/version.txt", { cache: "no-store" });
    if (r.ok) version.value = (await r.text()).trim();
  } catch { /* version.txt inaccessible */ }
});
</script>

<style scoped>
.app-header {
  display: flex; align-items: center; gap: 18px; flex-wrap: wrap;
  background: #1c1c1c; color: #fff; border-bottom: 1px solid #4a4a4a;
  padding: 12px 18px; position: sticky; top: 0; z-index: 100;
  box-shadow: 0 2px 8px rgba(0,0,0,.35);
}
.brand { display: flex; align-items: center; gap: 10px; font-size: 1.2em; font-weight: 800; }
.brand-logo svg { width: 26px; height: 26px; display: block; }
.brand-logo:hover svg { filter: drop-shadow(0 0 8px rgba(56,189,248,.5)); }
.brand-name span { color: #38bdf8; }
.app-version { margin-left: auto; font-size: .72rem; opacity: .55; white-space: nowrap; }
</style>
