<template>
  <section class="cta-section">
    <div class="container">
      <h2>Готовы выбрать свою профессию?</h2>
      <p>Изучите все доступные направления подготовки и найдите идеальный колледж для вашего будущего</p>
      <router-link to="/sector" class="btn-secondary cta-sector-btn">Смотреть все отрасли</router-link>
    </div>
  </section>
</template>

<style scoped>
.cta-sector-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 260px;
  padding: 14px 24px;
  border-radius: 999px;
  border: 2px solid rgba(255, 255, 255, 0.85);
  background: rgba(255, 255, 255, 0.12);
  color: #fff;
  text-decoration: none;
  font-weight: 800;
  letter-spacing: 0.01em;
  backdrop-filter: blur(2px);
  box-shadow: 0 10px 24px rgba(1, 43, 88, 0.25);
  transition: transform 0.2s ease, box-shadow 0.2s ease, background 0.2s ease;
}

.cta-sector-btn:hover {
  color: #fff;
  background: rgba(255, 255, 255, 0.2);
  transform: translateY(-2px);
  box-shadow: 0 14px 30px rgba(1, 43, 88, 0.35);
}
</style>
