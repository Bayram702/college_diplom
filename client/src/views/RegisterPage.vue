<template>
  <div class="register-page">
    <div class="register-container">
      <div class="register-card">
        <div class="register-header">
          <h1><i class="fas fa-user-plus"></i> Регистрация абитуриента</h1>
          <p>Создайте аккаунт для просмотра колледжей и специальностей</p>
        </div>

        <!-- Уведомления -->
        <div v-if="alertMessage" :class="['alert', `alert-${alertType}`]">
          <i :class="alertType === 'success' ? 'fas fa-check-circle' : 'fas fa-exclamation-circle'"></i>
          <div>{{ alertMessage }}</div>
        </div>

        <form @submit.prevent="handleRegister" class="register-form">
          <div class="form-group">
            <label for="name">ФИО <span class="required">*</span></label>
            <input
              v-model="form.name"
              type="text"
              id="name"
              class="form-control"
              placeholder="Иванов Иван Иванович"
              required
            >
          </div>

          <div class="form-group">
            <label for="login">Логин <span class="required">*</span></label>
            <input
              v-model="form.login"
              type="text"
              id="login"
              class="form-control"
              placeholder="Придумайте логин"
              required
            >
            <small class="form-hint">Логин будет использоваться для входа в систему</small>
          </div>

          <div class="form-group">
            <label for="email">Email <span class="required">*</span></label>
            <input
              v-model="form.email"
              type="email"
              id="email"
              class="form-control"
              placeholder="example@email.com"
              required
            >
          </div>

          <div class="form-group">
            <label for="phone">Телефон</label>
            <input
              v-model="form.phone"
              @input="onPhoneInput"
              type="tel"
              id="phone"
              class="form-control"
              placeholder="+7 (999) 123-45-67"
            >
          </div>

          <div class="form-group">
            <label for="passport">Паспортные данные <span class="required">*</span></label>
            <input
              v-model="form.passport"
              @input="onPassportInput"
              type="text"
              id="passport"
              class="form-control"
              placeholder="0000 000000"
              inputmode="numeric"
              maxlength="11"
              required
            >
          </div>

          <div class="form-group">
            <label for="avgScore">Средний балл аттестата <span class="required">*</span></label>
            <input
              v-model="form.avg_score"
              type="number"
              id="avgScore"
              class="form-control"
              min="2"
              max="5"
              step="0.01"
              placeholder="4.67"
              required
            >
          </div>

          <div class="form-group">
            <label for="password">Пароль <span class="required">*</span></label>
            <div class="password-input-wrapper">
              <input
                v-model="form.password"
                :type="showPassword ? 'text' : 'password'"
                id="password"
                class="form-control"
                placeholder="Минимум 6 символов"
                required
                minlength="6"
              >
              <button
                type="button"
                class="toggle-password"
                @click="showPassword = !showPassword"
              >
                <i :class="showPassword ? 'fas fa-eye-slash' : 'fas fa-eye'"></i>
              </button>
            </div>
          </div>

          <div class="form-group">
            <label for="passwordConfirm">Подтверждение пароля <span class="required">*</span></label>
            <input
              v-model="form.passwordConfirm"
              :type="showPassword ? 'text' : 'password'"
              id="passwordConfirm"
              class="form-control"
              placeholder="Повторите пароль"
              required
            >
          </div>

          <div class="form-group">
            <label class="checkbox-label">
              <input type="checkbox" v-model="form.agreeTerms" required>
              <span>Я согласен на обработку <router-link to="/privacy">персональных данных</router-link></span>
            </label>
          </div>

          <button type="submit" class="btn btn-primary btn-register" :disabled="registering">
            <i :class="registering ? 'fas fa-spinner fa-spin' : 'fas fa-user-plus'"></i>
            {{ registering ? 'Регистрация...' : 'Зарегистрироваться' }}
          </button>
        </form>

        <div class="register-footer">
          <p>Уже есть аккаунт? <router-link to="/login">Войти</router-link></p>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import axios from 'axios'
import { maskRussianPhoneInput, normalizeRussianPhone } from '../utils/phone'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api'
const router = useRouter()

const alertMessage = ref('')
const alertType = ref('info')
const registering = ref(false)
const showPassword = ref(false)

const form = ref({
  name: '',
  login: '',
  email: '',
  phone: '',
  passport: '',
  avg_score: '',
  password: '',
  passwordConfirm: '',
  agreeTerms: false
})

const showAlert = (msg, type = 'info') => {
  alertMessage.value = msg
  alertType.value = type
  setTimeout(() => { alertMessage.value = '' }, 5000)
}

const handleRegister = async () => {
  // Валидация пароля
  if (form.value.password.length < 6) {
    showAlert('Пароль должен содержать минимум 6 символов', 'error')
    return
  }

  // Проверка совпадения паролей
  if (form.value.password !== form.value.passwordConfirm) {
    showAlert('Пароли не совпадают', 'error')
    return
  }

  const normalizedPhone = form.value.phone?.trim()
    ? normalizeRussianPhone(form.value.phone)
    : null

  if (form.value.phone?.trim() && !normalizedPhone) {
    showAlert('Телефон должен быть в российском формате', 'error')
    return
  }

  if (!/^\d{4}\s\d{6}$/.test(form.value.passport)) {
    showAlert('Паспортные данные должны быть в формате 0000 000000', 'error')
    return
  }

  const avgScore = Number(form.value.avg_score)
  const scaledAvgScore = Math.round(avgScore * 100)
  if (!Number.isFinite(avgScore) || avgScore < 2 || avgScore > 5 || Math.abs(avgScore * 100 - scaledAvgScore) > 1e-8) {
    showAlert('Средний балл должен быть от 2.00 до 5.00 с шагом 0.01', 'error')
    return
  }

  registering.value = true

  try {
    const response = await axios.post(`${API_URL}/auth/register-applicant`, {
      name: form.value.name,
      login: form.value.login,
      email: form.value.email,
      phone: normalizedPhone,
      passport: form.value.passport,
      avg_score: (scaledAvgScore / 100).toFixed(2),
      password: form.value.password
    })

    if (response.data.success) {
      showAlert('Регистрация прошла успешно! Выполняется вход...', 'success')
      
      // Сохраняем токен и данные пользователя
      localStorage.setItem('authToken', response.data.data.token)
      localStorage.setItem('user', JSON.stringify(response.data.data.user))

      // Перенаправляем в личный кабинет через 1.5 секунды
      setTimeout(() => {
        router.push('/applicant')
      }, 1500)
    }
  } catch (error) {
    console.error('Ошибка регистрации:', error)
    const errorMsg = error.response?.data?.error || 'Ошибка сервера. Попробуйте позже.'
    showAlert(errorMsg, 'error')
  } finally {
    registering.value = false
  }
}

const onPhoneInput = (event) => {
  form.value.phone = maskRussianPhoneInput(event?.target?.value || '')
}

const maskPassportInput = (value) => {
  const digits = String(value || '').replace(/\D/g, '').slice(0, 10)
  return digits.length > 4 ? `${digits.slice(0, 4)} ${digits.slice(4)}` : digits
}

const onPassportInput = (event) => {
  form.value.passport = maskPassportInput(event?.target?.value || '')
}
</script>

<style scoped>
.register-page {
  min-height: 100vh;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 40px 20px;
}

.register-container {
  width: 100%;
  max-width: 550px;
}

.register-card {
  background: white;
  border-radius: 16px;
  padding: 40px;
  box-shadow: 0 10px 40px rgba(0, 0, 0, 0.2);
}

.register-header {
  text-align: center;
  margin-bottom: 30px;
}

.register-header h1 {
  margin: 0 0 10px 0;
  font-size: 2rem;
  color: #1e293b;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12px;
}

.register-header h1 i {
  color: #667eea;
}

.register-header p {
  margin: 0;
  color: #64748b;
  font-size: 1rem;
}

.register-form {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.form-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.form-group label {
  font-weight: 600;
  color: #475569;
  font-size: 0.95rem;
}

.form-control {
  padding: 12px 16px;
  border: 2px solid #e1e8ed;
  border-radius: 8px;
  font-size: 1rem;
  transition: all 0.3s;
}

.form-control:focus {
  outline: none;
  border-color: #667eea;
  box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
}

.form-hint {
  color: #94a3b8;
  font-size: 0.8rem;
  margin-top: 4px;
}

.password-input-wrapper {
  position: relative;
  display: flex;
  align-items: center;
}

.password-input-wrapper .form-control {
  width: 100%;
  padding-right: 45px;
}

.toggle-password {
  position: absolute;
  right: 12px;
  background: none;
  border: none;
  cursor: pointer;
  color: #64748b;
  font-size: 1.1rem;
  padding: 5px;
  transition: color 0.3s;
}

.toggle-password:hover {
  color: #667eea;
}

.checkbox-label {
  display: flex;
  align-items: center;
  gap: 10px;
  cursor: pointer;
  font-weight: normal;
  color: #475569;
}

.checkbox-label input[type="checkbox"] {
  width: 18px;
  height: 18px;
  cursor: pointer;
}

.checkbox-label a {
  color: #667eea;
  text-decoration: none;
}

.checkbox-label a:hover {
  text-decoration: underline;
}

.btn-register {
  padding: 14px 24px;
  font-size: 1.1rem;
  margin-top: 10px;
}

.register-footer {
  margin-top: 25px;
  text-align: center;
  color: #64748b;
}

.register-footer a {
  color: #667eea;
  text-decoration: none;
  font-weight: 600;
}

.register-footer a:hover {
  text-decoration: underline;
}

/* Уведомления */
.alert {
  padding: 14px 18px;
  border-radius: 10px;
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 20px;
}

.alert-success {
  background: #d1fae5;
  color: #059669;
}

.alert-error {
  background: #fee2e2;
  color: #dc2626;
}

/* Адаптивность */
@media (max-width: 600px) {
  .register-card {
    padding: 30px 20px;
  }

  .register-header h1 {
    font-size: 1.5rem;
  }

  .form-row {
    grid-template-columns: 1fr;
  }
}
</style>
