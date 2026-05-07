<template>
  <section class="section map-section">
    <div class="container">
      <div class="section-title">
        <h2>Колледжи на карте Башкортостана</h2>
        <p>Найдите колледжи по всей территории Республики Башкортостан</p>
      </div>

      <div v-if="loading" class="loading-map">
        <i class="fas fa-spinner fa-spin"></i> Загрузка карты...
      </div>

      <div v-else-if="error" class="map-error">
        <p>{{ error }}</p>
        <button class="retry-map-btn" @click="retryLoadMap">Повторить загрузку карты</button>
      </div>

      <div v-else class="map-container">
        <div ref="mapContainer" id="map"></div>
      </div>
    </div>
  </section>
</template>

<script setup>
import { ref, onMounted, onBeforeUnmount, nextTick } from 'vue'
import { loadYandexMaps } from '../utils/yandex-maps'

const mapContainer = ref(null)
const colleges = ref([])
const loading = ref(true)
const error = ref(null)
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api'

let myMap = null
let placemarks = []

const loadCollegesFromAPI = async () => {
  const response = await fetch(`${API_URL}/colleges/map`)
  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${response.statusText}`)
  }

  const result = await response.json()
  if (!result.success) {
    throw new Error(result.error || 'Ошибка получения данных')
  }

  colleges.value = (result.data || []).filter((item) => Array.isArray(item.addresses) && item.addresses.length > 0)
}

const parseCoordinates = (coordsString) => {
  if (!coordsString || typeof coordsString !== 'string') return null

  try {
    const cleaned = coordsString.replace(/[\[\]"'\s]/g, '')
    const parts = cleaned.split(',').map((value) => Number.parseFloat(value.trim()))
    if (parts.length !== 2 || Number.isNaN(parts[0]) || Number.isNaN(parts[1])) return null
    return [parts[0], parts[1]]
  } catch {
    return null
  }
}

const initMap = async () => {
  if (!window.ymaps) {
    throw new Error('Yandex Maps API не доступен')
  }

  myMap = new window.ymaps.Map(mapContainer.value, {
    center: [54.7355, 55.9587],
    zoom: 7,
    controls: ['zoomControl', 'fullscreenControl', 'rulerControl']
  }, {
    searchControlProvider: 'yandex#search'
  })

  colleges.value.forEach((college) => {
    college.addresses.forEach((address) => {
      const coords = parseCoordinates(address.coordinates)
      if (!coords) return

      const isMain = Boolean(address.is_main)
      const placemark = new window.ymaps.Placemark(coords, {
        balloonContentHeader: `<strong style="font-size:14px; color:#0054A6;">${college.name}</strong>`,
        balloonContentBody: `
          <div style="max-width:280px; padding:4px;">
            <p style="margin:6px 0; color:#333; font-size:13px;">
              <strong style="color:#0054A6;">Адрес:</strong><br>
              ${address.address || 'Адрес не указан'}
            </p>
            ${address.phone ? `
              <p style="margin:6px 0; font-size:13px;">
                <strong style="color:#0054A6;">Телефон:</strong><br>
                <a href="tel:${address.phone}" style="color:#0054A6; text-decoration:none;">${address.phone}</a>
              </p>
            ` : ''}
            ${college.city ? `
              <p style="margin:6px 0; font-size:13px;">
                <strong style="color:#0054A6;">Город:</strong><br>
                ${college.city}
              </p>
            ` : ''}
            ${isMain ? '<p style="margin:6px 0; font-size:12px; color:#4CAF50;"><strong>Основной адрес</strong></p>' : ''}
          </div>
        `,
        hintContent: `${college.name}${address.address_name ? ` - ${address.address_name}` : ''}`
      }, {
        preset: isMain ? 'islands#blueEducationCircleIcon' : 'islands#lightBlueCircleIcon',
        iconColor: isMain ? '#0054A6' : '#2196F3'
      })

      myMap.geoObjects.add(placemark)
      placemarks.push(placemark)
    })
  })

  if (placemarks.length > 0) {
    const bounds = myMap.geoObjects.getBounds()
    if (bounds) {
      myMap.setBounds(bounds, {
        checkZoomRange: true,
        zoomMargin: 50,
        duration: 300
      })
    }
  }
}

const destroyMap = () => {
  if (myMap) {
    myMap.destroy()
    myMap = null
  }
  placemarks = []
}

const retryLoadMap = async () => {
  loading.value = true
  error.value = null
  destroyMap()

  try {
    await Promise.all([
      loadYandexMaps(),
      loadCollegesFromAPI()
    ])

    loading.value = false
    await nextTick()
    await new Promise((resolve) => setTimeout(resolve, 100))

    if (!mapContainer.value) {
      throw new Error('Контейнер карты не найден')
    }

    await initMap()
  } catch (err) {
    console.error('Ошибка загрузки карты:', err)
    error.value = 'Не удалось загрузить карту Яндекса. Проверьте интернет, блокировщики и VITE_YANDEX_MAPS_API_KEY, затем нажмите "Повторить загрузку карты".'
    loading.value = false
  }
}

onMounted(async () => {
  await retryLoadMap()
})

onBeforeUnmount(() => {
  destroyMap()
})
</script>

<style scoped>
.map-section {
  padding: 40px 0;
  background: linear-gradient(135deg, #f5f7fa 0%, #e8eef5 100%);
}

.section-title {
  text-align: center;
  margin-bottom: 24px;
}

.section-title h2 {
  font-size: 2rem;
  color: #0054a6;
  margin-bottom: 10px;
  font-weight: 700;
}

.section-title p {
  font-size: 1.1rem;
  color: #666;
}

.loading-map,
.map-error {
  text-align: center;
  padding: 48px 20px;
  color: #666;
  font-size: 16px;
  background: #fff;
  border-radius: 12px;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
}

.map-error {
  color: #d32f2f;
  background: #ffebee;
}

.retry-map-btn {
  margin-top: 14px;
  border: 1px solid #ef4444;
  background: #fff;
  color: #b91c1c;
  padding: 10px 14px;
  border-radius: 8px;
  font-weight: 700;
  cursor: pointer;
  transition: all 0.2s ease;
}

.retry-map-btn:hover {
  background: #fee2e2;
  transform: translateY(-1px);
}

.loading-map i {
  font-size: 2.5rem;
  color: #0054a6;
  margin-bottom: 15px;
  display: block;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
}

.map-container {
  width: 100%;
  height: 600px;
  border-radius: 16px;
  overflow: hidden;
  box-shadow: 0 8px 24px rgba(0, 84, 166, 0.15);
  background: #fff;
}

#map {
  width: 100%;
  height: 100%;
}

@media (max-width: 768px) {
  .map-container {
    height: 400px;
  }

  .section-title h2 {
    font-size: 1.5rem;
  }

  .section-title p {
    font-size: 1rem;
  }
}
</style>
