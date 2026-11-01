<template>
  <div id="studio-splash" aria-hidden="true">
    <div class="splash-inner">
      <div class="splash-logo">
        <svg class="splash-star" viewBox="0 0 64 64" aria-hidden="true">
          <path d="M32 3l5.2 18.2 10.8-5.2-5.2 10.8L61 32l-18.2 5.2 5.2 10.8-10.8-5.2L32 61l-5.2-18.2-10.8 5.2 5.2-10.8L3 32l18.2-5.2-5.2-10.8 10.8 5.2z" fill="#38bdf8"/>
          <path d="M32 32c-1.6-2-3-3.1-4.8-3.1a4.7 4.7 0 1 0 0 9.4c1.8 0 3.2-1.1 4.8-3.1 1.6 2 3 3.1 4.8 3.1a4.7 4.7 0 1 0 0-9.4c-1.8 0-3.2 1.1-4.8 3.1z" stroke="#0f1115" stroke-width="2.2" fill="none"/>
        </svg>
        Edukisto
      </div>
      <div class="splash-sub">présente</div>
    </div>
  </div>
</template>

<style scoped>
#studio-splash {
  position: fixed; inset: 0; background: #333333;
  display: flex; align-items: center; justify-content: center;
  z-index: 9999; animation: splash-bg 2.6s ease forwards; pointer-events: none;
}
.splash-inner { text-align: center; }
.splash-logo {
  display: flex; align-items: center; justify-content: center; gap: 18px;
  font-size: 54px; font-weight: 700; letter-spacing: 4px; color: #ffffff;
  animation: splash-logo 2.6s ease forwards; font-family: inherit;
}
.splash-star { width: 56px; height: 56px; filter: drop-shadow(0 0 14px rgba(56, 189, 248, 0.7)); }
.splash-sub {
  margin-top: 14px; font-size: 16px; letter-spacing: 6px; text-transform: uppercase;
  color: #38bdf8; animation: splash-sub 2.6s ease forwards;
}
@keyframes splash-logo {
  0% { opacity: 0; transform: scale(0.86); letter-spacing: 24px; }
  25% { opacity: 1; transform: scale(1); letter-spacing: 14px; }
  75% { opacity: 1; }
  100% { opacity: 0; transform: scale(1.05); }
}
@keyframes splash-sub { 0%, 15% { opacity: 0; } 35% { opacity: 1; } 75% { opacity: 1; } 100% { opacity: 0; } }
@keyframes splash-bg { 0%, 70% { opacity: 1; } 100% { opacity: 0; visibility: hidden; } }
</style>
