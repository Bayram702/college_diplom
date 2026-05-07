// router/index.js
import { createRouter, createWebHistory } from 'vue-router'
import axios from 'axios'
import HomePage from '../views/HomePage.vue'
import SpecialtiesPage from '../views/SpecialtiesPage.vue'
import CollegesPage from '../views/CollegesPage.vue'
import SpecialtyDetail from '../views/SpecialtyDetail.vue'

const routes = [
  {
    path: '/',
    name: 'Home',
    component: HomePage
  },
  {
    path: '/sector',
    name: 'Specialties',
    component: SpecialtiesPage
  },
  {
    path: '/sectors',
    redirect: to => ({ path: '/sector', query: to.query, hash: to.hash })
  },
  {
    path: '/specialties',
    redirect: to => ({ path: '/sector', query: to.query, hash: to.hash })
  },
  {
    path: '/colleges',
    name: 'Colleges',
    component: CollegesPage
  },
  {
    path: '/specialty/:id',
    name: 'SpecialtyDetail',
    component: SpecialtyDetail
  },
  {
    path: '/college/:id',
    name: 'CollegeDetail',
    component: () => import('../views/CollegeDetail.vue')
  },
  {
    path: '/login',
    name: 'Login',
    component: () => import('../views/LoginPage.vue'),
    meta: { guestOnly: true }
  },
  {
    path: '/register',
    name: 'Register',
    component: () => import('../views/RegisterPage.vue'),
    meta: { guestOnly: true }
  },
  {
    path: '/college-representative',
    name: 'CollegeRepresentative',
    component: () => import('../views/CollegeRepresentativePanel.vue'),
    meta: { 
      requiresAuth: true, 
      allowedRoles: ['college_rep', 'admin'] 
    }
  },
  {
    path: '/applicant',
    name: 'ApplicantDashboard',
    component: () => import('../views/ApplicantDashboard.vue'),
    meta: {
      requiresAuth: true,
      allowedRoles: ['applicant']
    }
  },
  {
    path: '/admin',
    name: 'AdminPanel',
    component: () => import('../views/AdminPanel.vue'),
    meta: { 
      requiresAuth: true, 
      allowedRoles: ['admin'] 
    }
  }
]

const router = createRouter({
  history: createWebHistory(),
  routes,
  scrollBehavior(to, from, savedPosition) {
    if (savedPosition) return savedPosition
    return { top: 0 }
  }
})

// Глобальный guard для проверки авторизации
router.beforeEach((to, from, next) => {
  const token = localStorage.getItem('authToken')
  const userStr = localStorage.getItem('user')
  let user = null

  if (userStr) {
    try {
      user = JSON.parse(userStr)
    } catch (e) {
      console.error('Error parsing user:', e)
    }
  }

  // Если есть токен, устанавливаем его в заголовки
  if (token) {
    axios.defaults.headers.common['Authorization'] = `Bearer ${token}`
  }

  // Если маршрут требует авторизации
  if (to.meta.requiresAuth) {
    if (!token || !user) {
      // Не авторизован - перенаправляем на вход
      next({ name: 'Login', query: { redirect: to.fullPath } })
      return
    }

    // Проверяем роль
    if (to.meta.allowedRoles && !to.meta.allowedRoles.includes(user.role.name)) {
      // Недостаточно прав
      console.warn('⚠️ Недостаточно прав:', user.role.name, 'нужно:', to.meta.allowedRoles)
      next({ name: 'Home' })
      return
    }

    next()
    return
  }

  // Если маршрут только для гостей (уже авторизованным не нужен вход)
  if (to.meta.guestOnly) {
    if (token && user) {
      // Уже авторизован - перенаправляем в зависимости от роли
      switch (user.role.name) {
        case 'admin':
          next('/admin')
          break
        case 'college_rep':
          next('/college-representative')
          break
        case 'applicant':
          next('/applicant')
          break
        default:
          next('/')
      }
      return
    }
  }

  next()
})

export default router
