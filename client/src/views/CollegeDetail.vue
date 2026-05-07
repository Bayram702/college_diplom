<template>
  <div class="college-detail-page">
    <!-- Кнопка "Наверх" -->
    <div class="back-to-top" :class="{ visible: showBackToTop }" @click="scrollToTop">
      <i class="fas fa-chevron-up"></i>
    </div>

    <!-- Состояние загрузки -->
    <div v-if="loading" class="loading-state">
      <i class="fas fa-spinner fa-spin"></i> Загрузка информации о колледже...
    </div>
    
    <!-- Состояние ошибки -->
    <div v-else-if="error" class="error-state">
      <i class="fas fa-exclamation-triangle"></i> {{ error }}
      <button @click="fetchCollege" class="btn-retry">Повторить</button>
    </div>

    <!-- Контент (показываем только если данные загружены) -->
    <template v-else-if="college">
      <!-- Путь по сайту -->
      <div class="breadcrumbs">
        <div class="container">
          <router-link to="/">Главная</router-link> > 
          <router-link to="/colleges">Колледжи</router-link> > 
          <span>{{ college.name }}</span>
        </div>
      </div>

      <!-- Заголовок колледжа -->
      <section class="college-header">
        <div class="container">
          <div class="header-content">
            <div class="header-info">
              <h1>{{ college.name }}</h1>
              <p v-if="college.city" class="header-city">
                <i class="fas fa-map-marker-alt"></i> {{ college.city }}
              </p>
              <button
                v-if="isApplicant"
                type="button"
                class="favorite-btn detail-favorite-btn"
                :class="{ active: isFavoriteCollege }"
                @click="toggleFavoriteCollege"
              >
                <i :class="isFavoriteCollege ? 'fas fa-heart' : 'far fa-heart'"></i>
                {{ isFavoriteCollege ? 'В избранном' : 'В избранное' }}
              </button>
            </div>
          </div>
        </div>
      </section>

      <div class="flag-stripe"></div>

      <!-- Основной контент -->
      <div class="container">
        <!-- Карусель фотографий (если есть) -->
        <section v-if="college.photos && college.photos.length > 0" class="photo-carousel">
          <div class="carousel-container">
            <div 
              v-for="(photo, index) in college.photos" 
              :key="index"
              class="carousel-slide"
              :class="{ active: currentSlide === index }"
            >
              <img :src="resolveImageUrl(photo.image || photo.image_url || photo.url)" :alt="photo.title">
              <div class="carousel-caption">
                <h3>{{ photo.title }}</h3>
                <p>{{ photo.description }}</p>
              </div>
            </div>
            
            <button class="carousel-btn carousel-prev" @click="prevSlide">❮</button>
            <button class="carousel-btn carousel-next" @click="nextSlide">❯</button>
            
            <div class="carousel-nav">
              <div 
                v-for="(photo, index) in college.photos" 
                :key="index"
                class="carousel-dot"
                :class="{ active: currentSlide === index }"
                @click="goToSlide(index)"
              ></div>
            </div>
          </div>
        </section>

        <!-- Перечень специальностей -->
        <section v-if="college.specialties && college.specialties.length > 0" class="section">
          <div class="section-title">
            <h2>Специальности</h2>
          </div>
          <div class="table-container">
            <table class="specialties-table">
              <thead>
                <tr>
                  <th>Код</th>
                  <th>Специальность</th>
                  <th>Вступительные экзамены</th>
                  <th>База</th>
                  <th>Стоимость (руб/год)</th>
                  <th>Бюджет/Коммерция</th>
                  <th>Ср. балл</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="specialty in college.specialties" :key="specialty.id">
                  <td>{{ specialty.code }}</td>
                  <td>
                    <router-link :to="`/specialty/${specialty.id}`">
                      {{ specialty.name }}
                    </router-link>
                  </td>
                  <td>{{ specialty.exams || '—' }}</td>
                  <td>{{ formatBase(specialty.base_education) }}</td>
                  <td>{{ formatPrice(specialty.price_per_year) }}</td>
                  <td>{{ specialty.budget_places || 0 }}/{{ specialty.commercial_places || 0 }}</td>
                  <td>{{ specialty.avg_score || specialty.avg_score_last_year || '—' }}</td>
                </tr>
              </tbody>
            </table>
          </div>
          <div style="margin-top: 20px;">
            <p><strong>Примечание:</strong> В столбце "Бюджет/Коммерция" указано количество бюджетных/коммерческих мест.</p>
          </div>
        </section>

        <!-- Краткая статистика -->
        <section v-if="college.statistics" class="section">
          <div class="section-title">
            <h2>Статистика приема 2025</h2>
          </div>
          <div class="stats-grid">
            <div class="stat-item" v-for="stat in college.statistics" :key="stat.label">
              <div class="stat-value">{{ stat.value }}</div>
              <div class="stat-label">{{ stat.label }}</div>
            </div>
          </div>
        </section>

        <!-- Перечень профессий -->
        <section v-if="careers.length > 0" class="section">
          <div class="section-title">
            <h2>Кем можно работать после обучения</h2>
          </div>
          <div class="info-card no-image">
            <div class="info-card-content">
              <ul class="list-items">
                <li v-for="(career, index) in careers" :key="index">
                  <i class="fas fa-briefcase"></i> {{ career }}
                </li>
              </ul>
            </div>
          </div>
        </section>

        <!-- Возможности в колледже -->
        <section v-if="opportunities.length > 0" class="section">
          <div class="section-title">
            <h2>Возможности в колледже</h2>
          </div>
          <div class="info-card no-image">
            <div class="info-card-content">
              <ul class="list-items">
                <li v-for="(item, index) in opportunities" :key="index">
                  <i class="fas fa-star"></i> {{ item }}
                </li>
              </ul>
            </div>
          </div>
        </section>

        <!-- Перечень работодателей -->
        <section v-if="college.employers && college.employers.length > 0" class="section">
          <div class="section-title">
            <h2>Работодатели-партнеры</h2>
          </div>
          <div class="info-card no-image">
            <div class="info-card-content">
              <ul class="list-items">
                <li v-for="(employer, index) in college.employers" :key="index">
                  <i class="fas fa-industry"></i> {{ employer }}
                </li>
              </ul>
            </div>
          </div>
        </section>

        <!-- Учебные мастерские и лаборатории -->
        <section v-if="college.workshops && college.workshops.length > 0" class="section">
          <div class="section-title">
            <h2>Учебные мастерские и лаборатории</h2>
          </div>
          <div class="info-card no-image">
            <div class="info-card-content">
              <ul class="list-items">
                <li v-for="(workshop, index) in college.workshops" :key="index">
                  <i class="fas fa-flask"></i> {{ workshop }}
                </li>
              </ul>
            </div>
          </div>
        </section>

        <!-- Программы для людей с ОВЗ -->
        <section v-if="college.ovzPrograms && college.ovzPrograms.length > 0" class="section">
          <div class="section-title">
            <h2>Программы для людей с ОВЗ</h2>
          </div>
          <div class="info-card no-image">
            <div class="info-card-content">
              <p>Колледж создает специальные условия для получения образования лицами с ограниченными возможностями здоровья:</p>
              <ul class="list-items">
                <li v-for="(item, index) in college.ovzPrograms" :key="index">
                  <i class="fas fa-universal-access"></i> {{ item }}
                </li>
              </ul>
            </div>
          </div>
        </section>

        <!-- Адреса расположения -->
        <section v-if="college.campuses && college.campuses.length > 0" class="section">
          <div class="section-title">
            <h2>Адреса расположения</h2>
          </div>
          <div class="info-grid">
            <div class="info-card" v-for="(campus, index) in college.campuses" :key="index">
              <img :src="campus.image" :alt="campus.name" class="info-card-image" v-if="campus.image">
              <div class="info-card-content">
                <h3><i class="fas fa-map-marker-alt"></i> {{ campus.name }}</h3>
                <p>{{ campus.address }}</p>
                <p v-if="campus.phone">Телефон: {{ campus.phone }}</p>
                <p v-if="campus.email">Email: {{ campus.email }}</p>
                <p v-if="campus.is_main" style="color: #4CAF50; font-weight: bold; margin-top: 8px;">✓ Главный корпус</p>
              </div>
            </div>
          </div>

          <!-- Карта с метками -->
          <div class="map-container" style="margin-top: 40px;">
            <div v-if="mapLoading" class="map-loading">
              <i class="fas fa-spinner fa-spin"></i> Загрузка карты...
            </div>
            <div v-else-if="mapError" class="map-error">
              <i class="fas fa-exclamation-triangle"></i> {{ mapError }}
            </div>
            <div v-else id="college-map"></div>
          </div>
        </section>

        <section v-if="collegeContactItems.length > 0" class="section">
          <div class="section-title">
            <h2>Связь с колледжем</h2>
          </div>
          <div class="sources-grid">
            <a
              v-for="item in collegeContactItems"
              :key="item.key"
              :href="item.href"
              :target="item.target"
              :rel="item.target === '_blank' ? 'noopener noreferrer' : null"
              class="source-card"
            >
              <span class="source-label">{{ item.label }}</span>
              <span class="source-url">{{ item.value }}</span>
            </a>
          </div>
        </section>

        <!-- Онлайн-подача заявлений -->
        <section class="section reviews-section">
          <div class="section-title reviews-title">
            <h2>Отзывы абитуриентов</h2>
            <div class="reviews-summary">
              <span class="summary-rating">{{ reviewSummary.average || '0.0' }}</span>
              <span class="summary-stars" :aria-label="`Средняя оценка ${reviewSummary.average} из 5`">
                <i
                  v-for="star in 5"
                  :key="star"
                  :class="star <= Math.round(reviewSummary.average || 0) ? 'fas fa-star' : 'far fa-star'"
                ></i>
              </span>
              <span class="summary-count">{{ reviewSummary.total }} отзывов</span>
            </div>
          </div>

          <div v-if="reviewMessage" :class="['application-notice', `is-${reviewMessageType}`]">
            {{ reviewMessage }}
          </div>

          <form v-if="isApplicant" class="review-form" @submit.prevent="submitReview">
            <div class="review-rating-picker" aria-label="Оценка колледжа">
              <button
                v-for="star in 5"
                :key="star"
                type="button"
                class="star-button"
                :class="{ active: star <= reviewForm.rating }"
                @click="reviewForm.rating = star"
                :aria-label="`${star} из 5`"
              >
                <i :class="star <= reviewForm.rating ? 'fas fa-star' : 'far fa-star'"></i>
              </button>
            </div>

            <textarea
              v-model="reviewForm.text"
              class="form-control review-textarea"
              rows="4"
              maxlength="1200"
              placeholder="Расскажите, что было полезно узнать о колледже, поступлении, атмосфере или обучении."
            ></textarea>

            <div class="review-form-footer">
              <span class="review-hint">{{ reviewForm.text.length }}/1200</span>
              <button class="btn-primary review-submit" type="submit" :disabled="submittingReview">
                {{ submittingReview ? 'Отправка...' : 'Оставить отзыв' }}
              </button>
            </div>
          </form>

          <div v-else class="review-login-hint">
            <router-link :to="{ name: 'Login', query: { redirect: route.fullPath } }">Войдите как абитуриент</router-link>, чтобы оставить отзыв.
          </div>

          <div v-if="loadingReviews" class="loading-state reviews-loading">Загрузка отзывов...</div>

          <div v-else-if="reviews.length === 0" class="empty-reviews">
            Пока нет отзывов. Будьте первым, кто поделится впечатлениями.
          </div>

          <div v-else class="reviews-list">
            <article v-for="review in reviews" :key="review.id" class="review-card">
              <div class="review-card-header">
                <div>
                  <h3>{{ review.author_name || 'Абитуриент' }}</h3>
                  <span class="review-date">{{ formatDate(review.created_at) }}</span>
                </div>
                <div class="review-stars" :aria-label="`${review.rating} из 5`">
                  <i
                    v-for="star in 5"
                    :key="star"
                    :class="star <= review.rating ? 'fas fa-star' : 'far fa-star'"
                  ></i>
                </div>
              </div>
              <p>{{ review.text }}</p>
            </article>
          </div>
        </section>

        <section v-if="college.specialties && college.specialties.length > 0" class="section application-section">
          <h2 class="application-title">Готовы стать студентом нашего колледжа?</h2>
          <p class="application-description">
            Подайте заявление онлайн через портал. Подача доступна только авторизованным абитуриентам.
          </p>

          <p
            v-if="applicationSectionMessage"
            :class="['application-notice', `is-${applicationSectionType}`]"
          >
            {{ applicationSectionMessage }}
          </p>

          <p v-if="isApplicant" class="application-limit-hint">
            Подано заявок: {{ applicantApplicationsStats.total }} из {{ applicantApplicationsStats.limit }}
          </p>

          <div class="application-actions">
            <button
              class="btn-primary apply-btn"
              @click="openApplicationModal"
              :disabled="(isAuthenticated && !isApplicant) || (isApplicant && isApplicationsLimitReached)"
            >
              {{
                !isAuthenticated
                  ? 'Войти и подать заявление'
                  : !isApplicant
                    ? 'Подача доступна только абитуриентам'
                    : isApplicationsLimitReached
                      ? 'Достигнут лимит в 5 заявок'
                      : 'Подать заявление онлайн'
              }}
            </button>

            <a
              v-if="college.admission_url"
              :href="college.admission_url"
              target="_blank"
              rel="noopener noreferrer"
              class="btn-secondary external-admission-link"
            >
              Сайт приёмной комиссии
            </a>
          </div>
        </section>

      </div>

      <div
        v-if="showApplicationModal"
        class="application-modal-overlay"
        @click.self="closeApplicationModal"
      >
        <div class="application-modal">
          <div class="application-modal-header">
            <h3>Подача заявления</h3>
            <button class="application-close" @click="closeApplicationModal">&times;</button>
          </div>

          <p class="application-counter">
            Подано заявок: {{ applicantApplicationsStats.total }} из {{ applicantApplicationsStats.limit }}.
            Осталось: {{ applicantApplicationsStats.remaining }}.
          </p>

          <p v-if="applicationModalError" class="application-notice is-error">{{ applicationModalError }}</p>

          <form @submit.prevent="submitApplication" class="application-form">
            <div class="application-form-grid">
              <div class="form-group">
                <label>ФИО абитуриента <span class="required">*</span></label>
                <input
                  v-model="applicationForm.applicant_name"
                  type="text"
                  class="form-control"
                  placeholder="Иванов Иван Иванович"
                >
                <p v-if="applicationFormErrors.applicant_name" class="field-error">
                  {{ applicationFormErrors.applicant_name }}
                </p>
              </div>

              <div class="form-group">
                <label>Телефон <span class="required">*</span></label>
                <input
                  v-model="applicationForm.phone"
                  @input="onApplicationPhoneInput"
                  type="tel"
                  class="form-control"
                  placeholder="+7 (999) 123-45-67"
                >
                <p v-if="applicationFormErrors.phone" class="field-error">
                  {{ applicationFormErrors.phone }}
                </p>
              </div>
            </div>

            <div class="application-form-grid">
              <div class="form-group">
                <label>Email <span class="required">*</span></label>
                <input
                  v-model="applicationForm.email"
                  type="email"
                  class="form-control"
                  placeholder="example@mail.ru"
                >
                <p v-if="applicationFormErrors.email" class="field-error">
                  {{ applicationFormErrors.email }}
                </p>
              </div>

              <div class="form-group">
                <label>Средний балл <span class="required">*</span></label>
                <input
                  v-model="applicationForm.avg_score"
                  type="number"
                  class="form-control"
                  min="2"
                  max="5"
                  step="0.01"
                  placeholder="4.25"
                >
                <p v-if="applicationFormErrors.avg_score" class="field-error">
                  {{ applicationFormErrors.avg_score }}
                </p>
              </div>
            </div>

            <div class="form-group">
              <label>Выбранная специальность <span class="required">*</span></label>
              <select v-model="applicationForm.specialty_id" class="form-control">
                <option value="">Выберите специальность</option>
                <option v-for="item in applicationSpecialties" :key="item.id" :value="item.id">
                  {{ item.code }} — {{ item.name }}
                </option>
              </select>
              <p v-if="applicationFormErrors.specialty_id" class="field-error">
                {{ applicationFormErrors.specialty_id }}
              </p>
            </div>

            <div class="form-group checkbox-group">
              <label class="checkbox-label">
                <input v-model="applicationForm.needs_dormitory" type="checkbox">
                <span>Требуется общежитие</span>
              </label>
            </div>

            <div class="application-submit-row">
              <button type="button" class="btn-secondary" @click="closeApplicationModal">
                Отмена
              </button>
              <button
                type="submit"
                class="btn-primary"
                :disabled="submittingApplication || isApplicationsLimitReached || loadingApplicantApplications"
              >
                {{
                  submittingApplication
                    ? 'Отправка...'
                    : isApplicationsLimitReached
                      ? 'Лимит заявок исчерпан'
                      : 'Отправить заявление'
                }}
              </button>
            </div>
          </form>
        </div>
      </div>
    </template>
  </div>
</template>

<script setup>
import { computed, ref, onMounted, onUnmounted, nextTick, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import axios from 'axios'
import { formatRussianPhone, maskRussianPhoneInput, normalizeRussianPhone } from '../utils/phone'
import { loadYandexMaps as loadYandexMapsApi } from '../utils/yandex-maps'
import { resolveImageUrl } from '../utils/images'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api'
const route = useRoute()
const router = useRouter()

// Состояния
const college = ref(null)
const loading = ref(false)
const error = ref(null)
const showBackToTop = ref(false)
const currentSlide = ref(0)
const mapLoading = ref(false)
const mapError = ref(null)
let slideInterval = null
let collegeMap = null

// Карьерные возможности и возможности обучения загружаются из БД через college.value
// Сервер возвращает: opportunities, employers, workshops, professions, ovz_programs
const careers = ref([])
const opportunities = ref([])
const currentUser = ref(null)
const isFavoriteCollege = ref(false)
const loadingReviews = ref(false)
const submittingReview = ref(false)
const reviews = ref([])
const reviewSummary = ref({
  total: 0,
  average: 0,
  distribution: []
})
const reviewMessage = ref('')
const reviewMessageType = ref('info')
const reviewForm = ref({
  rating: 5,
  text: ''
})

const showApplicationModal = ref(false)
const submittingApplication = ref(false)
const loadingApplicantApplications = ref(false)
const applicationModalError = ref('')
const applicationSectionMessage = ref('')
const applicationSectionType = ref('info')

const applicantApplicationsStats = ref({
  total: 0,
  remaining: 5,
  limit: 5
})

const applicationForm = ref({
  applicant_name: '',
  phone: '',
  email: '',
  avg_score: '',
  specialty_id: '',
  needs_dormitory: false
})

const applicationFormErrors = ref({
  applicant_name: '',
  phone: '',
  email: '',
  avg_score: '',
  specialty_id: ''
})

const normalizeSocialOther = (value) => {
  if (!value) return []
  if (Array.isArray(value)) {
    return value
      .map(item => typeof item === 'string' ? item : item?.url || item?.value || '')
      .filter(Boolean)
  }
  if (typeof value === 'object') {
    return Object.values(value).filter(item => typeof item === 'string' && item.trim())
  }
  if (typeof value === 'string') {
    return value.split('\n').map(item => item.trim()).filter(Boolean)
  }
  return []
}

const collegeContactItems = computed(() => {
  if (!college.value) return []

  const items = [
    {
      key: 'phone',
      label: 'Телефон',
      value: college.value.phone,
      href: college.value.phone ? `tel:${college.value.phone}` : null,
      target: '_self'
    },
    {
      key: 'email',
      label: 'Электронная почта',
      value: college.value.email,
      href: college.value.email ? `mailto:${college.value.email}` : null,
      target: '_self'
    },
    {
      key: 'website',
      label: 'Сайт колледжа',
      value: college.value.website,
      href: college.value.website,
      target: '_blank'
    },
    {
      key: 'social_vk',
      label: 'ВКонтакте',
      value: college.value.social_vk,
      href: college.value.social_vk,
      target: '_blank'
    },
    {
      key: 'social_max',
      label: 'MAX',
      value: college.value.social_max,
      href: college.value.social_max,
      target: '_blank'
    }
  ].filter(item => item.value)

  const otherSources = normalizeSocialOther(college.value.social_other).map((url, index) => ({
    key: `social_other_${index}`,
    label: `Соцсеть ${index + 1}`,
    value: url,
    href: url,
    target: '_blank'
  }))

  return [...items, ...otherSources]
})

const isAuthenticated = computed(() => Boolean(localStorage.getItem('authToken') && currentUser.value))
const isApplicant = computed(() => currentUser.value?.role?.name === 'applicant')

const applicationSpecialties = computed(() => {
  if (!college.value?.specialties) return []

  return college.value.specialties
    .filter(item => item?.id)
    .map(item => ({
      id: item.id,
      code: item.code || '—',
      name: item.name || 'Без названия'
    }))
})

const isApplicationsLimitReached = computed(
  () => applicantApplicationsStats.value.total >= applicantApplicationsStats.value.limit
)

const parseAvgScore = (value) => {
  const score = Number(value)
  if (!Number.isFinite(score)) return null
  if (score < 2 || score > 5) return null

  const scaled = Math.round(score * 100)
  if (Math.abs(score * 100 - scaled) > 1e-8) return null

  return Number((scaled / 100).toFixed(2))
}

const getAuthToken = () => localStorage.getItem('authToken')

const syncCurrentUser = () => {
  const rawUser = localStorage.getItem('user')
  if (!rawUser) {
    currentUser.value = null
    return
  }

  try {
    currentUser.value = JSON.parse(rawUser)
  } catch (error) {
    currentUser.value = null
  }
}

const loadFavoriteStatus = async () => {
  if (!college.value?.id || !isApplicant.value) return
  const token = getAuthToken()
  if (!token) return

  try {
    const response = await axios.get(`${API_URL}/favorites/status`, {
      params: {
        entity_type: 'college',
        entity_id: college.value.id
      },
      headers: { Authorization: `Bearer ${token}` }
    })
    isFavoriteCollege.value = Boolean(response.data?.data?.isFavorite)
  } catch (error) {
    console.warn('Не удалось загрузить статус избранного:', error)
  }
}

const setReviewMessage = (message, type = 'info') => {
  reviewMessage.value = message
  reviewMessageType.value = type
}

const loadReviews = async () => {
  const collegeId = route.params.id
  if (!collegeId) return

  loadingReviews.value = true
  try {
    const response = await axios.get(`${API_URL}/reviews/college/${collegeId}`)

    if (response.data?.success) {
      reviews.value = response.data.data.reviews || []
      reviewSummary.value = response.data.data.summary || {
        total: 0,
        average: 0,
        distribution: []
      }
    }
  } catch (error) {
    setReviewMessage(error.response?.data?.error || 'Не удалось загрузить отзывы', 'error')
  } finally {
    loadingReviews.value = false
  }
}

const submitReview = async () => {
  const token = getAuthToken()
  if (!token || !isApplicant.value) {
    router.push({ name: 'Login', query: { redirect: route.fullPath } })
    return
  }

  const text = reviewForm.value.text.trim()
  if (text.length < 20) {
    setReviewMessage('Отзыв должен содержать минимум 20 символов.', 'error')
    return
  }

  submittingReview.value = true
  reviewMessage.value = ''

  try {
    await axios.post(`${API_URL}/reviews/college/${route.params.id}`, {
      rating: reviewForm.value.rating,
      text
    }, {
      headers: { Authorization: `Bearer ${token}` }
    })

    reviewForm.value = { rating: 5, text: '' }
    setReviewMessage('Спасибо! Отзыв опубликован.', 'success')
    await loadReviews()
  } catch (error) {
    setReviewMessage(error.response?.data?.error || 'Не удалось опубликовать отзыв', 'error')
  } finally {
    submittingReview.value = false
  }
}

const toggleFavoriteCollege = async () => {
  if (!college.value?.id) return
  const token = getAuthToken()
  if (!token || !isApplicant.value) {
    router.push({ name: 'Login', query: { redirect: route.fullPath } })
    return
  }

  try {
    if (isFavoriteCollege.value) {
      await axios.delete(`${API_URL}/favorites/college/${college.value.id}`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      isFavoriteCollege.value = false
    } else {
      await axios.post(`${API_URL}/favorites`, {
        entity_type: 'college',
        entity_id: college.value.id
      }, {
        headers: { Authorization: `Bearer ${token}` }
      })
      isFavoriteCollege.value = true
    }
  } catch (error) {
    console.error('Ошибка обновления избранного:', error)
  }
}

const resetApplicationFormErrors = () => {
  applicationFormErrors.value = {
    applicant_name: '',
    phone: '',
    email: '',
    avg_score: '',
    specialty_id: ''
  }
}

const setApplicationSectionMessage = (message, type = 'info') => {
  applicationSectionMessage.value = message
  applicationSectionType.value = type
}

const loadApplicantApplications = async () => {
  if (!isApplicant.value) return
  const token = getAuthToken()
  if (!token) return

  loadingApplicantApplications.value = true
  applicationModalError.value = ''

  try {
    const response = await axios.get(`${API_URL}/applications/my`, {
      headers: { Authorization: `Bearer ${token}` }
    })

    if (response.data?.success) {
      applicantApplicationsStats.value = {
        total: response.data.data.total,
        remaining: response.data.data.remaining,
        limit: response.data.data.limit
      }
    }
  } catch (err) {
    applicationModalError.value = err.response?.data?.error || 'Не удалось загрузить данные по заявкам'
  } finally {
    loadingApplicantApplications.value = false
  }
}

const openApplicationModal = async () => {
  applicationModalError.value = ''
  resetApplicationFormErrors()
  syncCurrentUser()

  const token = getAuthToken()
  if (!token || !currentUser.value) {
    router.push({ name: 'Login', query: { redirect: route.fullPath } })
    return
  }

  if (!isApplicant.value) {
    setApplicationSectionMessage('Подавать заявления может только пользователь с ролью "абитуриент".', 'error')
    return
  }

  applicationForm.value.applicant_name = currentUser.value.name || applicationForm.value.applicant_name
  applicationForm.value.email = currentUser.value.email || applicationForm.value.email
  applicationForm.value.phone = currentUser.value.phone
    ? formatRussianPhone(currentUser.value.phone)
    : applicationForm.value.phone

  showApplicationModal.value = true
  await loadApplicantApplications()
}

const closeApplicationModal = () => {
  showApplicationModal.value = false
  applicationModalError.value = ''
  resetApplicationFormErrors()
}

const validateApplicationForm = () => {
  resetApplicationFormErrors()

  const name = applicationForm.value.applicant_name?.trim() || ''
  const email = applicationForm.value.email?.trim() || ''
  const phone = applicationForm.value.phone?.trim() || ''
  const specialtyId = Number(applicationForm.value.specialty_id)
  const avgScore = parseAvgScore(applicationForm.value.avg_score)

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

  if (!name) {
    applicationFormErrors.value.applicant_name = 'Укажите ФИО абитуриента'
  }

  if (!normalizeRussianPhone(phone)) {
    applicationFormErrors.value.phone = 'Телефон должен быть в российском формате'
  }

  if (!emailRegex.test(email)) {
    applicationFormErrors.value.email = 'Введите корректный email'
  }

  if (!Number.isInteger(specialtyId) || specialtyId <= 0) {
    applicationFormErrors.value.specialty_id = 'Выберите специальность'
  }

  if (avgScore === null) {
    applicationFormErrors.value.avg_score = 'Средний балл: от 2.00 до 5.00 с шагом 0.01'
  }

  return Object.values(applicationFormErrors.value).every((item) => !item)
}

const submitApplication = async () => {
  if (!college.value?.id) return
  if (!validateApplicationForm()) return

  await loadApplicantApplications()
  if (isApplicationsLimitReached.value) {
    applicationModalError.value = 'Достигнут лимит: максимум 5 заявок'
    return
  }

  const token = getAuthToken()
  if (!token) {
    router.push({ name: 'Login', query: { redirect: route.fullPath } })
    return
  }

  const normalizedPhone = normalizeRussianPhone(applicationForm.value.phone)
  if (!normalizedPhone) {
    applicationFormErrors.value.phone = 'Телефон должен быть в российском формате'
    return
  }

  submittingApplication.value = true
  applicationModalError.value = ''

  try {
    const payload = {
      college_id: Number(college.value.id),
      specialty_id: Number(applicationForm.value.specialty_id),
      avg_score: parseAvgScore(applicationForm.value.avg_score),
      applicant_name: applicationForm.value.applicant_name.trim(),
      phone: normalizedPhone,
      email: applicationForm.value.email.trim().toLowerCase(),
      needs_dormitory: Boolean(applicationForm.value.needs_dormitory)
    }

    const response = await axios.post(`${API_URL}/applications`, payload, {
      headers: { Authorization: `Bearer ${token}` }
    })

    if (response.data?.success) {
      setApplicationSectionMessage('Заявка успешно отправлена', 'success')
      await loadApplicantApplications()
      closeApplicationModal()
    }
  } catch (err) {
    applicationModalError.value = err.response?.data?.error || 'Не удалось отправить заявление'
  } finally {
    submittingApplication.value = false
  }
}

const onApplicationPhoneInput = (event) => {
  applicationForm.value.phone = maskRussianPhoneInput(event?.target?.value || '')
}

// Загрузка данных колледжа с API
const fetchCollege = async () => {
  loading.value = true
  error.value = null

  try {
    const collegeId = route.params.id
    const response = await axios.get(`${API_URL}/colleges/${collegeId}`)

    if (response.data.success) {
      college.value = response.data.data
      // Загружаем возможности и карьеры из данных колледжа
      if (response.data.data.opportunities) {
        opportunities.value = response.data.data.opportunities
      }
      if (response.data.data.employers) {
        careers.value = response.data.data.employers
      }
      
      // Инициализируем карту после загрузки данных
      if (response.data.data.campuses && response.data.data.campuses.length > 0) {
        await nextTick()
        setTimeout(() => {
          initMap()
        }, 200)
      }
      await Promise.all([
        loadFavoriteStatus(),
        loadReviews()
      ])
    } else {
      throw new Error(response.data.error || 'Ошибка загрузки данных')
    }
  } catch (err) {
    console.error('Ошибка при загрузке колледжа:', err)
    error.value = err.message || 'Не удалось загрузить информацию о колледже'
    college.value = null
  } finally {
    loading.value = false
  }
}

// Вспомогательные функции
const formatPrice = (price) => {
  if (!price || price === 0) return 'Бесплатно'
  return parseInt(price).toLocaleString('ru-RU')
}

const formatDate = (value) => {
  if (!value) return '—'
  return new Date(value).toLocaleString('ru-RU')
}

const formatBase = (base) => {
  if (!base) return '—'
  return base === '9' ? '9 классов' : '11 классов'
}

const formatForm = (form) => {
  if (!form) return '—'
  const formMap = {
    'full-time': 'Очная',
    'part-time': 'Заочная',
    'distance': 'Дистанционная'
  }
  return formMap[form] || form
}

const formatDuration = (duration) => {
  if (!duration) return '—'
  return duration
}

// Методы карусели
const nextSlide = () => {
  if (college.value && college.value.photos) {
    currentSlide.value = (currentSlide.value + 1) % college.value.photos.length
  }
}

const prevSlide = () => {
  if (college.value && college.value.photos) {
    currentSlide.value = (currentSlide.value - 1 + college.value.photos.length) % college.value.photos.length
  }
}

const goToSlide = (index) => {
  currentSlide.value = index
}

const startSlideShow = () => {
  slideInterval = setInterval(nextSlide, 5000)
}

const stopSlideShow = () => {
  if (slideInterval) {
    clearInterval(slideInterval)
  }
}

const scrollToTop = () => {
  window.scrollTo({ top: 0, behavior: 'smooth' })
}

const handleScroll = () => {
  showBackToTop.value = window.pageYOffset > 300
}

// Загрузка Yandex Maps API
const loadYandexMaps = () => loadYandexMapsApi()

// Парсинг координат
const parseCoordinates = (coordsString) => {
  if (!coordsString) return null
  
  try {
    const cleaned = coordsString.replace(/[\[\]"'\s]/g, '')
    const parts = cleaned.split(',').map(s => parseFloat(s.trim()))
    
    if (parts.length === 2 && !isNaN(parts[0]) && !isNaN(parts[1])) {
      return [parts[0], parts[1]]
    }
  } catch (e) {
    console.error('❌ Ошибка парсинга координат:', coordsString, e)
  }
  
  return null
}

// Инициализация карты
const initMap = async () => {
  if (!college.value || !college.value.campuses || college.value.campuses.length === 0) {
    console.warn('⚠️ Нет адресов для отображения на карте')
    return
  }

  try {
    mapError.value = null
    
    // Загружаем Yandex Maps API
    await loadYandexMaps()
    
    // Находим первый кампус с координатами для центра карты
    const firstCampus = college.value.campuses.find(c => c.coordinates)
    if (!firstCampus) {
      mapError.value = 'Нет координат для отображения'
      return
    }

    const centerCoords = parseCoordinates(firstCampus.coordinates)
    if (!centerCoords) {
      mapError.value = 'Не удалось распознать координаты'
      return
    }

    // Сначала показываем контейнер карты (убираем loading)
    mapLoading.value = false
    await nextTick()
    await new Promise(resolve => setTimeout(resolve, 150))
    
    // Проверяем, что элемент существует
    const mapElement = document.getElementById('college-map')
    if (!mapElement) {
      console.error('❌ Элемент карты не найден в DOM')
      mapError.value = 'Контейнер карты не найден'
      return
    }

    // Создаём карту
    collegeMap = new window.ymaps.Map('college-map', {
      center: centerCoords,
      zoom: 14,
      controls: ['zoomControl', 'fullscreenControl']
    }, {
      searchControlProvider: 'yandex#search'
    })

    // Добавляем метки для каждого адреса
    let placemarksCount = 0
    
    college.value.campuses.forEach((campus, index) => {
      if (!campus.coordinates) {
        console.warn(`⚠️ Пропущен адрес без координат: ${campus.name || campus.address}`)
        return
      }

      const coords = parseCoordinates(campus.coordinates)
      if (!coords) {
        console.warn(`⚠️ Не удалось распарсить координаты: ${campus.coordinates}`)
        return
      }

      const isMain = campus.is_main
      const placemark = new window.ymaps.Placemark(coords, {
        balloonContentHeader: `<strong style="font-size:14px; color:#0054A6;">${campus.name || 'Корпус колледжа'}</strong>`,
        balloonContentBody: `
          <div style="max-width:280px; padding:4px;">
            <p style="margin:6px 0; color:#333; font-size:13px;">
              <strong style="color:#0054A6;">📍 Адрес:</strong><br>
              ${campus.address || 'Адрес не указан'}
            </p>
            ${campus.phone ? `
              <p style="margin:6px 0; font-size:13px;">
                <strong style="color:#0054A6;">📞 Телефон:</strong><br>
                <a href="tel:${campus.phone}" style="color:#0054A6; text-decoration:none;">${campus.phone}</a>
              </p>
            ` : ''}
            ${campus.email ? `
              <p style="margin:6px 0; font-size:13px;">
                <strong style="color:#0054A6;">📧 Email:</strong><br>
                <a href="mailto:${campus.email}" style="color:#0054A6; text-decoration:none;">${campus.email}</a>
              </p>
            ` : ''}
            ${isMain ? '<p style="margin:6px 0; font-size:12px; color:#4CAF50;"><strong>✓ Главный корпус</strong></p>' : ''}
          </div>
        `,
        hintContent: campus.name || campus.address
      }, {
        preset: isMain ? 'islands#blueEducationCircleIcon' : 'islands#lightBlueCircleIcon',
        iconColor: isMain ? '#0054A6' : '#2196F3'
      })
      
      collegeMap.geoObjects.add(placemark)
      placemarksCount++
    })

    // Автомасштабирование, если есть несколько меток
    if (placemarksCount > 1) {
      const bounds = collegeMap.geoObjects.getBounds()
      if (bounds) {
        collegeMap.setBounds(bounds, {
          checkZoomRange: true,
          zoomMargin: 50,
          duration: 300
        })
      }
    }

    console.log(`✅ Карта инициализирована с ${placemarksCount} метками`)
    
  } catch (err) {
    console.error('❌ Ошибка инициализации карты:', err)
    mapError.value = 'Не удалось загрузить карту'
    mapLoading.value = false
  }
}

// Очистка карты
const destroyMap = () => {
  if (collegeMap) {
    collegeMap.destroy()
    collegeMap = null
  }
}

// Наблюдение за изменением маршрута (для перезагрузки при смене колледжа)
watch(() => route.params.id, () => {
  destroyMap()
  closeApplicationModal()
  fetchCollege()
})

const handleAuthStorageChange = () => {
  syncCurrentUser()
  if (isApplicant.value) {
    loadApplicantApplications()
  }
}

onMounted(() => {
  syncCurrentUser()
  if (isApplicant.value) {
    loadApplicantApplications()
  }

  window.addEventListener('scroll', handleScroll)
  window.addEventListener('storage', handleAuthStorageChange)
  fetchCollege()

  // Инициализация карусели
  const stopWatch = setInterval(() => {
    if (college.value) {
      startSlideShow()
      clearInterval(stopWatch)
    }
  }, 100)
})

onUnmounted(() => {
  window.removeEventListener('scroll', handleScroll)
  window.removeEventListener('storage', handleAuthStorageChange)
  stopSlideShow()
  destroyMap()
})
</script>

<style scoped>
.loading-state,
.error-state {
  text-align: center;
  padding: 48px 20px;
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
  margin-left: 10px;
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

/* Стили для карты */
.map-container {
  width: 100%;
  border-radius: 12px;
  overflow: hidden;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  background: white;
}

#college-map {
  width: 100%;
  height: 500px;
}

.map-loading,
.map-error {
  text-align: center;
  padding: 48px 20px;
  color: #666;
  font-size: 16px;
  background: #f5f5f5;
  border-radius: 12px;
}

.map-loading i {
  font-size: 2.5rem;
  color: #0054A6;
  margin-bottom: 15px;
  display: block;
  animation: spin 1s linear infinite;
}

.map-error {
  color: #d32f2f;
  background: #ffebee;
}

.map-error i {
  font-size: 2rem;
  margin-bottom: 10px;
  display: block;
}

@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

/* Стили для заголовка колледжа с логотипом */
.college-header {
  padding: 36px 0;
  background: linear-gradient(135deg, var(--primary-blue), var(--primary-green));
  margin-bottom: 18px;
}

.college-header .header-content {
  display: flex;
  justify-content: center;
}

.college-header .header-info {
  max-width: 900px;
  text-align: center;
}

.college-header h1 {
  margin: 0 0 15px 0;
  font-size: 2.5rem;
  color: white;
  line-height: 1.2;
}

.college-header .header-city {
  margin: 0;
  font-size: 1.1rem;
  color: rgba(255, 255, 255, 0.9);
  display: flex;
  align-items: center;
  gap: 8px;
}

.college-header .header-city i {
  color: white;
}

.detail-favorite-btn {
  margin-top: 18px;
}

.sources-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
  gap: 16px;
}

.source-card {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 18px 20px;
  border-radius: 12px;
  background: white;
  border: 1px solid var(--border-color);
  color: inherit;
  text-decoration: none;
  transition: transform 0.2s ease, box-shadow 0.2s ease, border-color 0.2s ease;
}

.source-card:hover {
  transform: translateY(-3px);
  box-shadow: 0 10px 24px rgba(0, 0, 0, 0.08);
  border-color: var(--primary-blue);
}

.source-label {
  font-weight: 700;
  color: var(--text-dark);
}

.source-url {
  color: var(--primary-blue);
  word-break: break-word;
}

.application-section {
  text-align: center;
  background: var(--light-bg);
  padding: 28px;
  border-radius: 12px;
}

.application-title {
  margin-bottom: 16px;
}

.application-description {
  margin: 0 auto 16px;
  max-width: 760px;
  color: var(--text-light);
}

.application-limit-hint {
  margin-bottom: 16px;
  font-weight: 600;
  color: var(--text-dark);
}

.application-actions {
  display: flex;
  justify-content: center;
  gap: 12px;
  flex-wrap: wrap;
}

.apply-btn {
  min-width: 280px;
  padding: 12px 20px;
  border: none;
  border-radius: 12px;
  font-weight: 800;
  letter-spacing: 0.01em;
  background: linear-gradient(135deg, #0b66c3, #06a657);
  color: #fff;
  box-shadow: 0 12px 26px rgba(5, 81, 145, 0.25);
  transition: transform 0.2s ease, box-shadow 0.2s ease, opacity 0.2s ease;
}

.apply-btn:hover:not([disabled]) {
  transform: translateY(-2px);
  box-shadow: 0 16px 30px rgba(5, 81, 145, 0.35);
}

.apply-btn[disabled] {
  opacity: 0.7;
  cursor: not-allowed;
}

.external-admission-link {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 10px 18px;
  border-radius: 8px;
  text-decoration: none;
  border: 1px solid var(--border-color);
  color: var(--text-dark);
  background: white;
}

.application-notice {
  margin: 0 auto 14px;
  max-width: 760px;
  padding: 10px 14px;
  border-radius: 8px;
  font-size: 0.95rem;
}

.application-notice.is-success {
  background: #d1fae5;
  color: #065f46;
}

.application-notice.is-error {
  background: #fee2e2;
  color: #991b1b;
}

.application-notice.is-info {
  background: #dbeafe;
  color: #1e40af;
}

.reviews-section {
  background: #fff;
  border: 1px solid var(--border-color);
  border-radius: 12px;
  padding: 24px;
}

.reviews-title {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  flex-wrap: wrap;
}

.reviews-summary,
.summary-stars,
.review-stars {
  display: inline-flex;
  align-items: center;
  gap: 6px;
}

.summary-rating {
  font-size: 1.5rem;
  font-weight: 800;
  color: var(--text-dark);
}

.summary-stars,
.review-stars,
.star-button {
  color: #f59e0b;
}

.summary-count,
.review-date,
.review-hint,
.review-login-hint {
  color: var(--text-light);
}

.review-form {
  display: flex;
  flex-direction: column;
  gap: 12px;
  margin: 18px 0 22px;
  padding: 16px;
  border: 1px solid var(--border-color);
  border-radius: 12px;
  background: #f8fafc;
}

.review-rating-picker {
  display: flex;
  gap: 6px;
}

.star-button {
  width: 36px;
  height: 36px;
  border: none;
  border-radius: 8px;
  background: transparent;
  cursor: pointer;
  font-size: 1.35rem;
  transition: background 0.2s ease, transform 0.2s ease;
}

.star-button:hover,
.star-button.active {
  background: #fffbeb;
}

.star-button:hover {
  transform: translateY(-1px);
}

.review-textarea {
  resize: vertical;
  min-height: 110px;
}

.review-form-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  flex-wrap: wrap;
}

.review-submit {
  min-width: 170px;
}

.review-login-hint,
.empty-reviews,
.reviews-loading {
  margin: 16px 0;
}

.reviews-list {
  display: grid;
  gap: 14px;
  margin-top: 16px;
}

.review-card {
  padding: 16px;
  border: 1px solid var(--border-color);
  border-radius: 12px;
  background: #fff;
}

.review-card-header {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 10px;
}

.review-card h3 {
  margin: 0 0 4px;
  font-size: 1rem;
}

.review-card p {
  margin: 0;
  line-height: 1.6;
  color: var(--text-dark);
}

.application-modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(15, 23, 42, 0.62);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 2100;
  padding: 16px;
}

.application-modal {
  width: 100%;
  max-width: 760px;
  max-height: 92vh;
  overflow-y: auto;
  background: white;
  border-radius: 14px;
  padding: 20px;
}

.application-modal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  margin-bottom: 14px;
}

.application-modal-header h3 {
  margin: 0;
  color: var(--text-dark);
}

.application-close {
  border: none;
  background: transparent;
  color: var(--text-light);
  cursor: pointer;
  font-size: 1.8rem;
  line-height: 1;
}

.application-counter {
  margin-bottom: 16px;
  color: var(--text-light);
}

.application-form-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 14px;
}

.field-error {
  margin-top: 6px;
  font-size: 0.84rem;
  color: #dc2626;
}

.checkbox-group {
  margin-top: 6px;
}

.application-submit-row {
  margin-top: 18px;
  display: flex;
  justify-content: flex-end;
  gap: 10px;
}

/* Адаптивность для заголовка */
@media (max-width: 768px) {
  .college-header .header-content {
    justify-content: center;
  }

  .college-header h1 {
    font-size: 2rem;
  }

  .college-header .header-city {
    justify-content: center;
  }

  .application-section {
    padding: 20px 16px;
  }

  .application-form-grid {
    grid-template-columns: 1fr;
  }

  .application-submit-row {
    flex-direction: column;
  }

  .application-submit-row .btn-primary,
  .application-submit-row .btn-secondary,
  .apply-btn,
  .external-admission-link {
    width: 100%;
  }
}

/* Адаптивность для карты */
@media (max-width: 768px) {
  #college-map {
    height: 400px;
  }
  
  .map-loading,
  .map-error {
    padding: 60px 20px;
  }
}
</style>
