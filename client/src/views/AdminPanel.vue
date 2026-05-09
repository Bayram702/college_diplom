<template>
  <div class="admin-panel">
    

    <!-- Вкладки -->
    <div class="container">
      <div class="tabs">
        <button
          class="tab-btn"
          :class="{ active: activeTab === 'users' }"
          @click="activeTab = 'users'"
        >
          <i class="fas fa-users"></i> Пользователи
        </button>
        <button
          class="tab-btn"
          :class="{ active: activeTab === 'colleges' }"
          @click="activeTab = 'colleges'"
        >
          <i class="fas fa-graduation-cap"></i> Колледжи
        </button>
        <button
          class="tab-btn"
          :class="{ active: activeTab === 'sectors' }"
          @click="activeTab = 'sectors'"
        >
          <i class="fas fa-layer-group"></i> Отрасли
        </button>
        <button
          class="tab-btn"
          :class="{ active: activeTab === 'settings' }"
          @click="activeTab = 'settings'"
        >
          <i class="fas fa-cog"></i> Настройки
        </button>
      </div>
    </div>

    <!-- Основной контент -->
    <div class="container">
      <!-- Уведомления -->
      <div v-if="alertMessage" :class="['alert', `alert-${alertType}`]">
        <i :class="alertType === 'success' ? 'fas fa-check-circle' : 'fas fa-info-circle'"></i>
        <div>{{ alertMessage }}</div>
      </div>

      <!-- Вкладка: Пользователи -->
      <div v-if="activeTab === 'users'" class="tab-content active">
        <div class="specialities-header">
          <div class="search-box">
            <i class="fas fa-search"></i>
            <input v-model="userSearch" type="text" placeholder="Поиск пользователей..." @input="debouncedSearch">
          </div>
          <button class="btn-add" @click="openAddRepModal">
            <i class="fas fa-user-plus"></i> Добавить представителя колледжа
          </button>
        </div>

        <!-- Фильтры -->
        <div class="filters-bar">
          <select v-model="userFilters.status" @change="resetUserPagination" class="filter-select">
            <option value="all">Все статусы</option>
            <option value="active">Активные</option>
            <option value="inactive">Неактивные</option>
            <option value="blocked">Заблокированные</option>
          </select>
          <select v-model="userFilters.role" @change="resetUserPagination" class="filter-select">
            <option value="all">Все роли</option>
            <option value="college_rep">Представители</option>
            <option value="applicant">Абитуриенты</option>
          </select>
        </div>

        <!-- Таблица пользователей -->
        <div v-if="usersLoading" class="loading-state">
          <i class="fas fa-spinner fa-spin"></i> Загрузка...
        </div>
        <div v-else-if="usersError" class="error-state">
          <i class="fas fa-exclamation-triangle"></i> {{ usersError }}
          <button @click="fetchUsers" class="btn-retry">Повторить</button>
        </div>
        <div v-else class="table-container">
          <table class="data-table">
            <thead>
              <tr>
                <th>Номер</th>
                <th>Пользователь</th>
                <th>Логин</th>
                <th>Email</th>
                <th>Роль</th>
                <th>Колледж</th>
                <th>Статус</th>
                <th>Дата регистрации</th>
                <th>Последняя активность</th>
                <th>Действия</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="user in users" :key="user.id">
                <td>{{ user.id }}</td>
                <td>
                  <div class="user-info">
                    <span>{{ user.name }}</span>
                  </div>
                </td>
                <td>{{ user.login }}</td>
                <td>{{ user.email }}</td>
                <td>
                  <span class="role-badge" :class="user.role?.name">{{ getRoleName(user.role?.name) }}</span>
                </td>
                <td>
                  <span>{{ getUserCollegeName(user) }}</span>
                </td>
                <td>
                  <span class="status-badge" :class="getStatusClass(user.status)">{{ getStatusName(user.status) }}</span>
                </td>
                <td>{{ formatDate(user.createdAt) }}</td>
                <td>{{ formatDateTime(user.lastActivityAt) }}</td>
                <td>
                  <div v-if="['college_rep', 'applicant'].includes(user.role?.name)" class="action-buttons">
                    <button class="btn-icon btn-edit" @click="editUser(user)" title="Редактировать">
                      <i class="fas fa-edit"></i>
                    </button>
                    <button
                      class="btn-icon btn-delete"
                      :disabled="user.status === 'inactive'"
                      @click="deactivateUser(user)"
                      title="Сделать неактивным"
                    >
                      <i class="fas fa-ban"></i>
                    </button>
                  </div>
                  <span v-else class="text-muted">—</span>
                </td>
              </tr>
            </tbody>
          </table>

          <!-- Пагинация -->
          <div v-if="userPagination.totalPages > 1" class="pagination">
            <button class="page-btn" :disabled="userPagination.page === 1" @click="changeUserPage(userPagination.page - 1)">
              <i class="fas fa-chevron-left"></i>
            </button>
            <button v-for="page in visibleUserPages" :key="page" class="page-btn" :class="{ active: userPagination.page === page }" @click="changeUserPage(page)">
              {{ page }}
            </button>
            <button class="page-btn" :disabled="userPagination.page === userPagination.totalPages" @click="changeUserPage(userPagination.page + 1)">
              <i class="fas fa-chevron-right"></i>
            </button>
          </div>
        </div>
      </div>

      <!-- Вкладка: Колледжи -->
      <div v-if="activeTab === 'colleges'" class="tab-content active">
        <div class="specialities-header">
          <div class="search-box">
            <i class="fas fa-search"></i>
            <input v-model="collegeSearch" type="text" placeholder="Поиск колледжей..." @input="filterColleges">
          </div>
          <button class="btn-add" @click="openAddCollegeModal">
            <i class="fas fa-plus"></i> Добавить колледж
          </button>
        </div>
        <div class="filters-bar">
          <select v-model="collegeFilter" @change="filterColleges" class="filter-select">
            <option value="all">Все колледжи</option>
            <option value="active">Активные</option>
            <option value="with_rep">С представителем</option>
            <option value="without_rep">Без представителя</option>
          </select>
        </div>

        <div v-if="collegesLoading" class="loading-state">
          <i class="fas fa-spinner fa-spin"></i> Загрузка...
        </div>
        <div v-else-if="collegesError" class="error-state">
          <i class="fas fa-exclamation-triangle"></i> {{ collegesError }}
          <button @click="fetchColleges" class="btn-retry">Повторить</button>
        </div>
        <div v-else class="table-container">
          <table class="data-table">
            <thead>
              <tr>
                <th>Номер</th>
                <th>Колледж</th>
                <th>Город</th>
                <th>Статус</th>
                <th>Профессионалитет</th>
                <th>Представитель</th>
                <th>Обновлен</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="college in filteredCollegesList" :key="college.id">
                <td>{{ college.id }}</td>
                <td>
                  <div class="college-info">
                    <strong>{{ college.name }}</strong>
                    <span class="short-name">{{ college.short_name }}</span>
                  </div>
                </td>
                <td>{{ college.city }}</td>
                <td>
                  <span class="status-badge" :class="getStatusClass(college.status)">{{ getStatusName(college.status) }}</span>
                </td>
                <td>
                  <span v-if="college.is_professionalitet" class="prof-badge">
                    <i class="fas fa-check-circle"></i> {{ college.professionalitet_cluster || 'Да' }}
                  </span>
                  <span v-else class="text-muted">Нет</span>
                </td>
                <td>
                  <div v-if="college.representatives.length > 0" class="rep-list">
                    <div v-for="rep in college.representatives" :key="rep.id" class="rep-item">
                      <i class="fas fa-user"></i> {{ rep.name }}
                      <span class="rep-status" :class="rep.status">{{ getStatusName(rep.status) }}</span>
                    </div>
                  </div>
                  <span v-else class="text-muted"><i class="fas fa-user-slash"></i> Нет</span>
                </td>
                <td>{{ formatDate(college.updated_at) }}</td>
              </tr>
            </tbody>
          </table>
          <div v-if="filteredCollegesList.length === 0" class="empty-state">
            <i class="fas fa-graduation-cap"></i>
            <p>Колледжи не найдены</p>
          </div>
        </div>
      </div>

      <div v-if="activeTab === 'sectors'" class="tab-content active">
        <div class="sector-editor">
          <h3>{{ editingSector ? 'Редактировать отрасль' : 'Новая отрасль' }}</h3>
          <form class="sector-form" @submit.prevent="saveSector">
            <div class="form-row">
              <div class="form-group">
                <label>Название <span class="required">*</span></label>
                <input v-model="sectorForm.name" type="text" class="form-control" required>
              </div>
              <div class="form-group">
                <label>Первые цифры кода <span class="required">*</span></label>
                <input v-model="sectorForm.code" type="text" class="form-control" placeholder="09.00.00" inputmode="numeric" required>
                <small class="form-hint">Например, для 09.02.07 будет сохранено 09.00.00.</small>
              </div>
            </div>
            <div class="form-group">
              <label>Описание</label>
              <textarea v-model="sectorForm.description" class="form-control" rows="3"></textarea>
            </div>
            <div class="form-row">
              <div class="form-group">
                <label>Порядок</label>
                <input v-model.number="sectorForm.sort_order" type="number" class="form-control" min="0">
              </div>
              <label class="checkbox-label">
                <input v-model="sectorForm.is_active" type="checkbox">
                Активна
              </label>
            </div>
            <div class="form-actions">
              <button type="submit" class="btn btn-primary" :disabled="saving">
                <i :class="saving ? 'fas fa-spinner fa-spin' : 'fas fa-save'"></i>
                {{ saving ? 'Сохранение...' : 'Сохранить отрасль' }}
              </button>
              <button v-if="editingSector" type="button" class="btn btn-secondary" @click="resetSectorForm">Отмена</button>
            </div>
          </form>
        </div>

        <div v-if="sectorsLoading" class="loading-state">
          <i class="fas fa-spinner fa-spin"></i> Загрузка отраслей...
        </div>
        <div v-else-if="sectorsError" class="error-state">
          <i class="fas fa-exclamation-triangle"></i> {{ sectorsError }}
          <button @click="fetchSectors" class="btn-retry">Повторить</button>
        </div>
        <div v-else class="table-container">
          <table class="data-table">
            <thead>
              <tr>
                <th>Код</th>
                <th>Отрасль</th>
                <th>Специальности</th>
                <th>Колледжи</th>
                <th>Статус</th>
                <th>Действия</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="sector in sectors" :key="sector.id">
                <td><strong>{{ sector.code }}</strong></td>
                <td>
                  <div class="college-info">
                    <strong>{{ sector.name }}</strong>
                    <span v-if="sector.description" class="short-name">{{ sector.description }}</span>
                  </div>
                </td>
                <td>{{ sector.programs_count || 0 }}</td>
                <td>{{ sector.colleges_count || 0 }}</td>
                <td>
                  <span class="status-badge" :class="sector.is_active ? 'status-active' : 'status-inactive'">
                    {{ sector.is_active ? 'Активна' : 'Скрыта' }}
                  </span>
                </td>
                <td>
                  <div class="action-buttons">
                    <button class="btn-icon btn-edit" @click="editSector(sector)" title="Редактировать">
                      <i class="fas fa-edit"></i>
                    </button>
                    <button class="btn-icon btn-delete" @click="deleteSector(sector)" title="Удалить">
                      <i class="fas fa-trash"></i>
                    </button>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
          <div v-if="sectors.length === 0" class="empty-state">
            <i class="fas fa-layer-group"></i>
            <p>Отрасли ещё не созданы</p>
          </div>
        </div>
      </div>

      <!-- Вкладка: Настройки -->
      <div v-if="activeTab === 'settings'" class="tab-content active">
        <div class="settings-editor admin-settings-card">
          <div class="specialities-header">
            <h3>Данные администратора</h3>
            <button class="btn btn-secondary" type="button" @click="loadAdminProfile">
              <i class="fas fa-sync-alt"></i> Обновить
            </button>
          </div>

          <form class="admin-settings-form" @submit.prevent="saveAdminProfile">
            <div class="form-row">
              <div class="form-group">
                <label>Имя <span class="required">*</span></label>
                <input v-model="adminProfileForm.name" type="text" class="form-control" required>
              </div>
              <div class="form-group">
                <label>Email <span class="required">*</span></label>
                <input v-model="adminProfileForm.email" type="email" class="form-control" required>
              </div>
            </div>
            <div class="form-row">
              <div class="form-group">
                <label>Телефон</label>
                <input v-model="adminProfileForm.phone" type="tel" class="form-control" placeholder="+7XXXXXXXXXX">
              </div>
              <div class="form-group form-actions-inline">
                <button type="submit" class="btn btn-primary" :disabled="saving">
                  <i class="fas fa-save"></i> Сохранить данные
                </button>
              </div>
            </div>
          </form>

          <form class="admin-settings-form" @submit.prevent="changeAdminPassword">
            <div class="form-row">
              <div class="form-group">
                <label>Текущий пароль <span class="required">*</span></label>
                <input v-model="adminPasswordForm.currentPassword" type="password" class="form-control" autocomplete="current-password" required>
              </div>
              <div class="form-group">
                <label>Новый пароль <span class="required">*</span></label>
                <input v-model="adminPasswordForm.newPassword" type="password" class="form-control" autocomplete="new-password" required>
              </div>
            </div>
            <div class="form-actions">
              <button type="submit" class="btn btn-primary" :disabled="saving">
                <i class="fas fa-key"></i> Сменить пароль
              </button>
            </div>
          </form>
        </div>

        <div class="settings-editor">
          <div class="specialities-header">
            <h3>Настройки портала</h3>
            <button class="btn btn-secondary" type="button" @click="fetchSettings">
              <i class="fas fa-sync-alt"></i> Обновить
            </button>
          </div>

          <div v-if="settingsLoading" class="loading-state">
            <i class="fas fa-spinner fa-spin"></i> Загрузка настроек...
          </div>
          <div v-else-if="settingsError" class="error-state">
            <i class="fas fa-exclamation-triangle"></i> {{ settingsError }}
            <button @click="fetchSettings" class="btn-retry">Повторить</button>
          </div>
          <div v-else class="table-container">
            <table class="data-table settings-table">
              <thead>
                <tr>
                  <th>Ключ</th>
                  <th>Значение</th>
                  <th>Описание</th>
                  <th>Действия</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="setting in settingsList" :key="setting.key">
                  <td><strong>{{ setting.key }}</strong></td>
                  <td>
                    <textarea v-model="setting.value" class="form-control" rows="2"></textarea>
                  </td>
                  <td>
                    <input v-model="setting.description" type="text" class="form-control">
                  </td>
                  <td>
                    <button class="btn btn-primary" type="button" :disabled="saving" @click="saveSetting(setting)">
                      <i class="fas fa-save"></i> Сохранить
                    </button>
                  </td>
                </tr>
              </tbody>
            </table>
            <div v-if="settingsList.length === 0" class="empty-state">
              <i class="fas fa-cog"></i>
              <p>Настройки ещё не созданы</p>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Модальное окно пользователя -->
    <div class="modal-overlay" :class="{ active: showUserModal }" @click.self="closeUserModal" v-show="showUserModal">
      <div class="modal">
        <button class="close-modal" @click="closeUserModal">&times;</button>
        <h2>{{ editingUser ? 'Редактировать представителя' : 'Добавить представителя колледжа' }}</h2>
        <form @submit.prevent="saveUser" class="modal-form">
          <div class="form-row">
            <div class="form-group">
              <label>Имя <span class="required">*</span></label>
              <input v-model="userForm.name" type="text" class="form-control" required>
            </div>
            <div class="form-group">
              <label>Логин <span class="required">*</span></label>
              <input v-model="userForm.login" type="text" class="form-control" required>
            </div>
          </div>
          <div class="form-row">
            <div class="form-group">
              <label>Email <span class="required">*</span></label>
              <input v-model="userForm.email" type="email" class="form-control" required>
              <small v-if="!editingUser" class="form-hint">📧 На этот email будут отправлены логин и пароль для входа</small>
            </div>
            <div class="form-group">
              <label v-if="!editingUser">Пароль <span class="required">*</span></label>
              <label v-else>Новый пароль</label>
              <input :type="showPassword ? 'text' : 'password'" v-model="userForm.password" class="form-control" :required="!editingUser">
            </div>
          </div>
          <div class="form-row">
            <div class="form-group">
              <label>Колледж <span class="required">*</span></label>
              <select v-model="userForm.college_id" class="form-control" required>
                <option value="">Выберите колледж</option>
                <option v-for="c in availableColleges" :key="c.id" :value="c.id">{{ c.name }}</option>
              </select>
              <small class="form-hint">В списке только колледжи без активного представителя</small>
            </div>
            <div class="form-group">
              <label>Статус</label>
              <select v-model="userForm.status" class="form-control">
                <option value="active">Активный</option>
                <option value="inactive">Неактивный</option>
                <option value="blocked">Заблокирован</option>
              </select>
            </div>
          </div>
          <div class="form-actions">
            <button type="submit" class="btn btn-primary" :disabled="saving">
              <i :class="saving ? 'fas fa-spinner fa-spin' : 'fas fa-save'"></i> {{ saving ? 'Сохранение...' : 'Сохранить' }}
            </button>
            <button type="button" class="btn btn-secondary" @click="closeUserModal">Отмена</button>
          </div>
        </form>
      </div>
    </div>

    <!-- Модальное окно колледжа -->
    <div class="modal-overlay" :class="{ active: showCollegeModal }" @click.self="closeCollegeModal" v-show="showCollegeModal">
      <div class="modal">
        <button class="close-modal" @click="closeCollegeModal">&times;</button>
        <h2>Добавить колледж</h2>
        <form @submit.prevent="saveCollege" class="modal-form">
          <div class="form-row">
            <div class="form-group">
              <label>Название колледжа <span class="required">*</span></label>
              <input v-model="collegeForm.name" type="text" class="form-control" required>
            </div>
            <div class="form-group">
              <label>Краткое название</label>
              <input v-model="collegeForm.shortName" type="text" class="form-control" placeholder="Например: УПК">
            </div>
          </div>

          <div class="form-row">
            <div class="form-group">
              <label>Город</label>
              <input v-model="collegeForm.city" type="text" class="form-control" placeholder="Уфа">
            </div>
            <div class="form-group">
              <label>Email</label>
              <input v-model="collegeForm.email" type="email" class="form-control">
            </div>
          </div>

          <div class="form-row">
            <div class="form-group">
              <label>Телефон</label>
              <input v-model="collegeForm.phone" type="text" class="form-control">
            </div>
            <div class="form-group">
              <label>Сайт</label>
              <input v-model="collegeForm.website" type="url" class="form-control" placeholder="https://">
            </div>
          </div>

          <div class="form-group">
            <label>Описание</label>
            <textarea v-model="collegeForm.description" class="form-control" rows="4"></textarea>
          </div>

          <div class="form-actions">
            <button type="submit" class="btn btn-primary" :disabled="saving">
              <i :class="saving ? 'fas fa-spinner fa-spin' : 'fas fa-save'"></i>
              {{ saving ? 'Сохранение...' : 'Создать колледж' }}
            </button>
            <button type="button" class="btn btn-secondary" @click="closeCollegeModal">Отмена</button>
          </div>
        </form>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import { useRouter } from 'vue-router'
import axios from 'axios'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api'
const router = useRouter()

const activeTab = ref('users')
const alertMessage = ref('')
const alertType = ref('info')
const saving = ref(false)

// Пользователи
const users = ref([])
const usersLoading = ref(false)
const usersError = ref(null)
const userSearch = ref('')
const userFilters = ref({ status: 'all', role: 'all' })
const userPagination = ref({ total: 0, page: 1, limit: 10, totalPages: 0 })

// Настройки
const settingsList = ref([])
const settingsLoading = ref(false)
const settingsError = ref(null)
const adminProfileForm = ref({ name: '', email: '', phone: '' })
const adminPasswordForm = ref({ currentPassword: '', newPassword: '' })

// Колледжи
const colleges = ref([])
const collegesLoading = ref(false)
const collegesError = ref(null)
const collegeSearch = ref('')
const collegeFilter = ref('all')
const filteredCollegesList = ref([])
const showCollegeModal = ref(false)
const collegeForm = ref({ name: '', shortName: '', city: '', description: '', phone: '', email: '', website: '' })

// Отрасли
const sectors = ref([])
const sectorsLoading = ref(false)
const sectorsError = ref(null)
const editingSector = ref(null)
const sectorForm = ref({ name: '', code: '', description: '', sort_order: 0, is_active: true })

// Модальное окно
const showUserModal = ref(false)
const editingUser = ref(null)
const showPassword = ref(false)
const userForm = ref({ name: '', login: '', email: '', password: '', status: '', college_id: '' })
const availableColleges = ref([])

// Загрузка списка колледжей для модалки
const loadCollegesForSelect = async (currentUserId = null, currentCollegeId = null) => {
  try {
    const token = localStorage.getItem('authToken')
    const res = await axios.get(`${API_URL}/colleges/admin/list`, { headers: { 'Authorization': `Bearer ${token}` } })
    if (res.data.success) {
      availableColleges.value = res.data.data.filter((college) => {
        const hasOtherActiveRep = college.representatives?.some((rep) => {
          return rep.status === 'active' && rep.id !== currentUserId
        })

        return !hasOtherActiveRep || college.id === currentCollegeId
      })
    }
  } catch (e) { console.warn('Колледжи не загружены:', e) }
}

let searchTimeout = null

onMounted(() => {
  const token = localStorage.getItem('authToken')
  if (token) axios.defaults.headers.common['Authorization'] = `Bearer ${token}`
  syncAdminProfileFromStorage()
  fetchUsers()
})

watch(activeTab, (tab) => {
  if (tab === 'colleges' && colleges.value.length === 0) fetchColleges()
  if (tab === 'sectors' && sectors.value.length === 0) fetchSectors()
  if (tab === 'settings') {
    loadAdminProfile()
    if (settingsList.value.length === 0) fetchSettings()
  }
})

// Пользователи
const fetchUsers = async () => {
  usersLoading.value = true
  usersError.value = null
  try {
    const token = localStorage.getItem('authToken')
    // all=true — получаем ВСЕХ пользователей напрямую из БД без исключения админов
    const params = new URLSearchParams({
      page: userPagination.value.page,
      limit: userPagination.value.limit,
      portal_users: 'true'
    })
    if (userFilters.value.status !== 'all') params.append('status', userFilters.value.status)
    if (userFilters.value.role !== 'all') params.append('role', userFilters.value.role)
    if (userSearch.value.trim()) params.append('search', userSearch.value.trim())

    const response = await axios.get(`${API_URL}/users?${params.toString()}`, { headers: { 'Authorization': `Bearer ${token}` } })
    if (response.data.success) {
      users.value = response.data.data
      userPagination.value = response.data.pagination
    }
  } catch (err) {
    usersError.value = err.response?.status === 401 ? 'Сессия истекла' : err.message
    if (err.response?.status === 401) { localStorage.removeItem('authToken'); localStorage.removeItem('user'); router.push('/login') }
  } finally { usersLoading.value = false }
}

const debouncedSearch = () => {
  clearTimeout(searchTimeout)
  searchTimeout = setTimeout(() => { userPagination.value.page = 1; fetchUsers() }, 300)
}

const resetUserPagination = () => {
  userPagination.value.page = 1
  fetchUsers()
}

const changeUserPage = (page) => {
  if (page >= 1 && page <= userPagination.value.totalPages) { userPagination.value.page = page; fetchUsers() }
}

const visibleUserPages = computed(() => {
  const pages = []; const total = userPagination.value.totalPages; const current = userPagination.value.page
  if (total <= 7) { for (let i = 1; i <= total; i++) pages.push(i) } else { pages.push(1, '...', total) }
  return pages
})

const getRoleName = (role) => ({ admin: 'Администратор', college_rep: 'Представитель', applicant: 'Абитуриент', editor: 'Редактор', user: 'Пользователь' }[role] || role)
const getStatusName = (status) => ({ active: 'Активный', inactive: 'Неактивный', blocked: 'Заблокирован' }[status] || status)
const getStatusClass = (status) => ({ active: 'status-active', inactive: 'status-inactive', blocked: 'status-blocked' }[status] || '')
const formatDate = (d) => d ? new Date(d).toLocaleDateString('ru-RU') : '—'
const formatDateTime = (d) => d ? new Date(d).toLocaleString('ru-RU') : '—'
const getUserCollegeName = (user) => user.role?.name === 'applicant' ? '—' : (user.college?.name || 'Не назначен')

const syncAdminProfileFromStorage = () => {
  try {
    const raw = localStorage.getItem('user')
    const user = raw ? JSON.parse(raw) : null
    if (user?.role?.name === 'admin') {
      adminProfileForm.value = {
        name: user.name || '',
        email: user.email || '',
        phone: user.phone || ''
      }
    }
  } catch {
    adminProfileForm.value = { name: '', email: '', phone: '' }
  }
}

const loadAdminProfile = async () => {
  const token = localStorage.getItem('authToken')
  if (!token) return

  try {
    const response = await axios.get(`${API_URL}/auth/me`, {
      headers: { Authorization: `Bearer ${token}` }
    })
    const user = response.data?.data?.user
    if (response.data.success && user?.role?.name === 'admin') {
      adminProfileForm.value = {
        name: user.name || '',
        email: user.email || '',
        phone: user.phone || ''
      }
      localStorage.setItem('user', JSON.stringify(user))
    }
  } catch (err) {
    console.warn('Не удалось загрузить данные администратора:', err)
  }
}

const saveAdminProfile = async () => {
  saving.value = true
  try {
    const token = localStorage.getItem('authToken')
    const response = await axios.put(`${API_URL}/auth/me`, adminProfileForm.value, {
      headers: { Authorization: `Bearer ${token}` }
    })
    if (response.data.success) {
      localStorage.setItem('user', JSON.stringify(response.data.data.user))
      alertMessage.value = 'Данные администратора сохранены'
      alertType.value = 'success'
    }
  } catch (err) {
    alertMessage.value = 'Ошибка сохранения данных администратора: ' + (err.response?.data?.error || err.message)
    alertType.value = 'error'
  } finally {
    saving.value = false
  }
}

const changeAdminPassword = async () => {
  saving.value = true
  try {
    const token = localStorage.getItem('authToken')
    await axios.post(`${API_URL}/auth/admin/password`, adminPasswordForm.value, {
      headers: { Authorization: `Bearer ${token}` }
    })
    adminPasswordForm.value = { currentPassword: '', newPassword: '' }
    alertMessage.value = 'Пароль администратора обновлён'
    alertType.value = 'success'
  } catch (err) {
    alertMessage.value = 'Ошибка смены пароля: ' + (err.response?.data?.error || err.message)
    alertType.value = 'error'
  } finally {
    saving.value = false
  }
}

const fetchSettings = async () => {
  settingsLoading.value = true
  settingsError.value = null
  try {
    const response = await axios.get(`${API_URL}/settings`)
    if (response.data.success) {
      settingsList.value = Object.entries(response.data.data).map(([key, setting]) => ({
        key,
        value: setting.value ?? '',
        description: setting.description ?? ''
      }))
    }
  } catch (err) {
    settingsError.value = err.message || 'Не удалось загрузить настройки'
  } finally {
    settingsLoading.value = false
  }
}

const saveSetting = async (setting) => {
  saving.value = true
  try {
    await axios.put(`${API_URL}/settings/${encodeURIComponent(setting.key)}`, {
      value: setting.value,
      description: setting.description
    })
    alertMessage.value = 'Настройка сохранена'
    alertType.value = 'success'
  } catch (err) {
    alertMessage.value = 'Ошибка сохранения настройки: ' + (err.response?.data?.error || err.message)
    alertType.value = 'error'
  } finally {
    saving.value = false
  }
}

const openAddRepModal = () => {
  console.log('👤 openAddRepModal вызван')
  editingUser.value = null
  userForm.value = { name: '', login: '', email: '', password: '', status: 'active', college_id: '' }
  showPassword.value = false
  showUserModal.value = true
  console.log('👤 showUserModal =', showUserModal.value)
  loadCollegesForSelect()
}
const closeUserModal = () => { showUserModal.value = false }
const editUser = (user) => {
  if (user.role?.name !== 'college_rep') {
    alertMessage.value = 'Редактирование доступно только для представителей колледжа'
    alertType.value = 'info'
    return
  }

  editingUser.value = user
  userForm.value = {
    name: user.name || '',
    login: user.login || '',
    email: user.email || '',
    password: '',
    status: user.status || 'active',
    college_id: user.college?.id || ''
  }
  showUserModal.value = true
  loadCollegesForSelect(user.id, user.college?.id || null)
}

const saveUser = async () => {
  if (!userForm.value.college_id) {
    alertMessage.value = 'Выберите колледж для представителя'; alertType.value = 'error'; return
  }
  if (!userForm.value.email?.trim()) {
    alertMessage.value = 'Email обязателен — на него будут отправлены логин и пароль'; alertType.value = 'error'; return
  }
  saving.value = true
  try {
    const token = localStorage.getItem('authToken')
    const body = {
      name: userForm.value.name,
      login: userForm.value.login,
      email: userForm.value.email,
      password: userForm.value.password,
      status: userForm.value.status,
      college_id: userForm.value.college_id
    }

    if (editingUser.value && !body.password) {
      delete body.password
    }

    let response
    if (editingUser.value) {
      response = await axios.put(`${API_URL}/users/${editingUser.value.id}`, body, { headers: { Authorization: `Bearer ${token}` } })
    } else {
      response = await axios.post(`${API_URL}/users`, body, { headers: { Authorization: `Bearer ${token}` } })
    }
    closeUserModal()
    fetchUsers()

    // Показываем результат отправки email
    if (editingUser.value && response.data.password_email_sent) {
      alertMessage.value = `Пароль представителя изменен. Новый пароль отправлен на ${userForm.value.email}`
      alertType.value = 'success'
    } else if (editingUser.value && response.data.credentials) {
      const emailError = response.data.password_email_error ? ` Email: ${response.data.password_email_error}.` : ' SMTP не настроен.'
      alertMessage.value = `Пароль представителя изменен.${emailError} Логин: ${response.data.credentials.login}, Новый пароль: ${response.data.credentials.password}`
      alertType.value = 'info'
    } else if (response.data.email_sent) {
      alertMessage.value = `Представитель создан. Email с логином и паролем отправлен на ${userForm.value.email}`
      alertType.value = 'success'
    } else if (response.data.credentials) {
      const emailError = response.data.email_error ? ` Email: ${response.data.email_error}.` : ' SMTP не настроен.'
      alertMessage.value = `Представитель создан.${emailError} Логин: ${response.data.credentials.login}, Пароль: ${response.data.credentials.password}`
      alertType.value = 'info'
    } else {
      alertMessage.value = 'Представитель сохранён'
      alertType.value = 'success'
    }
  } catch (e) { alertMessage.value = 'Ошибка: ' + (e.response?.data?.error || e.message); alertType.value = 'error' }
  finally { saving.value = false }
}

const deactivateUser = async (user) => {
  const roleName = getRoleName(user.role?.name).toLowerCase()
  if (user.status === 'inactive') {
    alertMessage.value = `Пользователь "${user.name}" уже неактивен`
    alertType.value = 'info'
    return
  }
  
  if (!confirm(`Сделать ${roleName} "${user.name}" неактивным? Пользователь потеряет доступ к системе.`)) return
  
  try {
    const token = localStorage.getItem('authToken')
    await axios.delete(`${API_URL}/users/${user.id}`, { headers: { Authorization: `Bearer ${token}` } })
    fetchUsers()
    alertMessage.value = `Пользователь "${user.name}" переведён в неактивные`
    alertType.value = 'success'
  } catch (e) { 
    alertMessage.value = 'Ошибка деактивации: ' + (e.response?.data?.error || e.message)
    alertType.value = 'error' 
  }
}

// Колледжи
const fetchColleges = async () => {
  collegesLoading.value = true; collegesError.value = null
  try {
    const token = localStorage.getItem('authToken')
    const response = await axios.get(`${API_URL}/colleges/admin/list`, { headers: { 'Authorization': `Bearer ${token}` } })
    if (response.data.success) { colleges.value = response.data.data; filteredCollegesList.value = colleges.value }
  } catch (err) {
    collegesError.value = err.response?.status === 401 ? 'Сессия истекла' : err.message
    if (err.response?.status === 401) { localStorage.removeItem('authToken'); localStorage.removeItem('user'); router.push('/login') }
  } finally { collegesLoading.value = false }
}

const filterColleges = () => {
  let filtered = [...colleges.value]
  if (collegeSearch.value.trim()) {
    const s = collegeSearch.value.trim().toLowerCase()
    filtered = filtered.filter(c => c.name.toLowerCase().includes(s) || c.short_name?.toLowerCase().includes(s) || c.city.toLowerCase().includes(s))
  }
  if (collegeFilter.value === 'active') filtered = filtered.filter(c => c.status === 'active')
  else if (collegeFilter.value === 'with_rep') filtered = filtered.filter(c => c.representatives.length > 0)
  else if (collegeFilter.value === 'without_rep') filtered = filtered.filter(c => c.representatives.length === 0)
  filteredCollegesList.value = filtered
}

const openAddCollegeModal = () => {
  collegeForm.value = { name: '', shortName: '', city: '', description: '', phone: '', email: '', website: '' }
  showCollegeModal.value = true
}

const closeCollegeModal = () => {
  showCollegeModal.value = false
}

const saveCollege = async () => {
  if (!collegeForm.value.name?.trim()) {
    alertMessage.value = 'Введите название колледжа'
    alertType.value = 'error'
    return
  }

  saving.value = true
  try {
    const token = localStorage.getItem('authToken')
    await axios.post(`${API_URL}/colleges`, {
      name: collegeForm.value.name.trim(),
      shortName: collegeForm.value.shortName.trim(),
      city: collegeForm.value.city.trim(),
      description: collegeForm.value.description.trim(),
      phone: collegeForm.value.phone.trim(),
      email: collegeForm.value.email.trim(),
      website: collegeForm.value.website.trim()
    }, { headers: { Authorization: `Bearer ${token}` } })

    closeCollegeModal()
    await fetchColleges()
    filterColleges()
    alertMessage.value = 'Колледж создан'
    alertType.value = 'success'
  } catch (err) {
    alertMessage.value = 'Ошибка создания колледжа: ' + (err.response?.data?.error || err.message)
    alertType.value = 'error'
  } finally {
    saving.value = false
  }
}

const fetchSectors = async () => {
  sectorsLoading.value = true
  sectorsError.value = null
  try {
    const response = await axios.get(`${API_URL}/sectors?include_inactive=1&catalog_only=1`)
    if (response.data.success) sectors.value = response.data.data
  } catch (err) {
    sectorsError.value = err.message || 'Не удалось загрузить отрасли'
  } finally {
    sectorsLoading.value = false
  }
}

const resetSectorForm = () => {
  editingSector.value = null
  sectorForm.value = { name: '', code: '', description: '', sort_order: 0, is_active: true }
}

const editSector = (sector) => {
  editingSector.value = sector
  sectorForm.value = {
    name: sector.name || '',
    code: sector.code || '',
    description: sector.description || '',
    sort_order: Number(sector.sort_order) || 0,
    is_active: sector.is_active !== false
  }
}

const saveSector = async () => {
  const rawCode = String(sectorForm.value.code || '').trim()
  const prefix = rawCode.match(/^(\d{1,2})\./)?.[1] || rawCode.match(/^\d{1,2}/)?.[0] || ''
  const code = prefix ? `${prefix.padStart(2, '0')}.00.00` : ''
  if (!sectorForm.value.name?.trim()) {
    alertMessage.value = 'Введите название отрасли'
    alertType.value = 'error'
    return
  }
  if (!code) {
    alertMessage.value = 'Введите первые цифры кода специальности'
    alertType.value = 'error'
    return
  }

  saving.value = true
  try {
    const payload = { ...sectorForm.value, code }
    if (editingSector.value) {
      await axios.put(`${API_URL}/sectors/${editingSector.value.id}`, payload)
      alertMessage.value = 'Отрасль обновлена'
    } else {
      await axios.post(`${API_URL}/sectors`, payload)
      alertMessage.value = 'Отрасль создана'
    }
    alertType.value = 'success'
    resetSectorForm()
    await fetchSectors()
  } catch (err) {
    alertMessage.value = 'Ошибка сохранения отрасли: ' + (err.response?.data?.error || err.message)
    alertType.value = 'error'
  } finally {
    saving.value = false
  }
}

const deleteSector = async (sector) => {
  if (!confirm(`Удалить отрасль "${sector.name}"?`)) return
  try {
    await axios.delete(`${API_URL}/sectors/${sector.id}`)
    alertMessage.value = 'Отрасль удалена'
    alertType.value = 'success'
    if (editingSector.value?.id === sector.id) resetSectorForm()
    await fetchSectors()
  } catch (err) {
    alertMessage.value = 'Ошибка удаления отрасли: ' + (err.response?.data?.error || err.message)
    alertType.value = 'error'
  }
}

const logout = () => {
  if (confirm('Выйти из системы?')) {
    localStorage.removeItem('authToken'); localStorage.removeItem('user')
    delete axios.defaults.headers.common['Authorization']
    router.push('/login')
  }
}
</script>

<style scoped>
.admin-panel { min-height: 100vh; background: #f5f7fa; }

/* Хедер панели */
.panel-header { background: linear-gradient(135deg, #1e3c72 0%, #2a5298 100%); color: white; padding: 20px 0; margin-bottom: 0; }
.panel-header .header-content { display: flex; justify-content: space-between; align-items: center; }
.panel-header .logo { display: flex; align-items: center; gap: 15px; }
.panel-header .logo-icon { width: 50px; height: 50px; background: rgba(255,255,255,0.2); border-radius: 10px; display: flex; align-items: center; justify-content: center; font-weight: bold; font-size: 1.3rem; }
.panel-header h1 { margin: 0; font-size: 1.4rem; }
.panel-header p { margin: 3px 0 0; opacity: 0.8; font-size: 0.9rem; }
.panel-header .logout-btn { background: rgba(255,255,255,0.2); color: white; border: none; padding: 10px 20px; border-radius: 8px; cursor: pointer; font-weight: 600; display: flex; align-items: center; gap: 8px; transition: all 0.3s; }
.panel-header .logout-btn:hover { background: rgba(255,255,255,0.3); }

/* Вкладки */
.tabs { display: flex; gap: 8px; padding: 20px 0 0; }
.tab-btn { padding: 12px 24px; background: white; border: none; border-radius: 10px 10px 0 0; cursor: pointer; font-weight: 500; transition: all 0.3s; display: flex; align-items: center; gap: 8px; color: #64748b; border-bottom: 3px solid transparent; }
.tab-btn:hover { background: #e2e8f0; }
.tab-btn.active { background: white; color: #1e3c72; border-bottom-color: #1e3c72; box-shadow: 0 -2px 10px rgba(0,0,0,0.05); }

/* Контент вкладок */
.tab-content { display: none; padding: 30px 0; }
.tab-content.active { display: block; }

/* Уведомления */
.alert { padding: 14px 18px; border-radius: 10px; margin-bottom: 20px; display: flex; align-items: center; gap: 10px; }
.alert-success { background: #d1fae5; color: #059669; }
.alert-error { background: #fee2e2; color: #dc2626; }
.alert-info { background: #dbeafe; color: #2563eb; }

/* Поиск и фильтры */
.specialities-header { display: flex; gap: 15px; margin-bottom: 15px; align-items: center; }
.search-box { flex: 1; max-width: 400px; position: relative; }
.search-box i { position: absolute; left: 15px; top: 50%; transform: translateY(-50%); color: #94a3b8; }
.search-box input { width: 100%; padding: 12px 15px 12px 45px; border: 1px solid #e1e8ed; border-radius: 8px; }
.btn-add { padding: 12px 24px; background: linear-gradient(135deg, #667eea, #764ba2); color: white; border: none; border-radius: 8px; font-weight: 600; cursor: pointer; display: flex; align-items: center; gap: 8px; transition: all 0.3s; }
.btn-add:hover { transform: translateY(-2px); box-shadow: 0 5px 15px rgba(102,126,234,0.4); }
.filters-bar { display: flex; gap: 15px; margin-bottom: 20px; }
.filter-select { padding: 10px 15px; border: 1px solid #e1e8ed; border-radius: 8px; background: white; }
.sector-editor { background: white; border-radius: 12px; padding: 20px; margin-bottom: 20px; box-shadow: 0 2px 10px rgba(0,0,0,0.05); }
.sector-editor h3 { margin: 0 0 16px; color: #1e293b; }
.sector-form { display: flex; flex-direction: column; gap: 16px; }
.checkbox-label { display: flex; align-items: center; gap: 10px; margin-top: 30px; color: #475569; font-weight: 600; }
.checkbox-label input { width: 18px; height: 18px; }
.settings-editor { background: white; border-radius: 12px; padding: 20px; box-shadow: 0 2px 10px rgba(0,0,0,0.05); }
.admin-settings-card { margin-bottom: 20px; }
.settings-editor .specialities-header { justify-content: space-between; }
.settings-editor h3 { margin: 0; color: #1e293b; }
.settings-table textarea { min-width: 260px; resize: vertical; }
.admin-settings-form { padding-top: 16px; border-top: 1px solid #f1f5f9; margin-top: 16px; }
.form-actions-inline { display: flex; align-items: flex-end; }

/* Таблица */
.table-container { background: white; border-radius: 12px; overflow-x: auto; overflow-y: hidden; box-shadow: 0 2px 10px rgba(0,0,0,0.05); }
.data-table { width: 100%; min-width: 1180px; border-collapse: collapse; }
.data-table th { background: #f8fafc; padding: 15px; text-align: left; font-weight: 600; color: #475569; border-bottom: 2px solid #e1e8ed; }
.data-table td { padding: 15px; border-bottom: 1px solid #f1f5f9; }
.data-table tbody tr:hover { background: #f8fafc; }

.user-info { display: flex; align-items: center; gap: 12px; }

.role-badge, .status-badge { padding: 5px 12px; border-radius: 20px; font-size: 0.85rem; font-weight: 500; display: inline-block; }
.role-badge.college_rep { background: #d1fae5; color: #059669; }
.role-badge.admin { background: #fee2e2; color: #dc2626; }
.role-badge.editor { background: #dbeafe; color: #2563eb; }
.role-badge.user { background: #f3e8ff; color: #7c3aed; }
.role-badge.applicant { background: #ffedd5; color: #ea580c; }
.status-badge.status-active { background: #d1fae5; color: #059669; }
.status-badge.status-inactive { background: #fef3c7; color: #d97706; }
.status-badge.status-blocked { background: #fee2e2; color: #dc2626; }

.prof-badge { background: #d1fae5; color: #059669; padding: 4px 10px; border-radius: 12px; font-size: 0.8rem; font-weight: 500; display: inline-flex; align-items: center; gap: 5px; }
.rep-list { display: flex; flex-direction: column; gap: 4px; }
.rep-item { display: flex; align-items: center; gap: 6px; font-size: 0.85rem; }
.rep-status { font-size: 0.7rem; padding: 2px 6px; border-radius: 8px; }
.rep-status.active { background: #d1fae5; color: #059669; }
.rep-status.inactive { background: #fef3c7; color: #d97706; }
.rep-status.blocked { background: #fee2e2; color: #dc2626; }
.text-muted { color: #94a3b8; font-size: 0.85rem; }

.college-info { display: flex; flex-direction: column; gap: 4px; }
.college-info strong { color: #1e293b; }
.short-name { color: #64748b; font-size: 0.8rem; background: #f1f5f9; padding: 2px 8px; border-radius: 4px; display: inline-block; width: fit-content; }

.action-buttons { display: flex; gap: 8px; }
.btn-icon { width: 36px; height: 36px; border: none; border-radius: 6px; cursor: pointer; display: flex; align-items: center; justify-content: center; transition: all 0.3s; }
.btn-icon:disabled { opacity: 0.45; cursor: not-allowed; }
.btn-edit { background: #dbeafe; color: #2563eb; }
.btn-edit:hover { background: #2563eb; color: white; }
.btn-delete { background: #fef3c7; color: #d97706; }
.btn-delete:hover { background: #d97706; color: white; }

.pagination { display: flex; justify-content: center; gap: 8px; padding: 20px; border-top: 1px solid #f1f5f9; }
.page-btn { width: 40px; height: 40px; border: 1px solid #e1e8ed; background: white; border-radius: 8px; cursor: pointer; }
.page-btn:hover:not(:disabled) { background: #f1f5f9; }
.page-btn.active { background: linear-gradient(135deg, #667eea, #764ba2); color: white; border-color: transparent; }
.page-btn:disabled { opacity: 0.5; cursor: not-allowed; }

.loading-state, .error-state { text-align: center; padding: 60px 20px; color: #64748b; }
.loading-state i { font-size: 2rem; color: #667eea; }
.error-state { color: #dc2626; }
.btn-retry { margin-top: 15px; padding: 10px 20px; background: #667eea; color: white; border: none; border-radius: 8px; cursor: pointer; }
.empty-state { text-align: center; padding: 60px 20px; color: #64748b; }
.empty-state i { font-size: 3rem; color: #cbd5e1; margin-bottom: 15px; }

/* Модальное окно */
.modal-overlay { position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.5); display: flex; align-items: center; justify-content: center; z-index: 2000; }
.modal { background: white; border-radius: 16px; width: 90%; max-width: 600px; padding: 30px; position: relative; max-height: 90vh; overflow-y: auto; }
.close-modal { position: absolute; top: 20px; right: 20px; background: none; border: none; font-size: 1.5rem; cursor: pointer; color: #64748b; }
.modal h2 { margin: 0 0 25px 0; color: #1e293b; }
.modal-form { display: flex; flex-direction: column; gap: 20px; }
.form-row { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; }
.form-group label { display: block; margin-bottom: 8px; font-weight: 500; color: #475569; }
.form-control { width: 100%; padding: 12px 15px; border: 1px solid #e1e8ed; border-radius: 8px; font-size: 1rem; }
.form-actions { display: flex; gap: 15px; margin-top: 20px; }
.btn { padding: 12px 24px; border: none; border-radius: 8px; font-weight: 600; cursor: pointer; display: flex; align-items: center; gap: 8px; transition: all 0.3s; }
.btn-primary { background: linear-gradient(135deg, #667eea, #764ba2); color: white; }
.btn-primary:hover:not(:disabled) { transform: translateY(-2px); box-shadow: 0 5px 15px rgba(102,126,234,0.4); }
.btn-primary:disabled { opacity: 0.7; cursor: not-allowed; }
.btn-secondary { background: #f1f5f9; color: #475569; }
.btn-secondary:hover { background: #e2e8f0; }
.required { color: #dc2626; }
.form-hint { color: #94a3b8; font-size: 0.8rem; margin-top: 4px; display: block; }
</style>
