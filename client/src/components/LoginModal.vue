<template>
  <div class="modal-overlay" :class="{ active: isOpen }" @click.self="closeModal">
    <div class="auth-modal">
      <button class="close-modal" @click="closeModal">&times;</button>
      <h2>Вход в личный кабинет</h2>
      
      <form @submit.prevent="handleLogin">
        <div class="form-group">
          <label for="username">Логин</label>
          <input 
            v-model="form.username" 
            type="text" 
            id="username" 
            class="form-input" 
            placeholder="Введите логин" 
            required
            :disabled="loading"
          >
          <div class="error-message" v-if="errors.username">{{ errors.username }}</div>
        </div>
        
        <div class="form-group">
          <label for="password">Пароль</label>
          <div class="password-container">
            <input 
              :type="showPassword ? 'text' : 'password'" 
              v-model="form.password" 
              id="password" 
              class="form-input" 
              placeholder="Введите пароль" 
              required
              :disabled="loading"
            >
            <button type="button" class="toggle-password" @click="showPassword = !showPassword">
              <i :class="showPassword ? 'fas fa-eye-slash' : 'fas fa-eye'"></i>
            </button>
          </div>
          <div class="error-message" v-if="errors.password">{{ errors.password }}</div>
        </div>
        
        <div v-if="errorMessage" class="error-message global">
          {{ errorMessage }}
        </div>
        
        <button type="submit" class="submit-btn" :disabled="loading">
          <span v-if="loading">
            <i class="fas fa-spinner fa-spin"></i> Вход...
          </span>
          <span v-else>Войти</span>
        </button>
      </form>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive } from 'vue'
import axios from 'axios'
import { useRouter } from 'vue-router'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api'
const router = useRouter()

const props = defineProps({
  isOpen: Boolean
})

const emit = defineEmits(['close', 'login-success'])

const form = reactive({
  username: '',
  password: ''
})

const showPassword = ref(false)
const loading = ref(false)
const errorMessage = ref('')
const errors = reactive({
  username: '',
  password: ''
})

const closeModal = () => {
  emit('close')
  form.username = ''
  form.password = ''
  errorMessage.value = ''
  errors.username = ''
  errors.password = ''
}

const handleLogin = async () => {
  errorMessage.value = ''
  errors.username = ''
  errors.password = ''
  loading.value = true
  
  try {
    const response = await axios.post(`${API_URL}/auth/login`, {
      username: form.username,
      password: form.password
    })
    
    if (response.data.success) {
      const { user, token } = response.data.data
      
      // Сохраняем токен и данные пользователя
      localStorage.setItem('authToken', token)
      localStorage.setItem('user', JSON.stringify(user))
      
      // Устанавливаем заголовок по умолчанию для всех запросов
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`
      
      // Уведомляем родительский компонент об успешном входе
      emit('login-success', user)
      
      // Закрываем модалку
      closeModal()
      
      // Перенаправляем в зависимости от роли
      setTimeout(() => {
        redirectToDashboard(user.role.name)
      }, 300)
    }
    
  } catch (error) {
    console.error('Login error:', error)
    
    if (error.response) {
      if (error.response.status === 401) {
        errorMessage.value = error.response.data.error || 'Неверный логин или пароль'
      } else if (error.response.status === 400) {
        errorMessage.value = error.response.data.error || 'Ошибка валидации'
      } else {
        errorMessage.value = 'Ошибка сервера. Попробуйте позже.'
      }
    } else if (error.request) {
      errorMessage.value = 'Нет соединения с сервером. Проверьте подключение к интернету.'
    } else {
      errorMessage.value = 'Произошла ошибка. Попробуйте снова.'
    }
  } finally {
    loading.value = false
  }
}

const redirectToDashboard = (roleName) => {
  switch (roleName) {
    case 'admin':
      router.push('/admin')
      break
    case 'college_rep':
      router.push('/college-representative')
      break
    case 'applicant':
      router.push('/applicant')
      break
    case 'user':
      router.push('/')
      break
    default:
      router.push('/')
  }
}



// Добавьте watcher для отладки
import { watch } from 'vue'
watch(() => props.isOpen, (newVal) => {
  console.log('👁️ LoginModal: isOpen изменился на', newVal)
})
</script>

<style scoped>
.error-message.global {
  background: #ffebee;
  color: #c62828;
  padding: 10px;
  border-radius: 6px;
  margin-bottom: 15px;
  text-align: center;
  border-left: 4px solid #e74c3c;
}

.submit-btn:disabled {
  opacity: 0.7;
  cursor: not-allowed;
}

.submit-btn i {
  margin-right: 8px;
}
</style>
