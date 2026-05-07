<template>
  <div class="colleges-page">
    <!-- Кнопка "Наверх" -->
    <div class="back-to-top" :class="{ visible: showBackToTop }" @click="scrollToTop">
      <i class="fas fa-chevron-up"></i>
    </div>

    <!-- Герой секция -->
    <section class="hero">
      <div class="container">
        <h1>Колледжи Башкортостана</h1>
        <p>Все средние профессиональные учебные заведения Республики Башкортостан с информацией о приеме, программах и участии в федеральных проектах</p>
      </div>
    </section>

    <!-- Полоска флага -->
    <div class="flag-stripe"></div>

    <div class="breadcrumbs">
      <div class="container">
        <router-link to="/">Главная</router-link> >
        <span>Колледжи</span>
      </div>
    </div>

    <!-- Секция колледжей -->
    <section class="section">
      <div class="container">
        <div class="section-title">
          <h2>Все колледжи Башкортостана</h2>
          <p>Найдите подходящий колледж по местоположению, специальностям и программам обучения</p>
        </div>
        
        <!-- Фильтры и поиск -->
        <div class="filters-section">
          <div class="filters-row">
            <div class="filter-group">
              <div class="filter-label">Город/район</div>
              <select v-model="filters.city" class="filter-select" @change="resetPagination">
                <option value="all">Все города</option>
                <option value="Уфа">Уфа</option>
                <option value="Стерлитамак">Стерлитамак</option>
                <option value="Салават">Салават</option>
                <option value="Нефтекамск">Нефтекамск</option>
                <option value="Октябрьский">Октябрьский</option>
                <option value="Белорецк">Белорецк</option>
                <option value="Ишимбай">Ишимбай</option>
                <option value="Кумертау">Кумертау</option>
              </select>
            </div>
            
            <div class="filter-group">
              <div class="filter-label">Направление</div>
              <select v-model="filters.direction" class="filter-select" @change="resetPagination">
                <option value="all">Все направления</option>
                <option value="technical">Технические</option>
                <option value="medical">Медицинские</option>
                <option value="economy">Экономика</option>
                <option value="agriculture">Сельское хозяйство</option>
                <option value="education">Педагогика</option>
                <option value="service">Сфера услуг</option>
              </select>
            </div>
            
            <div class="filter-group">
              <div class="filter-label">Профессионалитет</div>
              <select v-model="filters.professionalitet" class="filter-select" @change="resetPagination">
                <option value="all">Все колледжи</option>
                <option value="yes">Участвует</option>
                <option value="no">Не участвует</option>
              </select>
            </div>

            <div class="filter-group">
              <div class="filter-label">Рейтинг</div>
              <select v-model="filters.minRating" class="filter-select" @change="resetPagination">
                <option value="all">Любой рейтинг</option>
                <option value="5">5 звезд</option>
                <option value="4">От 4 звезд</option>
                <option value="3">От 3 звезд</option>
                <option value="2">От 2 звезд</option>
              </select>
            </div>
            
            <div style="flex: 1;"></div>
            
            <div class="filter-group">
              <div class="filter-label">Показать:</div>
              <select v-model="showCount" class="filter-select" @change="updateShowCount">
                <option value="6">6 колледжей</option>
                <option value="12">12 колледжей</option>
                <option value="24">24 колледжа</option>
                <option value="all">Все колледжи</option>
              </select>
            </div>
          </div>

          <div class="specialty-search-panel single college-search-panel">
            <div class="search-field">
              <label for="college-search">Поиск колледжа</label>
              <div class="search-box">
                <input
                  id="college-search"
                  v-model="searchQuery"
                  type="text"
                  class="search-input"
                  placeholder="Название, город, специальность или отрасль..."
                  @keyup.enter="resetPagination"
                >
              </div>
            </div>

            <button class="search-button standalone" @click="resetPagination">Найти</button>
          </div>
        </div>
        
        <!-- Состояние загрузки -->
        <div v-if="loading" class="loading-state">
          <i class="fas fa-spinner fa-spin"></i> Загрузка колледжей...
        </div>
        
        <!-- Состояние ошибки -->
        <div v-else-if="error" class="error-state">
          <i class="fas fa-exclamation-triangle"></i> {{ error }}
          <button @click="fetchColleges" class="btn-retry">Повторить</button>
        </div>
        
        <!-- Сетка колледжей -->
        <div v-else class="colleges-grid">
          <div 
            v-for="college in colleges" 
            :key="college.id" 
            class="college-card"
            :class="{ professionalitet: college.is_professionalitet }"
          >
            <div class="college-header">
              <img :src="resolveImageUrl(college.logo_image_url)" :alt="college.name" class="college-image">
              <div v-if="college.is_professionalitet" class="professionalitet-badge">
                <i class="fas fa-check-circle"></i> Профессионалитет
              </div>
            </div>
            
            <div class="college-content">
              <h3 class="college-title">{{ college.name }}</h3>

              <div class="college-rating">
                <span class="rating-value">{{ formatRating(college.review_average) }}</span>
                <span class="rating-stars" :aria-label="`Рейтинг ${formatRating(college.review_average)} из 5`">
                  <i
                    v-for="star in 5"
                    :key="star"
                    :class="star <= Math.round(Number(college.review_average || 0)) ? 'fas fa-star' : 'far fa-star'"
                  ></i>
                </span>
                <span class="rating-count">{{ college.review_count || 0 }} отзывов</span>
              </div>
              
              <div class="college-location">
                <i class="fas fa-map-marker-alt"></i> {{ college.city_name || college.city }}
              </div>
              
              <p class="college-description">{{ college.description }}</p>
              
              <div class="admission-stats">
                <div class="stats-title">Статистика приема 2024</div>
                <div class="stats-grid">
                  <div class="stat-item">
                    <div class="stat-value">{{ college.budget_places || 0 }}</div>
                    <div class="stat-label">Бюджетных мест</div>
                  </div>
                  <div class="stat-item">
                    <div class="stat-value">{{ college.commercial_places || 0 }}</div>
                    <div class="stat-label">Коммерческих мест</div>
                  </div>
                  <div class="stat-item">
                    <div class="stat-value">{{ college.avg_score || '—' }}</div>
                    <div class="stat-label">Средний балл аттестата</div>
                  </div>
                  <div class="stat-item">
                    <div class="stat-value">{{ college.min_score || '—' }}</div>
                    <div class="stat-label">Минимальный балл аттестата</div>
                  </div>
                </div>
              </div>
            </div>
            
            <div class="college-footer">
              <button
                v-if="isApplicant"
                type="button"
                class="favorite-btn"
                :class="{ active: isFavoriteCollege(college.id) }"
                @click="toggleFavoriteCollege(college)"
              >
                <i :class="isFavoriteCollege(college.id) ? 'fas fa-heart' : 'far fa-heart'"></i>
                {{ isFavoriteCollege(college.id) ? 'В избранном' : 'В избранное' }}
              </button>
              <router-link :to="`/college/${college.id}`" class="btn-details">Подробнее о колледже</router-link>
            </div>
          </div>
        </div>
        
        <!-- Сообщение если ничего не найдено -->
        <div v-if="!loading && !error && colleges.length === 0" class="no-results">
          <p>😔 По вашему запросу ничего не найдено. Попробуйте изменить фильтры.</p>
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
            v-for="page in visiblePages" 
            :key="page"
            class="pagination-btn"
            :class="{ active: pagination.page === page }"
            @click="changePage(page)"
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
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import axios from 'axios'
import { resolveImageUrl } from '../utils/images'

// API URL
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api'
const router = useRouter()

// Данные
const colleges = ref([])
const loading = ref(false)
const error = ref(null)
const showBackToTop = ref(false)
const favoriteCollegeIds = ref(new Set())
const currentUser = ref(null)

const isApplicant = computed(() => currentUser.value?.role?.name === 'applicant')

// Пагинация
const pagination = ref({
  total: 0,
  page: 1,
  limit: 6,
  totalPages: 0
})

// Фильтры
const filters = ref({
  city: 'all',
  direction: 'all',
  professionalitet: 'all',
  minRating: 'all'
})

const searchQuery = ref('')
const showCount = ref('6')

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
    const ids = (response.data?.data?.colleges || []).map(item => Number(item.id))
    favoriteCollegeIds.value = new Set(ids)
  } catch (err) {
    console.warn('Не удалось загрузить избранные колледжи:', err)
  }
}

const isFavoriteCollege = (collegeId) => favoriteCollegeIds.value.has(Number(collegeId))

const toggleFavoriteCollege = async (college) => {
  const token = getToken()
  if (!token || !isApplicant.value) {
    router.push({ name: 'Login', query: { redirect: `/college/${college.id}` } })
    return
  }

  const id = Number(college.id)
  const nextIds = new Set(favoriteCollegeIds.value)

  try {
    if (nextIds.has(id)) {
      await axios.delete(`${API_URL}/favorites/college/${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      nextIds.delete(id)
    } else {
      await axios.post(`${API_URL}/favorites`, {
        entity_type: 'college',
        entity_id: id
      }, {
        headers: { Authorization: `Bearer ${token}` }
      })
      nextIds.add(id)
    }

    favoriteCollegeIds.value = nextIds
  } catch (err) {
    console.error('Ошибка обновления избранного:', err)
  }
}

// Маппинг направлений на коды секторов
const DIRECTION_SECTORS = {
  'technical': ['08', '07', '15'],        // Технические, строительство, машиностроение
  'medical': ['31', '33', '34'],           // Медицина
  'economy': ['38', '40'],                 // Экономика, управление, право
  'agriculture': ['35', '36'],             // Сельское хозяйство
  'education': ['44'],                      // Образование
  'service': ['43', '19', '29'],           // Сфера услуг
}

// Загрузка колледжей с сервера
const fetchColleges = async () => {
  loading.value = true
  error.value = null

  try {
    const params = new URLSearchParams()

    if (filters.value.city !== 'all') {
      params.append('city', filters.value.city)
    }

    if (filters.value.professionalitet !== 'all') {
      params.append('professionalitet', filters.value.professionalitet)
    }

    if (filters.value.minRating !== 'all') {
      params.append('minRating', filters.value.minRating)
    }

    if (searchQuery.value.trim()) {
      params.append('search', searchQuery.value.trim())
    }

    // Пагинация на сервере
    const limit = showCount.value === 'all' ? 1000 : parseInt(showCount.value)
    params.append('limit', limit)
    params.append('page', pagination.value.page)

    const response = await axios.get(`${API_URL}/colleges?${params.toString()}`)

    if (response.data.success) {
      let filteredColleges = response.data.data

      // Клиентская фильтрация по направлению (через специальности колледжа)
      if (filters.value.direction !== 'all') {
        const sectorCodes = DIRECTION_SECTORS[filters.value.direction] || []
        filteredColleges = filteredColleges.filter(college => {
          if (!college.specialties || college.specialties.length === 0) return false
          // Проверяем, есть ли среди специальностей колледжа относящиеся к выбранному направлению
          return college.specialties.some(spec => {
            if (!spec.code) return false
            const prefix = spec.code.substring(0, 2)
            return sectorCodes.some(code => prefix === code || code.startsWith(prefix))
          })
        })
      }

      colleges.value = filteredColleges
      
      // Обновляем пагинацию только если нет клиентской фильтрации по направлению
      if (filters.value.direction === 'all') {
        pagination.value = response.data.pagination
      } else {
        // При фильтрации по направлению обновляем общее количество
        pagination.value.total = filteredColleges.length
        pagination.value.totalPages = Math.ceil(filteredColleges.length / limit)
      }
    } else {
      throw new Error(response.data.error || 'Ошибка загрузки данных')
    }
  } catch (err) {
    console.error('Ошибка при загрузке колледжей:', err)
    error.value = err.message || 'Не удалось загрузить колледжи'
    colleges.value = []
  } finally {
    loading.value = false
  }
}

// Видимые страницы для пагинации
const visiblePages = computed(() => {
  const pages = []
  const total = pagination.value.totalPages
  const current = pagination.value.page
  
  if (total <= 7) {
    for (let i = 1; i <= total; i++) pages.push(i)
  } else {
    if (current <= 4) {
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
  }
  
  return pages
})

// Методы
const updateShowCount = () => {
  pagination.value.page = 1
  pagination.value.limit = showCount.value === 'all' ? 1000 : parseInt(showCount.value)
  fetchColleges()
}

const changePage = (page) => {
  if (page >= 1 && page <= pagination.value.totalPages) {
    pagination.value.page = page
    fetchColleges()
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }
}

// Сброс пагинации при изменении фильтров
const resetPagination = () => {
  pagination.value.page = 1
  fetchColleges()
}

const scrollToTop = () => {
  window.scrollTo({ top: 0, behavior: 'smooth' })
}

const formatRating = (value) => {
  const rating = Number(value || 0)
  return rating.toFixed(1)
}

const handleScroll = () => {
  showBackToTop.value = window.pageYOffset > 300
}

// Хуки жизненного цикла
onMounted(() => {
  syncCurrentUser()
  window.addEventListener('scroll', handleScroll)
  Promise.all([fetchColleges(), loadFavorites()])
})

onUnmounted(() => {
  window.removeEventListener('scroll', handleScroll)
})
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
  margin-left: 15px;
}

.college-rating {
  display: flex;
  align-items: center;
  gap: 8px;
  margin: 8px 0 10px;
  color: var(--text-light);
  font-size: 0.95rem;
}

.rating-value {
  font-weight: 800;
  color: var(--text-dark);
}

.rating-stars {
  display: inline-flex;
  gap: 3px;
  color: #f59e0b;
}

.rating-count {
  white-space: nowrap;
}

/* Стили для пагинации */
.pagination {
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 8px;
  margin-top: 40px;
  padding: 20px 0;
}

.pagination-btn {
  min-width: 40px;
  height: 40px;
  padding: 0 12px;
  border: 2px solid var(--primary-blue);
  background: white;
  color: var(--primary-blue);
  border-radius: 8px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s ease;
  display: flex;
  align-items: center;
  justify-content: center;
}

.pagination-btn:hover:not(.disabled):not(.active) {
  background: var(--primary-blue);
  color: white;
}

.pagination-btn.active {
  background: var(--primary-blue);
  color: white;
}

.pagination-btn.disabled {
  opacity: 0.4;
  cursor: not-allowed;
  border-color: #cbd5e1;
  color: #94a3b8;
}

.pagination-btn.disabled:hover {
  background: white;
  color: #94a3b8;
}
</style>
