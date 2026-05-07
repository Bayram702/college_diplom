<template>
  <div class="applicant-dashboard">
    <div class="container dashboard-container">
      <section class="dashboard-card">
        <div class="card-header">
          <h1>Личный кабинет абитуриента</h1>
          <button class="btn-secondary" @click="loadAllData" :disabled="loadingProfile || loadingApplications || loadingFavorites || loadingReviews">
            Обновить
          </button>
        </div>

        <p v-if="pageError" class="notice is-error">{{ pageError }}</p>
      </section>

      <section class="dashboard-card">
        <h2>Профиль</h2>
        <p v-if="profileMessage" :class="['notice', profileMessageType === 'error' ? 'is-error' : 'is-success']">
          {{ profileMessage }}
        </p>

        <form class="profile-form" @submit.prevent="saveProfile">
          <div class="grid">
            <div class="form-group">
              <label for="profile-name">ФИО <span class="required">*</span></label>
              <input id="profile-name" v-model="profileForm.name" type="text" class="form-control" />
              <p v-if="profileErrors.name" class="field-error">{{ profileErrors.name }}</p>
            </div>
            <div class="form-group">
              <label for="profile-email">Email <span class="required">*</span></label>
              <input id="profile-email" v-model="profileForm.email" type="email" class="form-control" />
              <p v-if="profileErrors.email" class="field-error">{{ profileErrors.email }}</p>
            </div>
          </div>

          <div class="grid">
            <div class="form-group">
              <label for="profile-phone">Телефон</label>
              <input
                id="profile-phone"
                v-model="profileForm.phone"
                @input="onPhoneInput"
                type="tel"
                class="form-control"
                placeholder="+7 (999) 123-45-67"
              />
              <p v-if="profileErrors.phone" class="field-error">{{ profileErrors.phone }}</p>
            </div>
          </div>

          <div class="actions">
            <button type="submit" class="btn-primary" :disabled="savingProfile">
              {{ savingProfile ? 'Сохранение...' : 'Сохранить данные' }}
            </button>
          </div>
        </form>
      </section>

      <section class="dashboard-card">
        <h2>Смена пароля</h2>
        <p v-if="passwordMessage" :class="['notice', passwordMessageType === 'error' ? 'is-error' : 'is-success']">
          {{ passwordMessage }}
        </p>

        <div class="password-actions">
          <button type="button" class="btn-secondary" @click="requestPasswordCode" :disabled="requestingPasswordCode">
            {{ requestingPasswordCode ? 'Отправка...' : 'Получить код на почту' }}
          </button>
        </div>

        <form class="profile-form" @submit.prevent="confirmPasswordChange">
          <div class="grid">
            <div class="form-group">
              <label for="password-code">Код из письма</label>
              <input id="password-code" v-model="passwordForm.code" type="text" class="form-control" maxlength="6" inputmode="numeric" />
            </div>
            <div class="form-group">
              <label for="new-password">Новый пароль</label>
              <input id="new-password" v-model="passwordForm.newPassword" type="password" class="form-control" autocomplete="new-password" />
            </div>
          </div>

          <div class="actions">
            <button type="submit" class="btn-primary" :disabled="changingPassword">
              {{ changingPassword ? 'Смена пароля...' : 'Сменить пароль' }}
            </button>
          </div>
        </form>
      </section>

      <section class="dashboard-card">
        <div class="applications-header">
          <h2>Мои заявки</h2>
          <p class="applications-meta">Подано: {{ applicationsStats.total }} из {{ applicationsStats.limit }}. Осталось: {{ applicationsStats.remaining }}</p>
        </div>

        <div v-if="loadingApplications" class="loading-state">Загрузка заявок...</div>

        <div v-else-if="applications.length === 0" class="empty-state">
          У вас пока нет заявок.
        </div>

        <div v-else class="table-wrapper">
          <table class="applications-table">
            <thead>
              <tr>
                <th>Колледж</th>
                <th>Специальность</th>
                <th>Средний балл</th>
                <th>Общежитие</th>
                <th>Статус</th>
                <th>Дата подачи</th>
                <th>Действия</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="item in applications" :key="item.id">
                <td>{{ item.college_name }}</td>
                <td>{{ item.specialty_code }} — {{ item.specialty_name }}</td>
                <td>{{ item.avg_score }}</td>
                <td>{{ item.needs_dormitory ? 'Да' : 'Нет' }}</td>
                <td>
                  <span class="status-badge" :class="statusClass(item.status)">
                    {{ statusLabel(item.status) }}
                  </span>
                </td>
                <td>{{ formatDate(item.created_at) }}</td>
                <td>
                  <button
                    v-if="item.status === 'pending'"
                    class="btn-link-danger"
                    @click="cancelApplication(item)"
                  >
                    Отменить
                  </button>
                  <span v-else class="text-muted">—</span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      <section class="dashboard-card">
        <div class="applications-header">
          <h2>Мои отзывы</h2>
          <p class="applications-meta">Опубликовано: {{ reviews.length }}</p>
        </div>

        <p v-if="reviewsMessage" :class="['notice', reviewsMessageType === 'error' ? 'is-error' : 'is-success']">
          {{ reviewsMessage }}
        </p>

        <div v-if="loadingReviews" class="loading-state">Загрузка отзывов...</div>

        <div v-else-if="reviews.length === 0" class="empty-state">
          У вас пока нет отзывов о колледжах.
        </div>

        <div v-else class="reviews-grid">
          <article v-for="review in reviews" :key="review.id" class="dashboard-review-card">
            <div class="review-card-header">
              <div>
                <h3>{{ review.college_name }}</h3>
                <p>{{ review.city_name || 'Город не указан' }}</p>
              </div>
              <div class="review-stars" :aria-label="`${review.rating} из 5`">
                <i
                  v-for="star in 5"
                  :key="star"
                  :class="star <= review.rating ? 'fas fa-star' : 'far fa-star'"
                ></i>
              </div>
            </div>
            <p class="review-text">{{ review.text }}</p>
            <div class="review-actions">
              <span class="text-muted">{{ formatDate(review.created_at) }}</span>
              <div>
                <router-link :to="`/college/${review.college_id}`" class="btn-small">Открыть колледж</router-link>
                <button class="btn-link-danger" @click="deleteReview(review)">Удалить</button>
              </div>
            </div>
          </article>
        </div>
      </section>

      <section class="dashboard-card">
        <div class="applications-header">
          <h2>Избранное</h2>
          <p class="applications-meta">
            Колледжи: {{ favoriteColleges.length }}. Специальности: {{ favoriteSpecialties.length }}.
          </p>
        </div>

        <div v-if="loadingFavorites" class="loading-state">Загрузка избранного...</div>

        <div v-else-if="favoriteColleges.length === 0 && favoriteSpecialties.length === 0" class="empty-state">
          В избранном пока ничего нет.
        </div>

        <div v-else class="favorites-layout">
          <div v-if="favoriteColleges.length > 0" class="favorites-column">
            <h3>Колледжи</h3>
            <Splide
              class="favorites-splide"
              :options="favoriteCarouselOptions"
              aria-label="Избранные колледжи"
            >
              <SplideSlide v-for="college in favoriteColleges" :key="college.id">
                <article class="favorite-card">
                  <img :src="resolveImageUrl(college.logo_image_url)" :alt="college.name" class="favorite-image">
                  <div class="favorite-content">
                    <h4>{{ college.name }}</h4>
                    <p>{{ college.city_name || 'Город не указан' }}</p>
                    <div class="favorite-actions">
                      <router-link :to="`/college/${college.id}`" class="btn-small">Открыть</router-link>
                      <button class="btn-link-danger" @click="removeFavorite('college', college.id)">Убрать</button>
                    </div>
                  </div>
                </article>
              </SplideSlide>
            </Splide>
          </div>

          <div v-if="favoriteSpecialties.length > 0" class="favorites-column">
            <h3>Специальности</h3>
            <Splide
              class="favorites-splide"
              :options="favoriteCarouselOptions"
              aria-label="Избранные специальности"
            >
              <SplideSlide v-for="specialty in favoriteSpecialties" :key="specialty.id">
                <article class="favorite-card">
                  <div class="favorite-code">{{ specialty.code || '—' }}</div>
                  <div class="favorite-content">
                    <h4>{{ specialty.name }}</h4>
                    <p>{{ specialty.description || 'Описание не указано' }}</p>
                    <div class="favorite-actions">
                      <router-link :to="`/specialty/${specialty.id}`" class="btn-small">Открыть</router-link>
                      <button class="btn-link-danger" @click="removeFavorite('specialty', specialty.id)">Убрать</button>
                    </div>
                  </div>
                </article>
              </SplideSlide>
            </Splide>
          </div>
        </div>
      </section>
    </div>
  </div>
</template>

<script setup>
import { onMounted, ref } from 'vue'
import axios from 'axios'
import { Splide, SplideSlide } from '@splidejs/vue-splide'
import '@splidejs/vue-splide/css'
import { maskRussianPhoneInput, normalizeRussianPhone, formatRussianPhone } from '../utils/phone'
import { resolveImageUrl } from '../utils/images'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api'

const loadingProfile = ref(false)
const savingProfile = ref(false)
const loadingApplications = ref(false)
const loadingFavorites = ref(false)
const loadingReviews = ref(false)
const pageError = ref('')
const profileMessage = ref('')
const profileMessageType = ref('success')
const passwordMessage = ref('')
const passwordMessageType = ref('success')
const reviewsMessage = ref('')
const reviewsMessageType = ref('success')
const requestingPasswordCode = ref(false)
const changingPassword = ref(false)

const profileForm = ref({
  name: '',
  email: '',
  phone: ''
})

const profileErrors = ref({
  name: '',
  email: '',
  phone: ''
})

const passwordForm = ref({
  code: '',
  newPassword: ''
})

const applications = ref([])
const favoriteColleges = ref([])
const favoriteSpecialties = ref([])
const reviews = ref([])
const applicationsStats = ref({
  total: 0,
  remaining: 5,
  limit: 5
})

const favoriteCarouselOptions = {
  type: 'slide',
  perPage: 1,
  perMove: 1,
  gap: '14px',
  pagination: true,
  arrows: true,
  wheel: true,
  waitForTransition: true,
  wheelSleep: 450,
  releaseWheel: true
}

const getToken = () => localStorage.getItem('authToken')

const statusLabel = (value) => {
  if (value === 'accepted') return 'Принята'
  if (value === 'rejected') return 'Отклонена'
  if (value === 'cancelled') return 'Отменена'
  return 'В ожидании'
}

const loadFavorites = async () => {
  const token = getToken()
  if (!token) return

  loadingFavorites.value = true
  try {
    const response = await axios.get(`${API_URL}/favorites`, {
      headers: { Authorization: `Bearer ${token}` }
    })

    if (response.data?.success) {
      favoriteColleges.value = response.data.data.colleges || []
      favoriteSpecialties.value = response.data.data.specialties || []
    }
  } finally {
    loadingFavorites.value = false
  }
}

const removeFavorite = async (entityType, entityId) => {
  const token = getToken()
  if (!token) return

  await axios.delete(`${API_URL}/favorites/${entityType}/${entityId}`, {
    headers: { Authorization: `Bearer ${token}` }
  })

  if (entityType === 'college') {
    favoriteColleges.value = favoriteColleges.value.filter(item => Number(item.id) !== Number(entityId))
  } else {
    favoriteSpecialties.value = favoriteSpecialties.value.filter(item => Number(item.id) !== Number(entityId))
  }
}

const statusClass = (value) => {
  if (value === 'accepted') return 'status-accepted'
  if (value === 'rejected') return 'status-rejected'
  if (value === 'cancelled') return 'status-cancelled'
  return 'status-pending'
}

const formatDate = (value) => {
  if (!value) return '—'
  return new Date(value).toLocaleString('ru-RU')
}

const resetProfileErrors = () => {
  profileErrors.value = { name: '', email: '', phone: '' }
}

const validateProfile = () => {
  resetProfileErrors()
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

  if (!profileForm.value.name?.trim()) {
    profileErrors.value.name = 'Укажите ФИО'
  }
  if (!emailRegex.test(profileForm.value.email?.trim() || '')) {
    profileErrors.value.email = 'Введите корректный email'
  }
  if (profileForm.value.phone?.trim() && !normalizeRussianPhone(profileForm.value.phone)) {
    profileErrors.value.phone = 'Телефон должен быть в российском формате'
  }

  return !Object.values(profileErrors.value).some(Boolean)
}

const onPhoneInput = (event) => {
  profileForm.value.phone = maskRussianPhoneInput(event?.target?.value || '')
}

const loadProfile = async () => {
  const token = getToken()
  if (!token) return

  loadingProfile.value = true
  try {
    const response = await axios.get(`${API_URL}/auth/me`, {
      headers: { Authorization: `Bearer ${token}` }
    })
    const user = response.data?.data?.user
    if (!user) return

    profileForm.value = {
      name: user.name || '',
      email: user.email || '',
      phone: user.phone ? formatRussianPhone(user.phone) : ''
    }

    localStorage.setItem('user', JSON.stringify(user))
  } finally {
    loadingProfile.value = false
  }
}

const loadApplications = async () => {
  const token = getToken()
  if (!token) return

  loadingApplications.value = true
  try {
    const response = await axios.get(`${API_URL}/applications/my`, {
      headers: { Authorization: `Bearer ${token}` }
    })

    if (response.data?.success) {
      applications.value = response.data.data.applications || []
      applicationsStats.value = {
        total: response.data.data.total || 0,
        remaining: response.data.data.remaining || 0,
        limit: response.data.data.limit || 5
      }
    }
  } finally {
    loadingApplications.value = false
  }
}

const loadReviews = async () => {
  const token = getToken()
  if (!token) return

  loadingReviews.value = true
  try {
    const response = await axios.get(`${API_URL}/reviews/my`, {
      headers: { Authorization: `Bearer ${token}` }
    })

    if (response.data?.success) {
      reviews.value = response.data.data || []
    }
  } finally {
    loadingReviews.value = false
  }
}

const deleteReview = async (review) => {
  if (!confirm(`Удалить отзыв о колледже "${review.college_name}"?`)) return

  const token = getToken()
  if (!token) return

  reviewsMessage.value = ''
  try {
    await axios.delete(`${API_URL}/reviews/${review.id}`, {
      headers: { Authorization: `Bearer ${token}` }
    })

    reviews.value = reviews.value.filter(item => Number(item.id) !== Number(review.id))
    reviewsMessage.value = 'Отзыв удален'
    reviewsMessageType.value = 'success'
  } catch (error) {
    reviewsMessage.value = error.response?.data?.error || 'Не удалось удалить отзыв'
    reviewsMessageType.value = 'error'
  }
}

const cancelApplication = async (application) => {
  if (!confirm(`Отменить заявку №${application.id}?`)) return

  const token = getToken()
  if (!token) return

  try {
    await axios.patch(`${API_URL}/applications/${application.id}/cancel`, {}, {
      headers: { Authorization: `Bearer ${token}` }
    })

    await loadApplications()
  } catch (error) {
    pageError.value = error.response?.data?.error || 'Не удалось отменить заявку'
  }
}

const requestPasswordCode = async () => {
  const token = getToken()
  if (!token) return

  passwordMessage.value = ''
  requestingPasswordCode.value = true
  try {
    const response = await axios.post(`${API_URL}/auth/password-change/request`, {}, {
      headers: { Authorization: `Bearer ${token}` }
    })

    passwordMessage.value = response.data?.message || 'Код отправлен на почту'
    passwordMessageType.value = response.data?.email_sent === false ? 'error' : 'success'
  } catch (error) {
    passwordMessage.value = error.response?.data?.error || 'Не удалось отправить код'
    passwordMessageType.value = 'error'
  } finally {
    requestingPasswordCode.value = false
  }
}

const confirmPasswordChange = async () => {
  const token = getToken()
  if (!token) return

  const code = passwordForm.value.code.trim()
  const newPassword = passwordForm.value.newPassword

  if (!/^\d{6}$/.test(code)) {
    passwordMessage.value = 'Введите 6-значный код'
    passwordMessageType.value = 'error'
    return
  }

  if (newPassword.length < 6) {
    passwordMessage.value = 'Пароль должен содержать минимум 6 символов'
    passwordMessageType.value = 'error'
    return
  }

  changingPassword.value = true
  try {
    const response = await axios.post(`${API_URL}/auth/password-change/confirm`, {
      code,
      newPassword
    }, {
      headers: { Authorization: `Bearer ${token}` }
    })

    passwordMessage.value = response.data?.message || 'Пароль успешно изменён'
    passwordMessageType.value = 'success'
    passwordForm.value = { code: '', newPassword: '' }
  } catch (error) {
    passwordMessage.value = error.response?.data?.error || 'Не удалось сменить пароль'
    passwordMessageType.value = 'error'
  } finally {
    changingPassword.value = false
  }
}

const loadAllData = async () => {
  pageError.value = ''
  try {
    await Promise.all([loadProfile(), loadApplications(), loadFavorites(), loadReviews()])
  } catch (error) {
    pageError.value = error.response?.data?.error || 'Не удалось загрузить данные кабинета'
  }
}

const saveProfile = async () => {
  profileMessage.value = ''
  if (!validateProfile()) return

  const token = getToken()
  if (!token) return

  savingProfile.value = true
  try {
    const payload = {
      name: profileForm.value.name.trim(),
      email: profileForm.value.email.trim().toLowerCase(),
      phone: profileForm.value.phone.trim() ? normalizeRussianPhone(profileForm.value.phone) : null
    }

    const response = await axios.put(`${API_URL}/auth/me`, payload, {
      headers: { Authorization: `Bearer ${token}` }
    })

    const user = response.data?.data?.user
    if (user) {
      localStorage.setItem('user', JSON.stringify(user))
      profileForm.value.phone = user.phone ? formatRussianPhone(user.phone) : ''
    }

    profileMessage.value = 'Данные профиля обновлены'
    profileMessageType.value = 'success'
  } catch (error) {
    profileMessage.value = error.response?.data?.error || 'Не удалось сохранить профиль'
    profileMessageType.value = 'error'
  } finally {
    savingProfile.value = false
  }
}

onMounted(async () => {
  await loadAllData()
})
</script>

<style scoped>
.applicant-dashboard {
  background: var(--light-bg);
  min-height: calc(100vh - 140px);
  padding: 24px 0;
}

.dashboard-container {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.dashboard-card {
  background: #fff;
  border: 1px solid var(--border-color);
  border-radius: 12px;
  padding: 20px;
  box-shadow: var(--shadow-sm);
}

.card-header,
.applications-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
}

h1,
h2 {
  margin: 0;
}

.applications-meta {
  margin: 0;
  color: var(--text-light);
  font-weight: 600;
}

.grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 14px;
}

.form-group {
  margin-top: 12px;
}

.form-group label {
  display: block;
  margin-bottom: 6px;
  font-weight: 600;
}

.field-error {
  margin-top: 6px;
  color: #b91c1c;
  font-size: 0.85rem;
}

.actions {
  margin-top: 16px;
}

.btn-primary {
  border: none;
  border-radius: 12px;
  padding: 12px 20px;
  font-weight: 800;
  letter-spacing: 0.01em;
  color: #fff;
  background: linear-gradient(135deg, #0b66c3, #06a657);
  box-shadow: 0 10px 24px rgba(5, 81, 145, 0.25);
  cursor: pointer;
  transition: transform 0.2s ease, box-shadow 0.2s ease, opacity 0.2s ease;
}

.btn-primary:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: 0 15px 28px rgba(5, 81, 145, 0.35);
}

.btn-primary:disabled {
  opacity: 0.75;
  cursor: not-allowed;
}

.btn-secondary {
  border: 1px solid #c7d2fe;
  border-radius: 10px;
  padding: 10px 14px;
  font-weight: 700;
  color: #1e40af;
  background: #eef2ff;
  cursor: pointer;
  transition: transform 0.2s ease, box-shadow 0.2s ease, background 0.2s ease;
}

.btn-secondary:hover:not(:disabled) {
  background: #e0e7ff;
  transform: translateY(-1px);
  box-shadow: 0 8px 18px rgba(59, 130, 246, 0.18);
}

.notice {
  margin-top: 12px;
  padding: 10px 12px;
  border-radius: 8px;
}

.notice.is-success {
  background: #dcfce7;
  color: #166534;
}

.notice.is-error {
  background: #fee2e2;
  color: #991b1b;
}

.table-wrapper {
  overflow-x: auto;
  margin-top: 14px;
}

.applications-table {
  width: 100%;
  border-collapse: collapse;
}

.applications-table th,
.applications-table td {
  border-bottom: 1px solid var(--border-color);
  padding: 10px 8px;
  text-align: left;
  vertical-align: top;
}

.status-badge {
  display: inline-block;
  padding: 4px 10px;
  border-radius: 999px;
  font-size: 0.82rem;
  font-weight: 700;
}

.status-badge.status-pending {
  background: #fff7ed;
  color: #c2410c;
}

.status-badge.status-accepted {
  background: #dcfce7;
  color: #166534;
}

.status-badge.status-rejected {
  background: #fee2e2;
  color: #b91c1c;
}

.status-badge.status-cancelled {
  background: #e2e8f0;
  color: #475569;
}

.empty-state,
.loading-state {
  margin-top: 10px;
  color: var(--text-light);
}

.favorites-layout {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 16px;
  margin-top: 14px;
}

.favorites-column h3 {
  margin: 0 0 12px;
}

.favorites-splide {
  padding: 0 38px 26px;
}

.favorites-splide :deep(.splide__track) {
  padding: 2px 0 8px;
}

.favorites-splide :deep(.splide__arrow) {
  width: 32px;
  height: 32px;
  background: var(--primary-blue);
  opacity: 1;
}

.favorites-splide :deep(.splide__arrow svg) {
  fill: white;
}

.favorites-splide :deep(.splide__pagination) {
  bottom: 0;
}

.favorites-splide :deep(.splide__pagination__page.is-active) {
  background: var(--primary-blue);
}

.favorite-card {
  display: flex;
  gap: 12px;
  padding: 12px;
  border: 1px solid var(--border-color);
  border-radius: 12px;
  background: #f8fafc;
  min-height: 132px;
}

.favorite-image {
  width: 86px;
  height: 86px;
  border-radius: 10px;
  object-fit: cover;
  background: white;
}

.favorite-code {
  min-width: 86px;
  height: 86px;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, var(--primary-blue), var(--primary-green));
  color: white;
  font-weight: 800;
  text-align: center;
  padding: 8px;
}

.favorite-content {
  min-width: 0;
  flex: 1;
}

.favorite-content h4 {
  margin: 0 0 6px;
}

.favorite-content p {
  margin: 0;
  color: var(--text-light);
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.favorite-actions {
  display: flex;
  gap: 10px;
  align-items: center;
  margin-top: 10px;
}

.btn-link-danger {
  border: none;
  background: transparent;
  color: #b91c1c;
  cursor: pointer;
  font-weight: 700;
}

.text-muted {
  color: var(--text-light);
}

.reviews-grid {
  display: grid;
  gap: 14px;
  margin-top: 14px;
}

.dashboard-review-card {
  padding: 16px;
  border: 1px solid var(--border-color);
  border-radius: 12px;
  background: #f8fafc;
}

.review-card-header,
.review-actions {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  align-items: flex-start;
}

.review-card-header h3 {
  margin: 0 0 4px;
}

.review-card-header p,
.review-text {
  margin: 0;
}

.review-card-header p {
  color: var(--text-light);
}

.review-stars {
  display: inline-flex;
  gap: 5px;
  color: #f59e0b;
  white-space: nowrap;
}

.review-text {
  margin-top: 12px;
  line-height: 1.6;
}

.review-actions {
  align-items: center;
  flex-wrap: wrap;
  margin-top: 14px;
}

.review-actions > div {
  display: inline-flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
}

.password-actions {
  margin-top: 12px;
}

@media (max-width: 768px) {
  .grid {
    grid-template-columns: 1fr;
  }

  .favorites-layout {
    grid-template-columns: 1fr;
  }

  .favorites-splide {
    padding: 0 32px 26px;
  }
}
</style>
