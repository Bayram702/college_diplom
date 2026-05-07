<template>
  <section class="section professions-section">
    <div class="container">
      <div class="section-title">
        <h2>Популярные профессии</h2>
        <p>Самые востребованные специальности на рынке труда Республики Башкортостан</p>
      </div>

      <div v-if="loading" class="loading">Загрузка профессий...</div>

      <div v-else class="profession-cards">
        <a
          v-for="profession in professions"
          :key="profession.id"
          :href="profession.link"
          class="profession-card"
        >
          <div class="profession-icon">{{ profession.icon }}</div>
          <h4>{{ profession.title }}</h4>
          <p>{{ profession.description }}</p>
        </a>
      </div>
    </div>
  </section>
</template>

<script setup>
import { ref, onMounted } from 'vue'

const professions = ref([])
const loading = ref(true)

const ICONS_MAP = {
  '08': '🔧', '09': '💻', '07': '🏗️',
  '38': '📊', '31': '🩺', '43': '👨‍🍳',
  '44': '👩‍🏫', '35': '🚜', 'default': '💼'
}

const getIconForSector = (sectors) => {
  if (!sectors || sectors.length === 0) return ICONS_MAP.default
  const firstCode = sectors[0].code?.substring(0, 2)
  return ICONS_MAP[firstCode] || ICONS_MAP.default
}

const getLinkForSector = (sectors) => {
  if (!sectors || sectors.length === 0) return '/sector'
  return `/sector#${sectors[0].code}`
}

const loadProfessions = async () => {
  try {
    const response = await fetch('http://localhost:3000/api/specialties?limit=12')
    const result = await response.json()
    if (result.success) {
      // Берём первые 12 специальностей и формируем карточки профессий
      professions.value = result.data.slice(0, 12).map(s => ({
        id: s.id,
        icon: getIconForSector(s.sectors),
        title: s.name,
        description: s.description || `Код: ${s.code}, форма: ${s.form === 'full-time' ? 'очная' : 'заочная'}`,
        link: getLinkForSector(s.sectors)
      }))
    }
  } catch (error) {
    console.error('Ошибка загрузки профессий:', error)
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  loadProfessions()
})
</script>
