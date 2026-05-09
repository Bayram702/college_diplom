<template>
  <section class="section">
    <div class="container">
      <div class="section-title">
        <h2>Основные отрасли</h2>
        <p>Выберите направление подготовки, которое соответствует вашим интересам</p>
      </div>

      <div v-if="loading" class="loading">Загрузка отраслей...</div>

      <div v-else class="sectors-grid">
        <router-link
          v-for="sector in sectors"
          :key="sector.id"
          :to="sector.link"
          class="sector-card"
        >
          <img :src="sector.image" :alt="sector.title" class="sector-image" @error="useFallbackImage">
          <div class="sector-content">
            <h3>{{ sector.title }}</h3>
            <p>{{ sector.description }}</p>
            <div class="sector-stats">
              <div class="stat">
                <div class="stat-value">{{ sector.colleges }}</div>
                <div class="stat-label">Колледжей</div>
              </div>
              <div class="stat">
                <div class="stat-value">{{ sector.programs }}</div>
                <div class="stat-label">Программ</div>
              </div>
            </div>
          </div>
        </router-link>
      </div>
    </div>
  </section>
</template>

<script setup>
import { ref, onMounted } from 'vue'

const sectors = ref([])
const loading = ref(true)

const getSectorKey = (sector) => sector.code?.match(/^\d{2}/)?.[0] || sector.name?.trim().toLowerCase() || String(sector.id)

const SECTOR_IMAGES = {
  '05': '/5.jpg',
  '07': '/prof.png',
  '08': '/1.jpg',
  '09': '/yarmarka.png',
  '10': '/6.png',
  '11': '/cpk.jpg',
  '12': '/ymk.jpg',
  '31': '/3.jpg',
  '35': '/5.jpg',
  '38': '/2.jpg',
  '43': '/6.png',
  '44': '/4.jpg',
  default: '/1.jpg'
}

const getSectorImage = (sector) => {
  const prefix = sector.code?.match(/^\d{2}/)?.[0]
  return sector.image_url || SECTOR_IMAGES[prefix] || SECTOR_IMAGES.default
}

const useFallbackImage = (event) => {
  event.target.src = SECTOR_IMAGES.default
}

const loadSectors = async () => {
  try {
    const response = await fetch('http://localhost:3000/api/sectors')
    const result = await response.json()
    if (result.success) {
      const uniqueSectors = Array.from(
        result.data.reduce((map, sector) => {
          const key = getSectorKey(sector)
          if (!map.has(key)) map.set(key, sector)
          return map
        }, new Map()).values()
      )

      sectors.value = uniqueSectors.slice(0, 9).map(sector => ({
        id: sector.id,
        title: sector.name,
        description: sector.description,
        colleges: sector.colleges_count,
        programs: sector.programs_count,
        image: getSectorImage(sector),
        link: { path: '/sector', query: { sector_id: String(sector.id) } }
      }))
    }
  } catch (error) {
    console.error('Ошибка загрузки секторов:', error)
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  loadSectors()
})
</script>

<style scoped>
.loading {
  text-align: center;
  padding: 40px;
  color: #666;
  font-size: 16px;
}
</style>
