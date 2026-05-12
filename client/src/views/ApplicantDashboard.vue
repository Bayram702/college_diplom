<template>
  <div class="applicant-dashboard">
    <div class="container dashboard-container">
      <section class="dashboard-nav-card">
        <div class="dashboard-tabs" role="tablist" aria-label="Разделы личного кабинета">
          <button
            v-for="tab in tabs"
            :key="tab.id"
            type="button"
            class="dashboard-tab"
            :class="{ active: activeTab === tab.id }"
            @click="activeTab = tab.id"
          >
            <i :class="tab.icon"></i>
            <span>{{ tab.label }}</span>
          </button>
        </div>

        <p v-if="pageError" class="notice is-error">{{ pageError }}</p>
      </section>

      <template v-if="activeTab === 'profile'">
        <section class="dashboard-card">
          <div class="applications-header">
            <h2>Личная информация</h2>
            <p class="applications-meta">Данные профиля и безопасность аккаунта</p>
          </div>

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
              <div class="form-group">
                <label for="profile-snils">СНИЛС</label>
                <input id="profile-snils" v-model="profileForm.snils" type="text" class="form-control" readonly />
              </div>
            </div>

            <div class="grid">
              <div class="form-group">
                <label for="profile-passport">Паспортные данные</label>
                <input id="profile-passport" v-model="profileForm.passport" type="text" class="form-control" readonly />
              </div>
              <div class="form-group">
                <label for="profile-avg-score">Средний балл аттестата <span class="required">*</span></label>
                <input
                  id="profile-avg-score"
                  v-model="profileForm.avg_score"
                  type="number"
                  min="2"
                  max="5"
                  step="0.01"
                  class="form-control"
                />
                <p v-if="profileErrors.avg_score" class="field-error">{{ profileErrors.avg_score }}</p>
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
          <div class="applications-header">
            <div>
              <h2>Документы к заявке</h2>
              <p class="applications-meta">Паспорт, аттестат, СНИЛС и согласие на обработку данных</p>
            </div>
            <button
              type="button"
              class="btn-secondary"
              @click="loadGosuslugiProfile"
              :disabled="gosuslugiLoading"
            >
              {{ gosuslugiLoading ? 'Загрузка...' : 'Данные из Госуслуг' }}
            </button>
          </div>

          <p v-if="documentMessage" :class="['notice', documentMessageType === 'error' ? 'is-error' : 'is-success']">
            {{ documentMessage }}
          </p>

          <div v-if="!hasPersonalDataConsent" class="consent-banner">
            <div>
              <strong>Нужно согласие на обработку персональных данных</strong>
              <p>Без согласия загрузка документов и получение данных из Госуслуг недоступны.</p>
            </div>
            <button type="button" class="btn-primary" @click="acceptPersonalDataConsent">Принять</button>
          </div>

          <div class="documents-grid">
            <article v-for="documentItem in applicationDocuments" :key="documentItem.type" class="document-card">
              <div>
                <h3>{{ documentItem.label }}</h3>
                <p>{{ documentItem.hint }}</p>
              </div>
              <div class="document-upload-row">
                <label class="document-upload-button">
                  <input
                    type="file"
                    accept=".pdf,image/jpeg,image/png,image/webp"
                    :disabled="!hasPersonalDataConsent || uploadingDocumentType === documentItem.type"
                    @change="uploadApplicationDocument(documentItem.type, $event)"
                  />
                  <span>{{ uploadingDocumentType === documentItem.type ? 'Загрузка...' : 'Выбрать файл' }}</span>
                </label>
                <span v-if="uploadedDocuments[documentItem.type]" class="document-status">
                  {{ uploadedDocuments[documentItem.type].originalName }}
                </span>
              </div>
            </article>
          </div>
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
      </template>

      <section v-if="activeTab === 'applications'" class="dashboard-card">
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
                <th>История</th>
                <th>Действия</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="item in applications" :key="item.id">
                <td>{{ item.college_name }}</td>
                <td>{{ item.specialty_code }} - {{ item.specialty_name }}</td>
                <td>{{ formatScore(item.avg_score) }}</td>
                <td>{{ item.needs_dormitory ? 'Да' : 'Нет' }}</td>
                <td>
                  <span class="status-badge" :class="statusClass(item.status)">
                    {{ statusLabel(item.status) }}
                  </span>
                </td>
                <td>{{ formatDate(item.created_at) }}</td>
                <td>
                  <div class="history-list">
                    <div v-for="entry in buildApplicationHistory(item)" :key="entry.key" class="history-item">
                      <strong>{{ entry.label }}</strong>
                      <span>{{ formatDate(entry.created_at) }}</span>
                      <small v-if="entry.actor">{{ entry.actor }}</small>
                    </div>
                  </div>
                </td>
                <td>
                  <button
                    v-if="item.status === 'pending'"
                    class="btn-link-danger"
                    @click="cancelApplication(item)"
                  >
                    Отменить
                  </button>
                  <span v-else class="text-muted">-</span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      <template v-if="activeTab === 'favorites'">
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
              <div class="favorites-list">
                <article v-for="college in favoriteColleges" :key="college.id" class="favorite-card">
                  <label class="compare-check">
                    <input
                      type="checkbox"
                      :checked="isSelectedForCompare('college', college.id)"
                      @change="toggleCompareSelection('college', college.id)"
                    />
                    <span>Сравнить</span>
                  </label>
                  <img :src="resolveImageUrl(college.logo_image_url)" :alt="college.name" class="favorite-image">
                  <div class="favorite-content">
                    <h4>{{ college.name }}</h4>
                    <p>{{ college.city_name || 'Город не указан' }}</p>
                    <div class="mini-rating">
                      <i class="fas fa-star"></i>
                      {{ formatNumber(college.review_average) }} · {{ college.review_count || 0 }} отзывов
                    </div>
                    <div class="favorite-actions">
                      <router-link :to="`/college/${college.id}`" class="btn-small">Открыть</router-link>
                      <button class="btn-link-danger" @click="removeFavorite('college', college.id)">Убрать</button>
                    </div>
                  </div>
                </article>
              </div>
            </div>

            <div v-if="favoriteSpecialties.length > 0" class="favorites-column">
              <h3>Специальности</h3>
              <div class="favorites-list">
                <article v-for="specialty in favoriteSpecialties" :key="specialty.id" class="favorite-card">
                  <label class="compare-check">
                    <input
                      type="checkbox"
                      :checked="isSelectedForCompare('specialty', specialty.id)"
                      @change="toggleCompareSelection('specialty', specialty.id)"
                    />
                    <span>Сравнить</span>
                  </label>
                  <div class="favorite-code">{{ specialty.code || '-' }}</div>
                  <div class="favorite-content">
                    <h4>{{ specialty.name }}</h4>
                    <p>{{ specialty.description || 'Описание не указано' }}</p>
                    <div class="favorite-actions">
                      <router-link :to="`/specialty/${specialty.id}`" class="btn-small">Открыть</router-link>
                      <button class="btn-link-danger" @click="removeFavorite('specialty', specialty.id)">Убрать</button>
                    </div>
                  </div>
                </article>
              </div>
            </div>
          </div>
        </section>

        <section class="dashboard-card">
          <div class="applications-header">
            <h2>Сравнение избранного</h2>
            <div class="compare-switch">
              <button type="button" :class="{ active: compareType === 'college' }" @click="compareType = 'college'">Колледжи</button>
              <button type="button" :class="{ active: compareType === 'specialty' }" @click="compareType = 'specialty'">Специальности</button>
            </div>
          </div>

          <p class="compare-hint">
            Отметьте минимум два элемента в избранном, чтобы сравнить их по основным параметрам.
          </p>

          <div v-if="activeCompareItems.length < 2" class="empty-state">
            Выбрано: {{ activeCompareItems.length }}. Нужно выбрать минимум 2.
          </div>

          <div v-else class="table-wrapper compare-wrapper">
            <table class="compare-table">
              <thead>
                <tr>
                  <th>Параметр</th>
                  <th v-for="item in activeCompareItems" :key="`${compareType}-${item.id}`">
                    {{ item.name }}
                  </th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="row in activeCompareRows" :key="row.key">
                  <td>{{ row.label }}</td>
                  <td v-for="item in activeCompareItems" :key="`${row.key}-${item.id}`">
                    {{ row.get(item) }}
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
      </template>
    </div>

    <div v-if="showConsentModal" class="consent-overlay" @click.self="showConsentModal = false">
      <div class="consent-modal">
        <h2>Согласие на обработку данных</h2>
        <p>
          Для загрузки документов и получения сведений из Госуслуг нужно подтвердить согласие
          на обработку персональных данных в рамках подачи заявки.
        </p>
        <div class="consent-actions">
          <button type="button" class="btn-primary" @click="acceptPersonalDataConsent">Согласен</button>
          <button type="button" class="btn-secondary" @click="showConsentModal = false">Позже</button>
        </div>
      </div>
    </div>

    <div v-if="showCompetitionModal" class="competition-overlay" @click.self="closeCompetitionModal">
      <div class="competition-modal">
        <button class="competition-close" type="button" @click="closeCompetitionModal">&times;</button>
        <div class="applications-header">
          <div>
            <h2>Конкурсный рейтинг</h2>
            <p v-if="competitionData" class="applications-meta">
              {{ competitionData.specialty.code }} - {{ competitionData.specialty.name }}
            </p>
          </div>
        </div>

        <div v-if="competitionLoading" class="loading-state">Загрузка конкурса...</div>
        <div v-else-if="competitionError" class="notice is-error">{{ competitionError }}</div>
        <template v-else-if="competitionData">
          <div class="competition-summary">
            <div class="competition-summary-card is-primary">
              <span>Ваше место</span>
              <strong v-if="competitionData.myApplication">
                {{ competitionData.myApplication.rank }} из {{ competitionData.stats.applications_count }}
              </strong>
              <strong v-else>-</strong>
            </div>
            <div class="competition-summary-card">
              <span>Бюджетные места</span>
              <strong>{{ competitionData.places.budget || 'Не указано' }}</strong>
            </div>
            <div class="competition-summary-card">
              <span>Платные места</span>
              <strong>{{ competitionData.places.commercial || 'Не указано' }}</strong>
            </div>
            <div class="competition-summary-card">
              <span>Проходной прошлого года</span>
              <strong>{{ formatScore(competitionData.stats.last_year_threshold) }}</strong>
            </div>
            <div class="competition-summary-card">
              <span>Текущий бюджетный порог</span>
              <strong>{{ formatScore(competitionData.stats.current_budget_threshold) }}</strong>
            </div>
            <div class="competition-summary-card">
              <span>Шанс</span>
              <strong>{{ getChanceLabel(competitionData.myApplication?.chance) }}</strong>
            </div>
          </div>

          <div class="table-wrapper competition-table-wrapper">
            <table class="applications-table">
              <thead>
                <tr>
                  <th>Место</th>
                  <th>Абитуриент</th>
                  <th>Балл</th>
                  <th>Тип места</th>
                  <th>Статус</th>
                  <th>Шанс</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="row in competitionData.ranking" :key="row.application_id" :class="{ 'is-mine': row.is_mine }">
                  <td>{{ row.rank }}</td>
                  <td>{{ row.applicant_label }}</td>
                  <td>{{ formatScore(row.avg_score) }}</td>
                  <td>{{ getPlaceTypeLabel(row.place_type) }}</td>
                  <td>
                    <span class="status-badge" :class="statusClass(row.status)">
                      {{ statusLabel(row.status) }}
                    </span>
                  </td>
                  <td>
                    <span class="chance-badge" :class="`chance-${row.chance}`">
                      {{ getChanceLabel(row.chance) }}
                    </span>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </template>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, onMounted, ref } from 'vue'
import axios from 'axios'
import { maskRussianPhoneInput, normalizeRussianPhone, formatRussianPhone } from '../utils/phone'
import { resolveImageUrl } from '../utils/images'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api'
const PERSONAL_DATA_CONSENT_KEY = 'applicantPersonalDataConsent'

const applicationDocuments = [
  { type: 'passport', label: 'Паспорт', hint: 'Разворот с фото и данными' },
  { type: 'certificate', label: 'Аттестат', hint: 'Скан или PDF документа об образовании' },
  { type: 'snils', label: 'СНИЛС', hint: 'Скан СНИЛС или подтверждение номера' },
  { type: 'consent', label: 'Согласие', hint: 'Подписанное согласие на обработку данных' }
]

const tabs = [
  { id: 'profile', label: 'Личная информация', icon: 'fas fa-user' },
  { id: 'applications', label: 'Заявки', icon: 'fas fa-file-alt' },
  { id: 'favorites', label: 'Избранное и отзывы', icon: 'fas fa-star' }
]

const activeTab = ref('profile')
const compareType = ref('college')
const selectedCollegeIds = ref([])
const selectedSpecialtyIds = ref([])

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
const documentMessage = ref('')
const documentMessageType = ref('success')
const gosuslugiLoading = ref(false)
const uploadingDocumentType = ref('')
const uploadedDocuments = ref({})
const hasPersonalDataConsent = ref(localStorage.getItem(PERSONAL_DATA_CONSENT_KEY) === 'accepted')
const showConsentModal = ref(!hasPersonalDataConsent.value)

const profileForm = ref({
  name: '',
  email: '',
  phone: '',
  snils: '',
  passport: '',
  avg_score: ''
})

const profileErrors = ref({
  name: '',
  email: '',
  phone: '',
  avg_score: ''
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

const isAnyLoading = computed(
  () => loadingProfile.value || loadingApplications.value || loadingFavorites.value || loadingReviews.value
)

const selectedIds = computed(() => compareType.value === 'college' ? selectedCollegeIds.value : selectedSpecialtyIds.value)
const activeCompareItems = computed(() => {
  const source = compareType.value === 'college' ? favoriteColleges.value : favoriteSpecialties.value
  const ids = new Set(selectedIds.value.map(Number))
  return source.filter(item => ids.has(Number(item.id)))
})

const collegeCompareRows = [
  { key: 'city', label: 'Город', get: item => item.city_name || 'Не указан' },
  { key: 'rating', label: 'Рейтинг', get: item => `${formatNumber(item.review_average)} из 5` },
  { key: 'specialties_count', label: 'Количество специальностей', get: item => item.specialties_count || 0 },
  { key: 'budget', label: 'Бюджетные места по специальностям', get: item => item.budget_places || 0 },
  { key: 'commercial', label: 'Коммерческие места по специальностям', get: item => item.commercial_places || 0 },
  { key: 'avg_score', label: 'Средний балл', get: item => formatScore(item.avg_score) },
  { key: 'min_score', label: 'Минимальный балл', get: item => formatScore(item.min_score) },
  { key: 'professionalitet', label: 'Профессионалитет', get: item => item.is_professionalitet ? 'Да' : 'Нет' }
]

const specialtyCompareRows = [
  { key: 'code', label: 'Код', get: item => item.code || '-' },
  { key: 'qualification', label: 'Квалификация', get: item => item.qualification || '-' },
  { key: 'duration', label: 'Срок обучения', get: item => item.duration || '-' },
  { key: 'base', label: 'База', get: item => formatBaseEducation(item.base_education) },
  { key: 'form', label: 'Форма', get: item => formatStudyForm(item.form) },
  { key: 'score', label: 'Средний балл прошлого года', get: item => formatScore(item.avg_score_last_year) },
  { key: 'description', label: 'Описание', get: item => item.description || '-' }
]

const activeCompareRows = computed(() => compareType.value === 'college' ? collegeCompareRows : specialtyCompareRows)

const getToken = () => localStorage.getItem('authToken')

const acceptPersonalDataConsent = () => {
  localStorage.setItem(PERSONAL_DATA_CONSENT_KEY, 'accepted')
  hasPersonalDataConsent.value = true
  showConsentModal.value = false
  documentMessage.value = 'Согласие принято'
  documentMessageType.value = 'success'
}

const ensurePersonalDataConsent = () => {
  if (hasPersonalDataConsent.value) return true

  showConsentModal.value = true
  documentMessage.value = 'Сначала подтвердите согласие на обработку персональных данных'
  documentMessageType.value = 'error'
  return false
}

const loadGosuslugiProfile = async () => {
  if (!ensurePersonalDataConsent()) return

  const token = getToken()
  if (!token) return

  gosuslugiLoading.value = true
  documentMessage.value = ''
  try {
    const response = await axios.get(`${API_URL}/gosuslugi/profile`, {
      headers: { Authorization: `Bearer ${token}` }
    })
    const profile = response.data?.data
    if (!profile) return

    profileForm.value.name = profile.name || profileForm.value.name
    profileForm.value.email = profile.email || profileForm.value.email
    profileForm.value.phone = profile.phone ? formatRussianPhone(profile.phone) : profileForm.value.phone
    profileForm.value.snils = profile.snils || profileForm.value.snils
    profileForm.value.passport = `${profile.passport_series || ''} ${profile.passport_number || ''}`.trim() || profileForm.value.passport
    documentMessage.value = 'Данные из Госуслуг загружены'
    documentMessageType.value = 'success'
  } catch (error) {
    documentMessage.value = error.response?.data?.error || 'Не удалось получить данные из Госуслуг'
    documentMessageType.value = 'error'
  } finally {
    gosuslugiLoading.value = false
  }
}

const uploadApplicationDocument = async (documentType, event) => {
  const file = event?.target?.files?.[0]
  if (!file) return

  if (!ensurePersonalDataConsent()) {
    event.target.value = ''
    return
  }

  const token = getToken()
  if (!token) return

  const formData = new FormData()
  formData.append('documentType', documentType)
  formData.append('document', file)

  uploadingDocumentType.value = documentType
  documentMessage.value = ''
  try {
    const response = await axios.post(`${API_URL}/upload/application-document`, formData, {
      headers: { Authorization: `Bearer ${token}` }
    })
    uploadedDocuments.value = {
      ...uploadedDocuments.value,
      [documentType]: response.data?.data || { originalName: file.name }
    }
    documentMessage.value = 'Документ загружен'
    documentMessageType.value = 'success'
  } catch (error) {
    documentMessage.value = error.response?.data?.error || 'Не удалось загрузить документ'
    documentMessageType.value = 'error'
  } finally {
    uploadingDocumentType.value = ''
    event.target.value = ''
  }
}

const formatNumber = (value) => {
  const number = Number(value || 0)
  return Number.isFinite(number) ? number.toFixed(1) : '0.0'
}

const formatScore = (value) => {
  const number = Number(value)
  return Number.isFinite(number) ? number.toFixed(2) : '-'
}

const formatBaseEducation = (value) => {
  if (value === '9') return '9 классов'
  if (value === '11') return '11 классов'
  return value || '-'
}

const formatStudyForm = (value) => {
  const forms = {
    'full-time': 'Очная',
    'part-time': 'Заочная',
    distance: 'Дистанционная'
  }
  return forms[value] || value || '-'
}

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
      syncCompareSelection()
    }
  } finally {
    loadingFavorites.value = false
  }
}

const syncCompareSelection = () => {
  const collegeIds = new Set(favoriteColleges.value.map(item => Number(item.id)))
  const specialtyIds = new Set(favoriteSpecialties.value.map(item => Number(item.id)))
  selectedCollegeIds.value = selectedCollegeIds.value.filter(id => collegeIds.has(Number(id)))
  selectedSpecialtyIds.value = selectedSpecialtyIds.value.filter(id => specialtyIds.has(Number(id)))
}

const isSelectedForCompare = (type, id) => {
  const list = type === 'college' ? selectedCollegeIds.value : selectedSpecialtyIds.value
  return list.some(item => Number(item) === Number(id))
}

const toggleCompareSelection = (type, id) => {
  const target = type === 'college' ? selectedCollegeIds : selectedSpecialtyIds
  const parsedId = Number(id)
  if (target.value.some(item => Number(item) === parsedId)) {
    target.value = target.value.filter(item => Number(item) !== parsedId)
  } else {
    target.value = [...target.value, parsedId]
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
    selectedCollegeIds.value = selectedCollegeIds.value.filter(item => Number(item) !== Number(entityId))
  } else {
    favoriteSpecialties.value = favoriteSpecialties.value.filter(item => Number(item.id) !== Number(entityId))
    selectedSpecialtyIds.value = selectedSpecialtyIds.value.filter(item => Number(item) !== Number(entityId))
  }
}

const statusClass = (value) => {
  if (value === 'accepted') return 'status-accepted'
  if (value === 'rejected') return 'status-rejected'
  if (value === 'cancelled') return 'status-cancelled'
  return 'status-pending'
}

const formatDate = (value) => {
  if (!value) return '-'
  return new Date(value).toLocaleString('ru-RU')
}

const applicationHistoryLabel = (entry) => {
  if (entry.action === 'submitted') return 'Подана'
  if (entry.action === 'cancelled') return 'Отменена'
  if (entry.new_status === 'accepted') return 'Принята'
  if (entry.new_status === 'rejected') return 'Отклонена'
  return 'Изменена'
}

const buildApplicationHistory = (application) => {
  const rawHistory = Array.isArray(application.history) ? application.history : []
  const hasSubmitted = rawHistory.some((entry) => entry.action === 'submitted')
  const hasFinalStatus = rawHistory.some((entry) => ['accepted', 'rejected', 'cancelled'].includes(entry.new_status))
  const rows = [...rawHistory]

  if (!hasSubmitted && application.created_at) {
    rows.unshift({
      action: 'submitted',
      new_status: 'pending',
      actor_name: 'Вы',
      created_at: application.created_at
    })
  }

  if (!hasFinalStatus && application.status === 'accepted' && application.decided_at) {
    rows.push({
      action: 'status_changed',
      old_status: 'pending',
      new_status: 'accepted',
      actor_name: application.decided_by_name,
      created_at: application.decided_at
    })
  }

  if (!hasFinalStatus && application.status === 'cancelled' && application.updated_at) {
    rows.push({
      action: 'cancelled',
      old_status: 'pending',
      new_status: 'cancelled',
      actor_name: 'Вы',
      created_at: application.updated_at
    })
  }

  return rows
    .filter((entry) => entry.created_at)
    .sort((a, b) => new Date(a.created_at) - new Date(b.created_at))
    .map((entry, index) => ({
      ...entry,
      key: `${entry.id || entry.action}-${entry.created_at}-${index}`,
      label: applicationHistoryLabel(entry),
      actor: entry.actor_name || (entry.actor_user_id ? `ID ${entry.actor_user_id}` : '')
    }))
}

const resetProfileErrors = () => {
  profileErrors.value = { name: '', email: '', phone: '', avg_score: '' }
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
  const avgScore = Number(profileForm.value.avg_score)
  const scaledAvgScore = Math.round(avgScore * 100)
  if (!Number.isFinite(avgScore) || avgScore < 2 || avgScore > 5 || Math.abs(avgScore * 100 - scaledAvgScore) > 1e-8) {
    profileErrors.value.avg_score = 'Средний балл должен быть от 2.00 до 5.00 с шагом 0.01'
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
      phone: user.phone ? formatRussianPhone(user.phone) : '',
      snils: '',
      passport: `${user.passport_series || ''} ${user.passport_number || ''}`.trim(),
      avg_score: formatScore(user.avg_score)
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

    passwordMessage.value = response.data?.message || 'Пароль успешно изменен'
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
      phone: profileForm.value.phone.trim() ? normalizeRussianPhone(profileForm.value.phone) : null,
      avg_score: Number(profileForm.value.avg_score).toFixed(2)
    }

    const response = await axios.put(`${API_URL}/auth/me`, payload, {
      headers: { Authorization: `Bearer ${token}` }
    })

    const user = response.data?.data?.user
    if (user) {
      localStorage.setItem('user', JSON.stringify(user))
      profileForm.value.phone = user.phone ? formatRussianPhone(user.phone) : ''
      profileForm.value.passport = `${user.passport_series || ''} ${user.passport_number || ''}`.trim()
      profileForm.value.avg_score = formatScore(user.avg_score)
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

.dashboard-nav-card {
  background: #fff;
  border: 1px solid var(--border-color);
  border-radius: 12px;
  padding: 10px;
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

.applications-meta,
.compare-hint {
  margin: 6px 0 0;
  color: var(--text-light);
  font-weight: 600;
}

.dashboard-tabs {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
  padding: 6px;
  border: 1px solid var(--border-color);
  border-radius: 12px;
  background: linear-gradient(135deg, rgba(0, 84, 166, 0.06), rgba(0, 166, 81, 0.08));
}

.dashboard-tab {
  min-height: 42px;
  border: none;
  border-radius: 9px;
  padding: 10px 14px;
  display: inline-flex;
  align-items: center;
  gap: 8px;
  color: var(--text-dark);
  background: transparent;
  font-weight: 800;
  cursor: pointer;
}

.dashboard-tab.active {
  background: var(--primary-blue);
  color: #fff;
  box-shadow: 0 8px 18px rgba(0, 84, 166, 0.18);
}

.consent-banner {
  margin-top: 16px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 14px;
  padding: 14px;
  border: 1px solid #bfdbfe;
  border-radius: 10px;
  background: #eff6ff;
}

.consent-banner p {
  margin: 4px 0 0;
  color: var(--text-light);
}

.documents-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
  margin-top: 16px;
}

.document-card {
  display: grid;
  gap: 12px;
  padding: 14px;
  border: 1px solid var(--border-color);
  border-radius: 10px;
  background: #f8fafc;
}

.document-card h3,
.document-card p {
  margin: 0;
}

.document-card p,
.document-status {
  color: var(--text-light);
}

.document-upload-row {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
}

.document-upload-button input {
  display: none;
}

.document-upload-button span {
  display: inline-flex;
  align-items: center;
  min-height: 38px;
  padding: 8px 12px;
  border: 1px solid #c7d2fe;
  border-radius: 8px;
  color: #1e40af;
  background: #eef2ff;
  font-weight: 800;
  cursor: pointer;
}

.document-upload-button input:disabled + span {
  opacity: 0.65;
  cursor: not-allowed;
}

.consent-overlay {
  position: fixed;
  inset: 0;
  z-index: 2300;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 18px;
  background: rgba(15, 23, 42, 0.62);
}

.consent-modal {
  width: min(520px, 100%);
  padding: 22px;
  border-radius: 12px;
  background: #fff;
  box-shadow: 0 20px 50px rgba(15, 23, 42, 0.25);
}

.consent-modal p {
  margin: 12px 0 0;
  color: var(--text-light);
  line-height: 1.6;
}

.consent-actions {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
  margin-top: 18px;
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

.actions,
.password-actions {
  margin-top: 16px;
}

.btn-primary {
  border: none;
  border-radius: 12px;
  padding: 12px 20px;
  font-weight: 800;
  letter-spacing: 0;
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

.applications-table,
.compare-table {
  width: 100%;
  border-collapse: collapse;
}

.applications-table th,
.applications-table td,
.compare-table th,
.compare-table td {
  border-bottom: 1px solid var(--border-color);
  padding: 10px 8px;
  text-align: left;
  vertical-align: top;
}

.compare-table th:first-child,
.compare-table td:first-child {
  min-width: 160px;
  font-weight: 800;
  color: var(--text-dark);
}

.compare-table th:not(:first-child),
.compare-table td:not(:first-child) {
  min-width: 220px;
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

.favorites-list {
  display: grid;
  gap: 12px;
}

.favorite-card {
  position: relative;
  display: flex;
  gap: 12px;
  padding: 14px;
  border: 1px solid var(--border-color);
  border-radius: 12px;
  background: #f8fafc;
  min-height: 132px;
}

.compare-check {
  position: absolute;
  right: 12px;
  top: 12px;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 5px 8px;
  border-radius: 999px;
  background: #fff;
  border: 1px solid var(--border-color);
  font-size: 0.78rem;
  font-weight: 800;
  color: var(--text-dark);
  cursor: pointer;
}

.favorite-image {
  width: 86px;
  height: 86px;
  border-radius: 10px;
  object-fit: cover;
  background: white;
  flex-shrink: 0;
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
  padding-right: 88px;
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

.mini-rating {
  display: inline-flex;
  gap: 5px;
  align-items: center;
  margin-top: 8px;
  color: #f59e0b;
  font-weight: 700;
}

.favorite-actions {
  display: flex;
  gap: 10px;
  align-items: center;
  margin-top: 10px;
}

.compare-switch {
  display: inline-flex;
  padding: 4px;
  border: 1px solid var(--border-color);
  border-radius: 10px;
  background: #f8fafc;
}

.compare-switch button {
  border: none;
  border-radius: 7px;
  padding: 8px 12px;
  background: transparent;
  color: var(--text-dark);
  font-weight: 800;
  cursor: pointer;
}

.compare-switch button.active {
  background: var(--primary-blue);
  color: #fff;
}

.compare-wrapper {
  margin-top: 16px;
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

.history-list {
  display: grid;
  gap: 8px;
  min-width: 180px;
}

.history-item {
  display: grid;
  gap: 2px;
  padding-left: 10px;
  border-left: 2px solid #bfdbfe;
  color: var(--text-light);
  font-size: 0.82rem;
}

.history-item strong {
  color: var(--text-dark);
}

.history-item small {
  color: #64748b;
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

@media (max-width: 768px) {
  .grid,
  .documents-grid,
  .favorites-layout {
    grid-template-columns: 1fr;
  }

  .consent-banner {
    align-items: flex-start;
    flex-direction: column;
  }

  .dashboard-tab {
    flex: 1 1 100%;
    justify-content: center;
  }

  .favorite-card {
    flex-direction: column;
  }

  .favorite-content {
    padding-right: 0;
  }

  .compare-check {
    position: static;
    align-self: flex-start;
  }
}
</style>
