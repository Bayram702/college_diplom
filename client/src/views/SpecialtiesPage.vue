<template>
  <div class="specialties-page">
    <!-- Герой секция -->
    <section class="hero">
      <div class="container">
        <h1>Специальности колледжей Башкортостана</h1>
        <p>Все направления подготовки среднего профессионального образования в Республике Башкортостан. Выберите свою будущую профессию!</p>
      </div>
    </section>

    <div class="flag-stripe"></div>

    <div class="breadcrumbs">
      <div class="container">
        <router-link to="/">Главная</router-link> >
        <span>Специальности</span>
      </div>
    </div>

    <!-- Секция специальностей -->
    <section class="section">
      <div class="container">
        <div class="section-title">
          <h2>Все специальности СПО</h2>
          <p>Выберите направление подготовки по отраслям или найдите специальность по названию или коду</p>
        </div>
        
        <!-- Фильтры по отраслям -->
        <div class="filters-section">
          <button
            class="filters-toggle"
            type="button"
            @click="isSectorFilterOpen = !isSectorFilterOpen"
            :aria-expanded="isSectorFilterOpen"
          >
            <span>Фильтр по отраслям</span>
            <i :class="isSectorFilterOpen ? 'fas fa-chevron-up' : 'fas fa-chevron-down'"></i>
          </button>
          
          <Splide
            v-show="isSectorFilterOpen"
            class="sector-filter-carousel"
            :options="sectorCarouselOptions"
            aria-label="Фильтр специальностей по отраслям"
          >
            <SplideSlide v-for="sector in sectors" :key="sector.id">
              <button
                type="button"
                class="sector-filter-card"
                :class="{ active: activeSector === sector.id }"
                @click="filterBySector(sector.id)"
              >
                <div class="sector-icon"><i :class="sector.icon"></i></div>
                <div class="sector-name">{{ sector.name }}</div>
                <div class="sector-code" v-if="sector.code">{{ sector.code }}</div>
              </button>
            </SplideSlide>
          </Splide>
          
          <div class="specialty-search-panel single">
            <div class="search-field">
              <label for="specialty-search">Поиск специальности</label>
              <div class="search-box">
                <input 
                  id="specialty-search"
                  v-model="searchQuery" 
                  type="text" 
                  class="search-input" 
                  placeholder="Название или код специальности..."
                  @input="debouncedSearch"
                  @keyup.enter="resetPagination"
                >
              </div>
            </div>

            <button class="search-button standalone" @click="resetPagination">Найти</button>
          </div>

          <div class="filters-row compact">
            <div class="filter-group">
              <div class="filter-label">Показать:</div>
              <select v-model="showCount" class="filter-select" @change="updateShowCount">
                <option value="6">6 специальностей</option>
                <option value="12">12 специальностей</option>
                <option value="24">24 специальности</option>
                <option value="all">Все специальности</option>
              </select>
            </div>
          </div>
        </div>
        
        <!-- Состояние загрузки -->
        <div v-if="loading" class="loading-state">
          <i class="fas fa-spinner fa-spin"></i> Загрузка специальностей...
        </div>
        
        <!-- Состояние ошибки -->
        <div v-else-if="error" class="error-state">
          <i class="fas fa-exclamation-triangle"></i> {{ error }}
          <button @click="fetchSpecialties" class="btn-retry">Повторить</button>
        </div>
        
        <!-- Сетка специальностей -->
        <div v-else class="specialties-grid">
          <div 
            v-for="specialty in filteredSpecialties" 
            :key="specialty.id" 
            class="specialty-card"
          >
            <div class="specialty-header">
              <div class="specialty-code">{{ specialty.code }}</div>
              <h3 class="specialty-name">{{ specialty.name }}</h3>
            </div>
            
            <div class="specialty-content">
              <p class="specialty-description">{{ specialty.description }}</p>
              
              <div class="average-score-container">
                <span class="score-label">Средний балл аттестата:</span>
                <span class="score-value">{{ specialty.avg_score || '—' }}</span>
              </div>
            </div>
            
            <div class="specialty-footer">
              <button
                v-if="isApplicant"
                type="button"
                class="favorite-btn"
                :class="{ active: isFavoriteSpecialty(specialty.id) }"
                @click="toggleFavoriteSpecialty(specialty)"
              >
                <i :class="isFavoriteSpecialty(specialty.id) ? 'fas fa-heart' : 'far fa-heart'"></i>
                {{ isFavoriteSpecialty(specialty.id) ? 'В избранном' : 'В избранное' }}
              </button>
              <router-link :to="`/specialty/${specialty.id}`" class="specialty-details-btn">
                Подробнее о специальности
              </router-link>
            </div>
          </div>
        </div>
        
        <!-- Сообщение, если ничего не найдено -->
        <div v-if="!loading && !error && filteredSpecialties.length === 0" class="no-results">
          <p>😔 По вашему запросу ничего не найдено. Попробуйте изменить фильтры или поисковый запрос.</p>
        </div>

        <!-- Пагинация -->
        <div v-if="!loading && !error && pagination.totalPages > 1" class="pagination">
          <button 
            class="pagination-btn" 
            :class="{ disabled: pagination.page === 1 }"
            @click="changePage(pagination.page - 1)"
            :disabled="pagination.page === 1"
          >
            <i class="fas fa-chevron-left"></i>
          </button>
          
          <button 
            v-for="(page, index) in visiblePages" 
            :key="`${page}-${index}`"
            class="pagination-btn"
            :class="{ active: pagination.page === page, disabled: page === '...' }"
            @click="changePage(page)"
            :disabled="page === '...'"
          >
            {{ page }}
          </button>
          
          <button 
            class="pagination-btn" 
            :class="{ disabled: pagination.page === pagination.totalPages }"
            @click="changePage(pagination.page + 1)"
            :disabled="pagination.page === pagination.totalPages"
          >
            <i class="fas fa-chevron-right"></i>
          </button>
        </div>
      </div>
    </section>

    <!-- Секция статистики (можно тоже загружать из БД) -->
    <section class="stats-section">
      <div class="container">
        <div class="section-title" style="color: white;">
          <h2>Статистика по специальностям</h2>
          <p>Актуальные данные по среднему профессиональному образованию в Республике Башкортостан</p>
        </div>
        
        <div class="stats-grid">
          <div class="stat-card" v-for="stat in stats" :key="stat.id">
            <div class="stat-card-value">{{ stat.value }}</div>
            <div class="stat-card-label">{{ stat.label }}</div>
          </div>
        </div>
      </div>
    </section>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import axios from 'axios'
import { useRoute, useRouter } from 'vue-router'
import { Splide, SplideSlide } from '@splidejs/vue-splide'
import '@splidejs/vue-splide/css'

// API URL
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api'
const route = useRoute()
const router = useRouter()

// Отрасли загружаются с сервера
const sectors = ref([
  { id: 'all', name: 'Все специальности', icon: 'fas fa-th-large', code: '' }
])

const SECTOR_ICONS = {
  '08': 'fas fa-cogs', '09': 'fas fa-laptop-code', '07': 'fas fa-building',
  '31': 'fas fa-stethoscope', '38': 'fas fa-chart-line', '44': 'fas fa-chalkboard-teacher',
  '43': 'fas fa-utensils', '35': 'fas fa-seedling', '15': 'fas fa-industry',
  'default': 'fas fa-folder'
}

const loadSectors = async () => {
  try {
    const response = await fetch(`${API_URL}/sectors`)
    const result = await response.json()
    if (result.success) {
      const sectorCards = result.data.map(s => ({
        id: String(s.id),
        name: s.name,
        icon: SECTOR_ICONS[s.code?.substring(0, 2)] || SECTOR_ICONS.default,
        code: s.code
      }))
      // Полностью заменяем массив, чтобы избежать дубликатов
      sectors.value = [
        { id: 'all', name: 'Все специальности', icon: 'fas fa-th-large', code: '' },
        ...sectorCards
      ]
    }
  } catch (error) {
    console.error('Ошибка загрузки отраслей:', error)
  }
}

// Состояния
const activeSector = ref('all')
const searchQuery = ref('')
const specialties = ref([])
const loading = ref(false)
const error = ref(null)
const isSectorFilterOpen = ref(true)
const showCount = ref('6')
const currentUser = ref(null)
const favoriteSpecialtyIds = ref(new Set())
const isApplicant = computed(() => currentUser.value?.role?.name === 'applicant')

const pagination = ref({
  total: 0,
  page: 1,
  limit: 6,
  totalPages: 0
})

// Статистика из БД
const stats = ref([
  { id: 1, value: '—', label: 'Специальностей СПО' },
  { id: 2, value: '—', label: 'Колледжей и техникумов' },
  { id: 3, value: '—', label: 'Средний балл по всем специальностям' }
])

const getToken = () => localStorage.getItem('authToken')

const syncCurrentUser = () => {
  try {
    const raw = localStorage.getItem('user')
    currentUser.value = raw ? JSON.parse(raw) : null
  } catch {
    currentUser.value = null
  }
}

const loadFavorites = async () => {
  if (!isApplicant.value) return
  const token = getToken()
  if (!token) return

  try {
    const response = await axios.get(`${API_URL}/favorites`, {
      headers: { Authorization: `Bearer ${token}` }
    })
    const ids = (response.data?.data?.specialties || []).map(item => Number(item.id))
    favoriteSpecialtyIds.value = new Set(ids)
  } catch (error) {
    console.warn('Не удалось загрузить избранные специальности:', error)
  }
}

const isFavoriteSpecialty = (specialtyId) => favoriteSpecialtyIds.value.has(Number(specialtyId))

const toggleFavoriteSpecialty = async (specialty) => {
  const token = getToken()
  if (!token || !isApplicant.value) {
    router.push({ name: 'Login', query: { redirect: `/specialty/${specialty.id}` } })
    return
  }

  const id = Number(specialty.id)
  const nextIds = new Set(favoriteSpecialtyIds.value)

  try {
    if (nextIds.has(id)) {
      await axios.delete(`${API_URL}/favorites/specialty/${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      nextIds.delete(id)
    } else {
      await axios.post(`${API_URL}/favorites`, {
        entity_type: 'specialty',
        entity_id: id
      }, {
        headers: { Authorization: `Bearer ${token}` }
      })
      nextIds.add(id)
    }

    favoriteSpecialtyIds.value = nextIds
  } catch (error) {
    console.error('Ошибка обновления избранного:', error)
  }
}

const loadStats = async () => {
  try {
    const response = await fetch(`${API_URL}/colleges/stats`)
    const result = await response.json()
    if (result.success) {
      const { colleges, specialties: specStats } = result.data
      stats.value = [
        { id: 1, value: specStats.total_specialties || '—', label: 'Специальностей СПО' },
        { id: 2, value: colleges.active_colleges || '—', label: 'Колледжей и техникумов' },
        { id: 3, value: specStats.avg_score_last_year || '—', label: 'Средний балл по всем специальностям' }
      ]
    }
  } catch (error) {
    console.error('Ошибка загрузки статистики:', error)
  }
}

// Загрузка специальностей с сервера
const fetchSpecialties = async () => {
  loading.value = true
  error.value = null

  try {
    const params = new URLSearchParams()
    if (activeSector.value !== 'all') {
      params.append('sector_id', activeSector.value)
    }
    if (searchQuery.value.trim()) {
      params.append('search', searchQuery.value.trim())
    }
    const limit = showCount.value === 'all' ? 1000 : parseInt(showCount.value)
    params.append('limit', limit)
    params.append('page', pagination.value.page)

    const response = await axios.get(`${API_URL}/specialties?${params.toString()}`)

    if (response.data.success) {
      specialties.value = response.data.data
      pagination.value = response.data.pagination || {
        total: response.data.data.length,
        page: 1,
        limit,
        totalPages: 1
      }
    } else {
      throw new Error(response.data.error || 'Ошибка загрузки данных')
    }
  } catch (err) {
    console.error('Ошибка при загрузке специальностей:', err)
    error.value = err.message || 'Не удалось загрузить специальности'
    specialties.value = []
  } finally {
    loading.value = false
  }
}

// Фильтрация на клиенте
const filteredSpecialties = computed(() => specialties.value)

const visiblePages = computed(() => {
  const pages = []
  const total = pagination.value.totalPages
  const current = pagination.value.page
  
  if (total <= 7) {
    for (let i = 1; i <= total; i++) pages.push(i)
  } else if (current <= 4) {
    for (let i = 1; i <= 5; i++) pages.push(i)
    pages.push('...')
    pages.push(total)
  } else if (current >= total - 3) {
    pages.push(1)
    pages.push('...')
    for (let i = total - 4; i <= total; i++) pages.push(i)
  } else {
    pages.push(1)
    pages.push('...')
    for (let i = current - 1; i <= current + 1; i++) pages.push(i)
    pages.push('...')
    pages.push(total)
  }
  
  return pages
})

// Фильтр по отрасли
const filterBySector = (sectorId) => {
  activeSector.value = String(sectorId)
  pagination.value.page = 1
  if (activeSector.value === 'all') {
    router.replace({ query: { ...route.query, sector_id: undefined } })
  } else {
    router.replace({ query: { ...route.query, sector_id: activeSector.value } })
  }
  fetchSpecialties()
}

const sectorCarouselOptions = {
  type: 'slide',
  perPage: 4,
  perMove: 1,
  gap: '16px',
  pagination: false,
  arrows: true,
  drag: 'free',
  snap: true,
  breakpoints: {
    1100: { perPage: 3 },
    760: { perPage: 2 },
    520: { perPage: 1 }
  }
}

const syncSectorFromRoute = () => {
  const routeSectorId = route.query.sector_id
  activeSector.value = routeSectorId ? String(routeSectorId) : 'all'
}

// Дебаунс для поиска
let searchTimeout = null
const debouncedSearch = () => {
  clearTimeout(searchTimeout)
  searchTimeout = setTimeout(() => {
    resetPagination()
  }, 300)
}

const updateShowCount = () => {
  pagination.value.page = 1
  pagination.value.limit = showCount.value === 'all' ? 1000 : parseInt(showCount.value)
  fetchSpecialties()
}

const changePage = (page) => {
  if (page === '...' || page < 1 || page > pagination.value.totalPages) return
  pagination.value.page = page
  fetchSpecialties()
  window.scrollTo({ top: 0, behavior: 'smooth' })
}

const resetPagination = () => {
  pagination.value.page = 1
  fetchSpecialties()
}

// Загрузка при монтировании
onMounted(async () => {
  syncCurrentUser()
  syncSectorFromRoute()
  await Promise.all([loadSectors(), loadStats(), loadFavorites()])
  fetchSpecialties()
})

watch(
  () => route.query.sector_id,
  (newSectorId) => {
    const normalized = newSectorId ? String(newSectorId) : 'all'
    if (normalized === activeSector.value) return
    activeSector.value = normalized
    fetchSpecialties()
  }
)
</script>

<style scoped>
.loading-state,
.error-state {
  text-align: center;
  padding: 60px 20px;
  color: var(--text-light);
  font-size: 1.1rem;
}

.loading-state i {
  font-size: 2rem;
  color: var(--primary-blue);
  margin-right: 10px;
}

.error-state {
  color: var(--danger);
}

.error-state i {
  font-size: 1.5rem;
  margin-right: 10px;
}

.btn-retry {
  margin-top: 15px;
  padding: 10px 20px;
  background: var(--primary-blue);
  color: white;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.3s;
}

.btn-retry:hover {
  background: var(--dark-blue);
}

.no-results {
  text-align: center;
  padding: 60px 20px;
  color: var(--text-light);
  font-size: 1.1rem;
  background: white;
  border-radius: 12px;
  margin-top: 20px;
}
</style>
