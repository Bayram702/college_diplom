<template>
  <div class="college-rep-panel">
    <!-- Основной контент -->
    <div class="container" style="padding-top: 20px;">
      <!-- Состояние загрузки -->
      <div v-if="loading" class="loading-state">
        <i class="fas fa-spinner fa-spin"></i> Загрузка данных колледжа...
      </div>

      <!-- Вкладки -->
      <div class="tabs">
        <button 
          class="tab-btn" 
          :class="{ active: activeTab === 'college' }"
          @click="activeTab = 'college'"
        >
          <i class="fas fa-university"></i> Информация о колледже
        </button>
        <button 
          class="tab-btn" 
          :class="{ active: activeTab === 'specialities' }"
          @click="activeTab = 'specialities'"
        >
          <i class="fas fa-graduation-cap"></i> Управление специальностями
        </button>
        <button 
          class="tab-btn" 
          :class="{ active: activeTab === 'applications' }"
          @click="activeTab = 'applications'"
        >
          <i class="fas fa-file-signature"></i> Заявки абитуриентов
          <span v-if="pendingApplicationsCount > 0" class="tab-badge">
            {{ pendingApplicationsCount }}
          </span>
        </button>
        <button 
          class="tab-btn" 
          :class="{ active: activeTab === 'analytics' }"
          @click="activeTab = 'analytics'"
        >
          <i class="fas fa-chart-line"></i> Аналитика заявок
        </button>
      </div>
      
      <!-- Уведомления -->
      <div v-if="alertMessage" :class="['alert', `alert-${alertType}`]">
        <i :class="alertType === 'success' ? 'fas fa-check-circle' : 'fas fa-info-circle'"></i>
        <div>{{ alertMessage }}</div>
      </div>
      
      <!-- Контент вкладки 1: Информация о колледже -->
      <div v-if="activeTab === 'college'" class="tab-content active">
        <div class="alert alert-info">
          <i class="fas fa-info-circle"></i>
          <div>
            <strong>Информация:</strong> Все изменения будут отображены на публичной странице вашего колледжа.
          </div>
        </div>
        
        <!-- Секция 1: Основная информация -->
        <div class="section">
          <h2 class="section-title"><i class="fas fa-info-circle"></i> Основная информация</h2>
          
          <div class="settings-grid">
            <div class="form-group">
              <label for="college-name">Название колледжа <span class="required">*</span></label>
              <input 
                v-model="collegeData.name" 
                type="text" 
                id="college-name" 
                class="form-control"
                required
              >
            </div>
            
            <div class="form-group">
              <label for="college-status">Статус колледжа</label>
              <select v-model="collegeData.status" id="college-status" class="form-control">
                <option value="active">Активен</option>
                <option value="inactive">Неактивен</option>
              </select>
            </div>
          </div>
          
          <div class="form-group">
            <label for="college-description">Краткое описание <span class="required">*</span></label>
            <textarea 
              v-model="collegeData.description" 
              id="college-description" 
              class="form-control" 
              rows="4"
              required
            ></textarea>
          </div>
        </div>
        
        <!-- Секция 2: Статистика приема -->
        <div class="section">
          <h2 class="section-title"><i class="fas fa-chart-bar"></i> Статистика приема 2025</h2>
          
          <div class="stats-grid">
            <div class="calculated-places-card">
              <span>Бюджетных мест</span>
              <strong>{{ calculatedCollegePlaces.budget }}</strong>
              <small>Сумма по активным специальностям</small>
            </div>
            
            <div class="calculated-places-card">
              <span>Коммерческих мест</span>
              <strong>{{ calculatedCollegePlaces.commercial }}</strong>
              <small>Сумма по активным специальностям</small>
            </div>
            
            <div class="form-group">
              <label for="avg-score">Средний балл аттестата</label>
              <input 
                v-model.number="collegeData.avg_score" 
                type="number" 
                step="0.1" 
                id="avg-score" 
                class="form-control" 
                min="0" 
                max="5"
              >
            </div>
            
            <div class="form-group">
              <label for="min-score">Минимальный балл аттестата</label>
              <input 
                v-model.number="collegeData.min_score" 
                type="number" 
                step="0.1" 
                id="min-score" 
                class="form-control" 
                min="0" 
                max="5"
              >
            </div>
          </div>
        </div>
        
        <!-- Секция 3: Контактная информация -->
        <div class="section">
          <h2 class="section-title"><i class="fas fa-address-book"></i> Контактная информация</h2>
          
          <div class="settings-grid">
            <div class="form-group">
              <label for="college-phone">Телефон приемной комиссии <span class="required">*</span></label>
              <input 
                v-model="collegeData.phone" 
                @input="onCollegePhoneInput"
                type="text" 
                id="college-phone" 
                class="form-control"
                required
              >
            </div>
            
            <div class="form-group">
              <label for="college-email">Электронная почта <span class="required">*</span></label>
              <input 
                v-model="collegeData.email" 
                type="email" 
                id="college-email" 
                class="form-control"
                required
              >
            </div>
          </div>
          
          <div class="settings-grid">
            <div class="form-group">
              <label for="college-website">Официальный сайт</label>
              <input 
                v-model="collegeData.website" 
                type="url" 
                id="college-website" 
                class="form-control"
              >
            </div>
            
            <div class="form-group">
              <label for="college-admission-url">Страница приема</label>
              <input 
                v-model="collegeData.admission_url" 
                type="url" 
                id="college-admission-url" 
                class="form-control"
              >
            </div>
          </div>
          
          <div class="form-group">
            <label>Социальные сети</label>
            <div class="settings-grid">
              <div class="form-group">
                <label for="college-vk">ВКонтакте</label>
                <input 
                  v-model="collegeData.social_vk" 
                  type="url" 
                  id="college-vk" 
                  class="form-control"
                >
              </div>
              <div class="form-group">
                <label for="college-max">MAX</label>
                <input 
                  v-model="collegeData.social_max" 
                  type="url" 
                  id="college-max" 
                  class="form-control"
                >
              </div>
            </div>
            <div class="form-group">
              <label for="college-social-other">Другие источники (каждая ссылка с новой строки)</label>
              <textarea
                v-model="socialOtherText"
                id="college-social-other"
                class="form-control"
                rows="4"
              ></textarea>
            </div>
          </div>
        </div>
        
        <!-- Секция 4: Адреса расположения -->
        <div class="section">
          <h2 class="section-title"><i class="fas fa-map-marker-alt"></i> Адреса расположения</h2>

          <div v-if="addresses.length > 0" class="addresses-table-wrapper">
            <table class="data-table">
              <thead>
                <tr>
                  <th>Тип</th>
                  <th>Название</th>
                  <th>Адрес</th>
                  <th>Телефон</th>
                  <th>Координаты</th>
                  <th>Главный</th>
                  <th>Действия</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="addr in addresses" :key="addr.id">
                  <td>
                    <span class="address-type-badge" :class="addr.address_type || 'educational'">
                      {{ getAddressTypeName(addr.address_type) }}
                    </span>
                  </td>
                  <td>{{ addr.name }}</td>
                  <td>{{ addr.address }}</td>
                  <td>{{ addr.phone || '—' }}</td>
                  <td>{{ addr.coordinates || '—' }}</td>
                  <td>
                    <span v-if="addr.is_main" class="main-badge">✓ Главный</span>
                    <span v-else class="text-muted">—</span>
                  </td>
                  <td>
                    <div class="action-buttons">
                      <button class="btn-icon btn-edit" @click="editAddress(addr)" title="Редактировать">
                        <i class="fas fa-edit"></i>
                      </button>
                      <button class="btn-icon btn-delete" @click="deleteAddress(addr.id)" title="Удалить">
                        <i class="fas fa-trash"></i>
                      </button>
                    </div>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
          <div v-else class="empty-addresses">
            <i class="fas fa-map-marker-alt"></i>
            <p>Адреса ещё не добавлены</p>
          </div>

          <button class="add-address-btn" @click="openAddressModal()">
            <i class="fas fa-plus"></i> Добавить адрес
          </button>
        </div>
        
        <!-- Секция 5: Изображения -->
        <div class="section">
          <h2 class="section-title"><i class="fas fa-images"></i> Изображения</h2>

          <div class="form-group">
            <label>Логотип колледжа</label>
            <input
              ref="logoInputRef"
              type="file"
              accept="image/jpeg,image/jpg,image/png,image/gif,image/webp"
              @change="(e) => handleImageUpload(e, 'logo')"
              style="display: none"
            >
            <div class="image-upload" @click="triggerImageUpload('logo')">
              <i class="fas fa-cloud-upload-alt"></i>
              <p>Нажмите для загрузки логотипа</p>
              <p class="text-small">Рекомендуемый размер: 300x300px, PNG</p>
              <p v-if="imageUploading" class="text-small">
                <i class="fas fa-spinner fa-spin"></i> Загрузка...
              </p>
            </div>
            <div v-if="collegeData.logo_image_url" class="image-preview">
              <img :src="resolveImageUrl(collegeData.logo_image_url)" alt="Логотип">
              <button class="remove-image-btn" @click="collegeData.logo_image_url = ''" title="Удалить изображение">
                <i class="fas fa-times"></i>
              </button>
            </div>
          </div>

        </div>
        
        <!-- Секция 6: Профессионалитет -->
        <div class="section">
          <h2 class="section-title"><i class="fas fa-award"></i> Участие в Профессионалитете</h2>
          
          <div class="form-group">
            <label>Участвует ли колледж в программе Профессионалитет?</label>
            <div class="radio-group">
              <div class="radio-item">
                <input
                  type="radio"
                  id="prof-yes"
                  :value="true"
                  v-model="collegeData.is_professionalitet"
                >
                <label for="prof-yes">Да, участвует</label>
              </div>
              <div class="radio-item">
                <input
                  type="radio"
                  id="prof-no"
                  :value="false"
                  v-model="collegeData.is_professionalitet"
                >
                <label for="prof-no">Не участвует</label>
              </div>
            </div>
          </div>
          
          <div v-if="collegeData.is_professionalitet" class="ovz-section">
            <div class="form-group">
              <label for="prof-cluster">Кластер Профессионалитета</label>
              <input 
                v-model="collegeData.professionalitet_cluster" 
                type="text" 
                id="prof-cluster" 
                class="form-control"
              >
            </div>
          </div>
        </div>
        
        <!-- Секция 7: Доступная среда для ОВЗ -->
        <div class="section">
          <h2 class="section-title"><i class="fas fa-universal-access"></i> Доступная среда для ОВЗ</h2>
          
          <div class="ovz-section">
            <div class="form-group">
              <label for="ovz-programs">Программы для людей с ОВЗ (каждый пункт с новой строки)</label>
              <textarea 
                v-model="ovzText" 
                id="ovz-programs" 
                class="form-control" 
                rows="5"
              ></textarea>
            </div>
          </div>
        </div>
        
        <!-- Секция 8: Дополнительная информация -->
        <div class="section">
          <h2 class="section-title"><i class="fas fa-info-circle"></i> Дополнительная информация</h2>
          
          <div class="form-group">
            <label for="college-opportunities">Возможности в колледже (каждый пункт с новой строки)</label>
            <textarea 
              v-model="opportunitiesText" 
              id="college-opportunities" 
              class="form-control" 
              rows="5"
            ></textarea>
          </div>
          
          <div class="form-group">
            <label for="college-employers">Работодатели-партнеры (каждый с новой строки)</label>
            <textarea 
              v-model="employersText" 
              id="college-employers" 
              class="form-control" 
              rows="5"
            ></textarea>
          </div>
          
          <div class="form-group">
            <label for="college-master-classes">Учебные мастерские и лаборатории (каждая с новой строки)</label>
            <textarea 
              v-model="masterClassesText" 
              id="college-master-classes" 
              class="form-control" 
              rows="5"
            ></textarea>
          </div>
          
          <div class="form-group">
            <label for="college-professions">Кем можно работать после обучения (каждая профессия с новой строки)</label>
            <textarea 
              v-model="professionsText" 
              id="college-professions" 
              class="form-control" 
              rows="5"
            ></textarea>
          </div>
        </div>
        
        <!-- Кнопки сохранения -->
        <div class="form-actions">
          <button class="btn btn-primary" @click="saveCollegeData" :disabled="saving">
            <i :class="saving ? 'fas fa-spinner fa-spin' : 'fas fa-save'"></i> 
            {{ saving ? 'Сохранение...' : 'Сохранить изменения' }}
          </button>
        </div>
      </div>
      
      <!-- Контент вкладки 2: Управление специальностями -->
      <div v-if="activeTab === 'specialities'" class="tab-content active">
        <div class="alert alert-info">
          <i class="fas fa-info-circle"></i>
          <div>
            <strong>Информация:</strong> Здесь вы можете управлять специальностями вашего колледжа. Добавляйте новые специальности или редактируйте существующие.
          </div>
        </div>
        
        <div class="specialities-header">
          <div>
            <h2 style="margin:0;color:#1e293b;">Специальности колледжа</h2>
          </div>
          <button class="btn-add" @click="openSpecialityModal()">
            <i class="fas fa-plus"></i> Добавить специальность
          </button>
        </div>
        
        <div class="table-container">
          <table class="data-table">
            <thead>
              <tr>
                <th>Номер</th>
                <th>Название</th>
                <th>Код</th>
                <th>Экзамены</th>
                <th>Бюджет/Коммерция</th>
                <th>Статус</th>
                <th>Действия</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="speciality in filteredSpecialities" :key="speciality.id">
                <td>{{ speciality.id }}</td>
                <td>{{ speciality.name }}</td>
                <td>{{ speciality.code }}</td>
                <td>{{ speciality.exams || '—' }}</td>
                <td>{{ speciality.budget_places }}/{{ speciality.commercial_places }}</td>
                <td>
                  <span class="status-badge" :class="getStatusClass(speciality.status)">
                    {{ getStatusName(speciality.status) }}
                  </span>
                </td>
                <td>
                  <div class="action-buttons">
                    <button class="btn-action btn-edit" @click="editSpeciality(speciality)" title="Редактировать">
                      <i class="fas fa-edit"></i>
                    </button>
                    <button class="btn-action btn-delete" @click="deleteSpeciality(speciality.id)" title="Удалить">
                      <i class="fas fa-trash"></i>
                    </button>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <!-- Контент вкладки 3: Заявки абитуриентов -->
      <div v-if="activeTab === 'applications'" class="tab-content active">
        <div class="alert alert-info">
          <i class="fas fa-info-circle"></i>
          <div>
            <strong>Информация:</strong> Здесь отображаются заявки абитуриентов только в ваш колледж.
          </div>
        </div>

        <div class="applications-toolbar">
          <div class="applications-filters">
            <div class="form-group">
              <label for="applications-status-filter">Статус</label>
              <select
                id="applications-status-filter"
                v-model="applicationsFilters.status"
                class="form-control"
                @change="onApplicationsFilterChange"
              >
                <option value="all">Все</option>
                <option value="pending">В ожидании</option>
                <option value="accepted">Принятые</option>
                <option value="rejected">Отклонённые</option>
                <option value="cancelled">Отменённые</option>
              </select>
            </div>

            <div class="form-group">
              <label for="applications-specialty-filter">Специальность</label>
              <select
                id="applications-specialty-filter"
                v-model="applicationsFilters.specialtyId"
                class="form-control"
                @change="onApplicationsFilterChange"
              >
                <option value="all">Все специальности</option>
                <option v-for="speciality in specialities" :key="speciality.id" :value="String(speciality.id)">
                  {{ speciality.code }} — {{ speciality.name }}
                </option>
              </select>
            </div>

            <div class="form-group">
              <label for="applications-score-sort">Сортировка по баллу</label>
              <select
                id="applications-score-sort"
                v-model="applicationsFilters.sortScore"
                class="form-control"
                @change="onApplicationsFilterChange"
              >
                <option value="none">По статусу и дате</option>
                <option value="desc">Сначала высокий балл</option>
                <option value="asc">Сначала низкий балл</option>
              </select>
            </div>
          </div>
        </div>

        <div v-if="applicationsLoading" class="loading-state">
          <i class="fas fa-spinner fa-spin"></i> Загрузка заявок...
        </div>

        <div v-else class="table-container">
          <table class="data-table">
            <thead>
              <tr>
                <th>Номер</th>
                <th>Дата</th>
                <th>Абитуриент</th>
                <th>Специальность</th>
                <th>Ср. балл</th>
                <th>Общежитие</th>
                <th>Статус</th>
                <th>Действия</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="application in applications" :key="application.id">
                <td>{{ application.id }}</td>
                <td>{{ formatDateTime(application.created_at) }}</td>
                <td>
                  <div class="applicant-cell">
                    <div class="applicant-name">{{ application.applicant_name }}</div>
                    <div class="applicant-meta">{{ application.phone }}</div>
                    <div class="applicant-meta">{{ application.email }}</div>
                  </div>
                </td>
                <td>
                  {{ application.specialty_code }} — {{ application.specialty_name }}
                </td>
                <td>{{ Number(application.avg_score).toFixed(2) }}</td>
                <td>{{ application.needs_dormitory ? 'Да' : 'Нет' }}</td>
                <td>
                  <span class="status-badge" :class="getApplicationStatusClass(application.status)">
                    {{ getApplicationStatusName(application.status) }}
                  </span>
                </td>
                <td>
                  <div class="action-buttons">
                    <button
                      class="btn-action btn-accept"
                      :disabled="application.status === 'accepted' || application.status === 'cancelled'"
                      @click="updateApplicationStatus(application.id, 'accepted')"
                      title="Принять"
                    >
                      <i class="fas fa-check"></i>
                    </button>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <div v-if="!applicationsLoading && applications.length === 0" class="empty-addresses">
          <i class="fas fa-inbox"></i>
          <p>Заявки не найдены</p>
        </div>

        <div v-if="!applicationsLoading && applicationsPagination.totalPages > 1" class="pagination">
          <button
            type="button"
            class="btn btn-secondary"
            :disabled="applicationsPagination.page <= 1"
            @click="goToApplicationsPage(applicationsPagination.page - 1)"
          >
            Назад
          </button>
          <span>
            Страница {{ applicationsPagination.page }} из {{ applicationsPagination.totalPages }}
          </span>
          <button
            type="button"
            class="btn btn-secondary"
            :disabled="applicationsPagination.page >= applicationsPagination.totalPages"
            @click="goToApplicationsPage(applicationsPagination.page + 1)"
          >
            Далее
          </button>
        </div>
      </div>

      <!-- Контент вкладки 4: Аналитика заявок -->
      <div v-if="activeTab === 'analytics'" class="tab-content active">
        <div class="alert alert-info">
          <i class="fas fa-chart-line"></i>
          <div>
            <strong>Аналитика:</strong> Сводка по заявкам вашего колледжа, динамика и распределение по специальностям.
          </div>
        </div>

        <div class="applications-toolbar analytics-filter-toolbar">
          <div class="applications-filters">
            <div class="form-group">
              <label for="analytics-specialty-filter">Специальность для аналитики</label>
              <select
                id="analytics-specialty-filter"
                v-model="analyticsFilters.specialtyId"
                class="form-control"
                @change="fetchApplicationsAnalytics"
              >
                <option value="all">Все специальности</option>
                <option v-for="speciality in specialities" :key="speciality.id" :value="String(speciality.id)">
                  {{ speciality.code }} — {{ speciality.name }}
                </option>
              </select>
            </div>
          </div>
        </div>

        <div v-if="!applicationsAnalytics" class="loading-state">
          <i class="fas fa-spinner fa-spin"></i> Загрузка аналитики...
        </div>

        <template v-else>
          <div class="applications-analytics">
            <div class="analytics-card">
              <span class="analytics-label">Всего заявок</span>
              <strong>{{ applicationsAnalytics.summary.total }}</strong>
            </div>
            <div class="analytics-card">
              <span class="analytics-label">В ожидании</span>
              <strong>{{ applicationsAnalytics.summary.pending }}</strong>
            </div>
            <div class="analytics-card">
              <span class="analytics-label">Принято</span>
              <strong>{{ applicationsAnalytics.summary.accepted }}</strong>
            </div>
            <div class="analytics-card">
              <span class="analytics-label">Отклонено</span>
              <strong>{{ applicationsAnalytics.summary.rejected }}</strong>
            </div>
            <div class="analytics-card">
              <span class="analytics-label">Отменено</span>
              <strong>{{ applicationsAnalytics.summary.cancelled }}</strong>
            </div>
            <div class="analytics-card">
              <span class="analytics-label">Средний балл</span>
              <strong>{{ Number(applicationsAnalytics.summary.avg_score || 0).toFixed(2) }}</strong>
            </div>
            <div class="analytics-card">
              <span class="analytics-label">Нужно общежитие</span>
              <strong>{{ applicationsAnalytics.summary.dormitory }}</strong>
            </div>
          </div>

          <div class="analytics-layout">
            <div class="analytics-panel">
              <h3>Динамика за 7 дней</h3>
              <div class="daily-bars">
                <div v-for="day in applicationsAnalytics.last7Days" :key="day.day" class="daily-bar-row">
                  <span>{{ formatShortDate(day.day) }}</span>
                  <div class="daily-bar-track">
                    <div class="daily-bar-fill" :style="{ width: getDailyBarWidth(day.total) }"></div>
                  </div>
                  <strong>{{ day.total }}</strong>
                </div>
              </div>
            </div>

            <div class="analytics-panel">
              <h3>По специальностям</h3>
              <div v-if="applicationsAnalytics.bySpecialty.length === 0" class="text-muted">Заявок пока нет</div>
              <div v-else class="specialty-analytics-list">
                <div v-for="item in applicationsAnalytics.bySpecialty" :key="item.specialty_id" class="specialty-analytics-item">
                  <div>
                    <strong>{{ item.specialty_code }} — {{ item.specialty_name }}</strong>
                    <span>Средний балл: {{ Number(item.avg_score || 0).toFixed(2) }}</span>
                  </div>
                  <b>{{ item.total }}</b>
                </div>
              </div>
            </div>
          </div>
        </template>
      </div>
    </div>

    <!-- Модальное окно: Специальность -->
    <div class="modal-overlay" :class="{ active: showSpecialityModal }" @click.self="closeSpecialityModal" v-show="showSpecialityModal">
      <div class="modal">
        <button class="close-modal" @click="closeSpecialityModal">&times;</button>
        <h2>{{ editingSpeciality ? 'Редактировать специальность' : 'Добавить специальность' }}</h2>
        
        <form @submit.prevent="saveSpeciality">
          <input type="hidden" v-model="specialityForm.id">
          
          <div class="settings-grid">
            <div class="form-group">
              <label>Отрасль <span class="required">*</span></label>
              <select v-model="selectedSectorCode" class="form-control" required @change="applySelectedSector">
                <option value="" disabled>Выберите отрасль</option>
                <option v-for="sector in spoSpecialtyGroups" :key="sector.code" :value="sector.code">
                  {{ sector.code }} — {{ sector.name }}
                </option>
              </select>
            </div>
            
            <div class="form-group">
              <label>Специальность <span class="required">*</span></label>
              <select
                v-model="selectedSpecialtyCode"
                class="form-control"
                required
                :disabled="!selectedSectorCode"
                @change="applySelectedSpecialty"
              >
                <option value="" disabled>Выберите специальность</option>
                <option v-for="specialty in selectedSectorSpecialties" :key="specialty.code" :value="specialty.code">
                  {{ specialty.code }} — {{ specialty.name }}
                </option>
              </select>
            </div>
          </div>

          <div v-if="specialityForm.code && specialityForm.name" class="selected-specialty-summary">
            <span>Код</span>
            <strong>{{ specialityForm.code }}</strong>
            <span>Название</span>
            <strong>{{ specialityForm.name }}</strong>
          </div>
          
          <div class="settings-grid">
            <div class="form-group">
              <label>Срок обучения <span class="required">*</span></label>
              <input v-model="specialityForm.duration" type="text" class="form-control" required>
            </div>
            
            <div class="form-group">
              <label>База приема <span class="required">*</span></label>
              <select v-model="specialityForm.base_education" class="form-control" required>
                <option value="9">9 классов</option>
                <option value="11">11 классов</option>
              </select>
            </div>
          </div>
          
          <div class="settings-grid">
            <div class="form-group">
              <label>Стоимость обучения (руб/год)</label>
              <input v-model.number="specialityForm.price_per_year" type="number" class="form-control" min="0">
            </div>
          </div>
          
          <div class="settings-grid">
            <div class="form-group">
              <label>Количество бюджетных мест</label>
              <input v-model.number="specialityForm.budget_places" type="number" class="form-control" min="0">
            </div>
            <div class="form-group">
              <label>Количество коммерческих мест</label>
              <input v-model.number="specialityForm.commercial_places" type="number" class="form-control" min="0">
            </div>
          </div>
          
          <div class="form-group">
            <label>Вступительные испытания (через запятую)</label>
            <input v-model="specialityForm.exams" type="text" class="form-control" placeholder="Например: Математика, русский язык">
          </div>
          
          <div class="form-group">
            <label>Средний балл аттестата (прошлый год)</label>
            <input v-model.number="specialityForm.avg_score" type="number" step="0.1" class="form-control" min="0" max="5">
          </div>
          
          <div class="form-group">
            <label>Описание специальности</label>
            <textarea v-model="specialityForm.description" class="form-control" rows="4"></textarea>
          </div>
          
          <div class="form-group">
            <label>Статус специальности</label>
            <select v-model="specialityForm.status" class="form-control">
              <option value="active">Активна</option>
              <option value="inactive">Неактивна</option>
              <option value="draft">Черновик</option>
            </select>
          </div>
          
          <div class="form-actions">
            <button type="submit" class="btn btn-primary" :disabled="saving">
              <i :class="saving ? 'fas fa-spinner fa-spin' : 'fas fa-save'"></i> 
              {{ saving ? 'Сохранение...' : 'Сохранить специальность' }}
            </button>
            <button type="button" class="btn btn-secondary" @click="closeSpecialityModal">
              Отмена
            </button>
          </div>
        </form>
      </div>
    </div>

    <!-- Модальное окно: Адрес -->
    <div class="modal-overlay" :class="{ active: showAddressModal }" @click.self="closeAddressModal" v-show="showAddressModal">
      <div class="modal modal-lg">
        <button class="close-modal" @click="closeAddressModal">&times;</button>
        <h2>{{ editingAddress ? 'Редактировать адрес' : 'Добавить адрес' }}</h2>

        <form @submit.prevent="saveAddress">
          <input type="hidden" v-model="addressForm.id">

          <div class="form-row">
            <div class="form-group">
              <label>Тип адреса <span class="required">*</span></label>
              <select v-model="addressForm.address_type" class="form-control" required>
                <option value="">Выберите тип</option>
                <option value="legal">Юридический адрес</option>
                <option value="actual">Фактический адрес</option>
                <option value="educational">Учебный корпус</option>
                <option value="branch">Филиал</option>
                <option value="other">Другое</option>
              </select>
            </div>
            <div class="form-group">
              <label>Название корпуса <span class="required">*</span></label>
              <input v-model="addressForm.name" type="text" class="form-control" required placeholder="Например: Главный корпус">
            </div>
          </div>

          <div class="form-group">
            <label>Полный адрес <span class="required">*</span></label>
            <input v-model="addressForm.address" type="text" class="form-control" required placeholder="г. Уфа, ул. Борисоглебская, 32">
          </div>

          <div class="form-row">
            <div class="form-group">
              <label>Телефон</label>
              <input v-model="addressForm.phone" @input="onAddressPhoneInput" type="text" class="form-control" placeholder="+7 (347) 123-45-67">
            </div>
            <div class="form-group">
              <label>Email</label>
              <input v-model="addressForm.email" type="email" class="form-control" placeholder="info@college.ru">
            </div>
          </div>

          <div class="form-row">
            <div class="form-group">
              <label>Координаты (широта, долгота)</label>
              <input v-model="addressForm.coordinates" type="text" class="form-control" placeholder="54.7355, 55.9587">
              <small class="form-hint">Формат: широта, долгота (можно получить из Яндекс.Карт)</small>
            </div>
            <div class="form-group">
              <label>Режим работы</label>
              <input v-model="addressForm.working_hours" type="text" class="form-control" placeholder="Пн-Пт: 8:00-17:00">
            </div>
          </div>

          <div class="form-group">
            <label>Контактное лицо</label>
            <input v-model="addressForm.contact_person" type="text" class="form-control" placeholder="ФИО ответственного лица">
          </div>

          <div class="form-group">
            <label class="checkbox-label">
              <input type="checkbox" v-model="addressForm.is_main">
              <span>Это главный корпус колледжа</span>
            </label>
          </div>

          <div class="form-actions">
            <button type="submit" class="btn btn-primary" :disabled="saving">
              <i :class="saving ? 'fas fa-spinner fa-spin' : 'fas fa-save'"></i>
              {{ saving ? 'Сохранение...' : 'Сохранить адрес' }}
            </button>
            <button type="button" class="btn btn-secondary" @click="closeAddressModal">Отмена</button>
          </div>
        </form>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import { useRouter } from 'vue-router'
import { formatRussianPhone, maskRussianPhoneInput } from '../utils/phone'
import { resolveImageUrl } from '../utils/images'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api'
const router = useRouter()

const activeTab = ref('college')
const alertMessage = ref('')
const alertType = ref('info')
const saving = ref(false)
const loading = ref(true)
const imageUploading = ref(false)

// Refs для input элементов загрузки файлов
const logoInputRef = ref(null)

// Данные колледжа (загружаются из БД)
const collegeData = ref({
  id: null,
  name: '',
  status: 'active',
  description: '',
  budget_places: 0,
  commercial_places: 0,
  avg_score: 0,
  min_score: 0,
  phone: '',
  email: '',
  website: '',
  admission_url: '',
  social_vk: '',
  social_max: '',
  social_other: [],
  logo_image_url: '',
  is_professionalitet: false,
  professionalitet_cluster: '',
  opportunities: [],
  employers: [],
  workshops: [],
  professions: [],
  ovz_programs: []
})

// Специальности (загружаются из БД)
const specialities = ref([])
const specialitySearch = ref('')
const spoSpecialtyGroups = ref([])

// Адреса (загружаются из БД)
const addresses = ref([])

// Заявки абитуриентов
const applications = ref([])
const applicationsAnalytics = ref(null)
const applicationsLoading = ref(false)
const pendingApplicationsCount = ref(0)
const applicationsFilters = ref({
  status: 'all',
  specialtyId: 'all',
  sortScore: 'none'
})
const applicationsPagination = ref({
  total: 0,
  page: 1,
  limit: 20,
  totalPages: 1
})
const analyticsFilters = ref({
  specialtyId: 'all'
})

// Модальные окна
const showSpecialityModal = ref(false)
const editingSpeciality = ref(null)
const showAddressModal = ref(false)
const editingAddress = ref(null)
const selectedSectorCode = ref('')
const selectedSpecialtyCode = ref('')

const specialityForm = ref({
  id: '', name: '', code: '', duration: '', base_education: '9', form: 'full-time',
  budget_places: 0, commercial_places: 0, price_per_year: 0, exams: '', avg_score: 0,
  description: '', qualification: '', status: 'active', sector_code: '', sector_name: ''
})

const addressForm = ref({
  id: '', name: '', address: '', phone: '', email: '', coordinates: '',
  address_type: 'educational', working_hours: '', contact_person: '', is_main: false
})

// Вычисляемые свойства для списков
const ovzText = computed({
  get: () => (collegeData.value.ovz_programs || []).join('\n'),
  set: (v) => collegeData.value.ovz_programs = v.split('\n').filter(l => l.trim())
})
const opportunitiesText = computed({
  get: () => (collegeData.value.opportunities || []).join('\n'),
  set: (v) => collegeData.value.opportunities = v.split('\n').filter(l => l.trim())
})
const employersText = computed({
  get: () => (collegeData.value.employers || []).join('\n'),
  set: (v) => collegeData.value.employers = v.split('\n').filter(l => l.trim())
})
const masterClassesText = computed({
  get: () => (collegeData.value.workshops || []).join('\n'),
  set: (v) => collegeData.value.workshops = v.split('\n').filter(l => l.trim())
})
const professionsText = computed({
  get: () => (collegeData.value.professions || []).join('\n'),
  set: (v) => collegeData.value.professions = v.split('\n').filter(l => l.trim())
})
const socialOtherText = computed({
  get: () => (collegeData.value.social_other || []).join('\n'),
  set: (v) => collegeData.value.social_other = v.split('\n').filter(l => l.trim())
})

const filteredSpecialities = computed(() => specialities.value)

const selectedSector = computed(() => {
  return spoSpecialtyGroups.value.find((sector) => sector.code === selectedSectorCode.value) || null
})

const selectedSectorSpecialties = computed(() => {
  const specialties = (selectedSector.value?.specialties || []).map(([code, name]) => ({ code, name }))
  const hasCurrentSpecialty = specialties.some((item) => item.code === specialityForm.value.code)

  if (specialityForm.value.code && specialityForm.value.name && !hasCurrentSpecialty) {
    return [{ code: specialityForm.value.code, name: specialityForm.value.name }, ...specialties]
  }

  return specialties
})

const calculatedCollegePlaces = computed(() => {
  return specialities.value.reduce((totals, speciality) => {
    if (speciality.status !== 'active') return totals

    totals.budget += Number(speciality.budget_places || 0)
    totals.commercial += Number(speciality.commercial_places || 0)
    return totals
  }, { budget: 0, commercial: 0 })
})

const getToken = () => localStorage.getItem('authToken')

const onCollegePhoneInput = (event) => {
  collegeData.value.phone = maskRussianPhoneInput(event?.target?.value || '')
}

const onAddressPhoneInput = (event) => {
  addressForm.value.phone = maskRussianPhoneInput(event?.target?.value || '')
}

const showAlert = (msg, type = 'info') => {
  alertMessage.value = msg
  alertType.value = type
  setTimeout(() => { alertMessage.value = '' }, 5000)
}

// Загрузка данных колледжа из БД
const parseJson = (val) => {
  if (!val) return []
  if (typeof val === 'string') { try { return JSON.parse(val) } catch { return [] } }
  return val
}

const loadCollegeData = async () => {
  loading.value = true
  try {
    const token = getToken()
    if (!token) { router.push('/login'); return }

    const res = await fetch(`${API_URL}/colleges/my`, {
      headers: { 'Authorization': `Bearer ${token}` }
    })

    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    if (!res.headers.get('content-type')?.includes('application/json')) {
      throw new Error('Сервер вернул не JSON ответ')
    }

    const result = await res.json()
    if (!result.success) throw new Error(result.error)

    const c = result.data
    collegeData.value = {
      id: c.id, name: c.name, status: c.status || 'active',
      description: c.description || '',
      budget_places: c.budget_places || 0,
      commercial_places: c.commercial_places || 0,
      avg_score: c.avg_score || 0,
      min_score: c.min_score || 0,
      phone: c.phone ? formatRussianPhone(c.phone) : '', email: c.email || '',
      website: c.website || '', admission_url: c.admission_url || '',
      social_vk: c.social_vk || '', social_max: c.social_max || '',
      social_other: parseJson(c.social_other),
      logo_image_url: c.logo_image_url || '',
      is_professionalitet: c.is_professionalitet || false,
      professionalitet_cluster: c.professionalitet_cluster || '',
      opportunities: parseJson(c.opportunities),
      employers: parseJson(c.employers),
      workshops: parseJson(c.workshops),
      professions: parseJson(c.professions),
      ovz_programs: parseJson(c.ovz_programs)
    }

    // Загрузка специальностей
    try {
      console.log('🎓 Загрузка специальностей...')
      const specRes = await fetch(`${API_URL}/colleges/specialties`, {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      console.log('🎓 Ответ специальностей:', specRes.status, specRes.statusText)
      if (specRes.ok && specRes.headers.get('content-type')?.includes('application/json')) {
        const specResult = await specRes.json()
        console.log('🎓 Специальности результат:', specResult)
        if (specResult.success) specialities.value = specResult.data
      } else {
        const text = await specRes.text()
        console.warn('⚠️ Специальности не JSON:', text.substring(0, 200))
      }
    } catch (e) { console.warn('⚠️ Специальности не загружены:', e) }

    // Загрузка адресов
    try {
      const addrRes = await fetch(`${API_URL}/colleges/addresses`, {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      if (addrRes.ok && addrRes.headers.get('content-type')?.includes('application/json')) {
        const addrResult = await addrRes.json()
        if (addrResult.success) addresses.value = addrResult.data
      }
    } catch (e) { console.warn('Адреса не загружены:', e) }

  } catch (error) {
    console.error('Ошибка загрузки:', error)
    showAlert('Ошибка загрузки данных колледжа', 'error')
  } finally {
    loading.value = false
  }
}

// Сохранение данных колледжа
const saveCollegeData = async () => {
  if (!collegeData.value.name?.trim()) return showAlert('Название колледжа обязательно', 'error')
  if (!collegeData.value.description?.trim()) return showAlert('Описание обязательно', 'error')

  saving.value = true
  try {
    const token = getToken()
    const body = {
      name: collegeData.value.name,
      description: collegeData.value.description,
      phone: collegeData.value.phone,
      email: collegeData.value.email,
      website: collegeData.value.website,
      admission_url: collegeData.value.admission_url,
      status: collegeData.value.status,
      social_vk: collegeData.value.social_vk,
      social_max: collegeData.value.social_max,
      social_other: collegeData.value.social_other,
      avg_score: collegeData.value.avg_score,
      min_score: collegeData.value.min_score,
      is_professionalitet: collegeData.value.is_professionalitet,
      professionalitet_cluster: collegeData.value.professionalitet_cluster,
      logo_image_url: collegeData.value.logo_image_url,
      opportunities: collegeData.value.opportunities,
      employers: collegeData.value.employers,
      workshops: collegeData.value.workshops,
      professions: collegeData.value.professions,
      ovz_programs: collegeData.value.ovz_programs
    }

    const res = await fetch(`${API_URL}/colleges/my`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
      body: JSON.stringify(body)
    })
    const result = await res.json()
    if (!result.success) throw new Error(result.error)

    showAlert('Данные колледжа успешно сохранены', 'success')
  } catch (error) {
    console.error('Ошибка сохранения:', error)
    showAlert('Ошибка сохранения: ' + error.message, 'error')
  } finally {
    saving.value = false
  }
}

// Загрузка изображений колледжа
const triggerImageUpload = (type) => {
  const input = logoInputRef.value
  if (input) {
    input.click()
  }
}

const handleImageUpload = async (event, type) => {
  const file = event.target.files?.[0]
  if (!file) return

  // Проверка размера файла (5MB)
  if (file.size > 5 * 1024 * 1024) {
    showAlert('Файл слишком большой. Максимальный размер: 5MB', 'error')
    return
  }

  // Проверка типа файла
  const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp']
  if (!allowedTypes.includes(file.type)) {
    showAlert('Неподдерживаемый формат файла. Разрешены только изображения (JPEG, PNG, GIF, WebP)', 'error')
    return
  }

  imageUploading.value = true
  try {
    const token = getToken()
    const formData = new FormData()
    formData.append('image', file)
    formData.append('imageType', type)

    const res = await fetch(`${API_URL}/upload/college-image`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`
      },
      body: formData
    })

    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    const result = await res.json()
    if (!result.success) throw new Error(result.error)

    // Обновляем URL изображения в данных колледжа
    collegeData.value.logo_image_url = result.data.imageUrl

    showAlert('Изображение успешно загружено', 'success')
  } catch (error) {
    console.error('Ошибка загрузки изображения:', error)
    showAlert('Ошибка загрузки изображения: ' + error.message, 'error')
  } finally {
    imageUploading.value = false
    // Очищаем input для возможности повторной загрузки того же файла
    event.target.value = ''
  }
}

// Специальности CRUD
const fetchSpoCatalog = async () => {
  try {
    const response = await fetch(`${API_URL}/sectors/catalog`)
    const result = await response.json()
    if (result.success) {
      spoSpecialtyGroups.value = result.data || []
    }
  } catch (error) {
    console.warn('Не удалось загрузить каталог специальностей СПО:', error)
  }
}

const getSectorForSpecialtyCode = (code, fallbackName = '') => {
  for (const group of spoSpecialtyGroups.value) {
    const item = group.specialties.find((specialty) => specialty.code === code)
    if (item) {
      return { sectorCode: group.code, sectorName: group.name, code: item.code, name: item.name }
    }
  }

  const prefix = String(code || '').slice(0, 2)
  const sector = spoSpecialtyGroups.value.find((group) => group.code.startsWith(prefix))
  if (!sector) return null

  return {
    sectorCode: sector.code,
    sectorName: sector.name,
    code,
    name: fallbackName
  }
}

const applySelectedSector = () => {
  const sector = selectedSector.value
  specialityForm.value.sector_code = sector?.code || ''
  specialityForm.value.sector_name = sector?.name || ''
  selectedSpecialtyCode.value = ''
  specialityForm.value.code = ''
  specialityForm.value.name = ''
}

const applySelectedSpecialty = () => {
  const specialty = selectedSectorSpecialties.value.find((item) => item.code === selectedSpecialtyCode.value)
  if (!specialty) return

  specialityForm.value.code = specialty.code
  specialityForm.value.name = specialty.name
  specialityForm.value.sector_code = selectedSector.value?.code || ''
  specialityForm.value.sector_name = selectedSector.value?.name || ''
}

const openSpecialityModal = (spec = null) => {
  editingSpeciality.value = spec
  if (spec) {
    const directoryItem = getSectorForSpecialtyCode(spec.code, spec.name)
    specialityForm.value = {
      ...spec,
      sector_code: directoryItem?.sectorCode || '',
      sector_name: directoryItem?.sectorName || ''
    }
    selectedSectorCode.value = directoryItem?.sectorCode || ''
    selectedSpecialtyCode.value = spec.code || ''
  } else {
    specialityForm.value = {
      id: '', name: '', code: '', duration: '', base_education: '9', form: 'full-time',
      budget_places: 0, commercial_places: 0, price_per_year: 0, exams: '', avg_score: 0,
      description: '', qualification: '', status: 'active', sector_code: '', sector_name: ''
    }
    selectedSectorCode.value = ''
    selectedSpecialtyCode.value = ''
  }
  showSpecialityModal.value = true
}
const closeSpecialityModal = () => { showSpecialityModal.value = false }

const saveSpeciality = async () => {
  if (!selectedSectorCode.value) return showAlert('Выберите отрасль', 'error')
  if (!selectedSpecialtyCode.value) return showAlert('Выберите специальность', 'error')
  if (!specialityForm.value.name?.trim()) return showAlert('Название специальности обязательно', 'error')
  if (!specialityForm.value.code?.trim()) return showAlert('Код специальности обязателен', 'error')

  saving.value = true
  try {
    const token = getToken()
    const url = editingSpeciality.value
      ? `${API_URL}/colleges/specialties/${specialityForm.value.id}`
      : `${API_URL}/colleges/specialties`
    const method = editingSpeciality.value ? 'PUT' : 'POST'

    const res = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
      body: JSON.stringify(specialityForm.value)
    })

    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    const ct = res.headers.get('content-type')
    if (!ct?.includes('application/json')) throw new Error('Некорректный ответ сервера')

    const result = await res.json()
    if (!result.success) throw new Error(result.error)

    closeSpecialityModal()
    await loadCollegeData()
    showAlert(editingSpeciality.value ? 'Специальность обновлена' : 'Специальность добавлена', 'success')
  } catch (error) {
    showAlert('Ошибка: ' + error.message, 'error')
  } finally {
    saving.value = false
  }
}

const editSpeciality = (spec) => { openSpecialityModal(spec) }

const deleteSpeciality = async (id) => {
  if (!confirm('Удалить специальность?')) return
  try {
    const token = getToken()
    const res = await fetch(`${API_URL}/colleges/specialties/${id}`, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${token}` }
    })
    const result = await res.json()
    if (!result.success) throw new Error(result.error)
    specialities.value = specialities.value.filter(s => s.id !== id)
    showAlert('Специальность удалена', 'success')
  } catch (error) {
    showAlert('Ошибка удаления: ' + error.message, 'error')
  }
}

// Адреса CRUD
const openAddressModal = (addr = null) => {
  console.log('📍 openAddressModal вызван', addr)
  editingAddress.value = addr
  if (addr) {
    addressForm.value = {
      id: addr.id || '',
      name: addr.name || '',
      address: addr.address || '',
      phone: addr.phone ? formatRussianPhone(addr.phone) : '',
      email: addr.email || '',
      coordinates: addr.coordinates || '',
      address_type: addr.address_type || 'educational',
      working_hours: addr.working_hours || '',
      contact_person: addr.contact_person || '',
      is_main: addr.is_main || false
    }
  } else {
    addressForm.value = {
      id: '', name: '', address: '', phone: '', email: '', coordinates: '',
      address_type: 'educational', working_hours: '', contact_person: '', is_main: false
    }
  }
  showAddressModal.value = true
}
const closeAddressModal = () => { showAddressModal.value = false }

const saveAddress = async () => {
  if (!addressForm.value.name?.trim()) return showAlert('Название корпуса обязательно', 'error')
  if (!addressForm.value.address?.trim()) return showAlert('Адрес обязателен', 'error')

  saving.value = true
  try {
    const token = getToken()
    const url = editingAddress.value
      ? `${API_URL}/colleges/addresses/${addressForm.value.id}`
      : `${API_URL}/colleges/addresses`
    const method = editingAddress.value ? 'PUT' : 'POST'

    const res = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
      body: JSON.stringify({ ...addressForm.value, college_id: collegeData.value.id })
    })

    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    const ct = res.headers.get('content-type')
    if (!ct?.includes('application/json')) throw new Error('Некорректный ответ сервера')

    const result = await res.json()
    if (!result.success) throw new Error(result.error)

    closeAddressModal()
    await loadCollegeData()
    showAlert(editingAddress.value ? 'Адрес обновлён' : 'Адрес добавлен', 'success')
  } catch (error) {
    showAlert('Ошибка: ' + error.message, 'error')
  } finally {
    saving.value = false
  }
}

const editAddress = (addr) => { openAddressModal(addr) }

const deleteAddress = async (id) => {
  if (!confirm('Удалить адрес?')) return
  try {
    const token = getToken()
    const res = await fetch(`${API_URL}/colleges/addresses/${id}`, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${token}` }
    })
    const result = await res.json()
    if (!result.success) throw new Error(result.error)
    addresses.value = addresses.value.filter(a => a.id !== id)
    showAlert('Адрес удалён', 'success')
  } catch (error) {
    showAlert('Ошибка удаления: ' + error.message, 'error')
  }
}

const fetchApplications = async () => {
  applicationsLoading.value = true
  try {
    const token = getToken()
    const params = new URLSearchParams()
    params.append('page', String(applicationsPagination.value.page))
    params.append('limit', String(applicationsPagination.value.limit))

    if (applicationsFilters.value.status !== 'all') {
      params.append('status', applicationsFilters.value.status)
    }

    if (applicationsFilters.value.specialtyId !== 'all') {
      params.append('specialtyId', applicationsFilters.value.specialtyId)
    }

    if (applicationsFilters.value.sortScore !== 'none') {
      params.append('sortScore', applicationsFilters.value.sortScore)
    }

    const query = params.toString() ? `?${params.toString()}` : ''
    const res = await fetch(`${API_URL}/applications/college${query}`, {
      headers: { 'Authorization': `Bearer ${token}` }
    })

    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    const result = await res.json()
    if (!result.success) throw new Error(result.error)

    applications.value = result.data
    applicationsPagination.value = {
      ...applicationsPagination.value,
      ...(result.pagination || {})
    }
  } catch (error) {
    showAlert('Ошибка загрузки заявок: ' + error.message, 'error')
  } finally {
    applicationsLoading.value = false
  }
}

const onApplicationsFilterChange = () => {
  applicationsPagination.value.page = 1
  fetchApplications()
}

const goToApplicationsPage = (page) => {
  applicationsPagination.value.page = page
  fetchApplications()
}

const fetchApplicationsAnalytics = async () => {
  try {
    const token = getToken()
    const params = new URLSearchParams()
    if (analyticsFilters.value.specialtyId !== 'all') {
      params.append('specialtyId', analyticsFilters.value.specialtyId)
    }
    const query = params.toString() ? `?${params.toString()}` : ''
    const res = await fetch(`${API_URL}/applications/college/analytics${query}`, {
      headers: { 'Authorization': `Bearer ${token}` }
    })

    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    const result = await res.json()
    if (!result.success) throw new Error(result.error)

    applicationsAnalytics.value = result.data
  } catch (error) {
    console.warn('Не удалось загрузить аналитику заявок:', error)
  }
}

const fetchPendingApplicationsCount = async () => {
  try {
    const token = getToken()
    if (!token) return

    const res = await fetch(`${API_URL}/applications/college?status=pending&limit=1`, {
      headers: { 'Authorization': `Bearer ${token}` }
    })

    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    const result = await res.json()
    if (!result.success) throw new Error(result.error)

    pendingApplicationsCount.value = result.pagination?.total ?? (Array.isArray(result.data) ? result.data.length : 0)
  } catch (error) {
    console.warn('Не удалось загрузить количество ожидающих заявок:', error)
  }
}

const updateApplicationStatus = async (applicationId, status) => {
  const actionLabel = status === 'accepted' ? 'принять' : 'отклонить'
  if (!confirm(`Вы действительно хотите ${actionLabel} заявку №${applicationId}?`)) return

  try {
    const token = getToken()
    const res = await fetch(`${API_URL}/applications/${applicationId}/status`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ status })
    })

    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    const result = await res.json()
    if (!result.success) throw new Error(result.error)

    showAlert(result.message || 'Статус заявки обновлён', 'success')
    await Promise.all([fetchApplications(), fetchApplicationsAnalytics(), fetchPendingApplicationsCount()])
  } catch (error) {
    showAlert('Ошибка обновления статуса: ' + error.message, 'error')
  }
}

const getApplicationStatusName = (status) => ({
  pending: 'В ожидании',
  accepted: 'Принята',
  rejected: 'Отклонена',
  cancelled: 'Отменена'
}[status] || status)

const getApplicationStatusClass = (status) => ({
  pending: 'status-pending',
  accepted: 'status-accepted',
  rejected: 'status-rejected',
  cancelled: 'status-cancelled'
}[status] || '')

const maxDailyApplications = computed(() => {
  const days = applicationsAnalytics.value?.last7Days || []
  return Math.max(1, ...days.map((item) => Number(item.total) || 0))
})

const getDailyBarWidth = (value) => {
  const percent = Math.round(((Number(value) || 0) / maxDailyApplications.value) * 100)
  return `${Math.max(4, percent)}%`
}

const formatShortDate = (value) => {
  if (!value) return '—'
  return new Date(value).toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit' })
}

const formatDateTime = (value) => {
  if (!value) return '—'
  return new Date(value).toLocaleString('ru-RU')
}

const getStatusName = (s) => ({ active: 'Активна', inactive: 'Неактивна', draft: 'Черновик' }[s] || s)
const getStatusClass = (s) => s === 'active' ? 'status-active' : s === 'inactive' ? 'status-inactive' : 'status-draft'

const getAddressTypeName = (type) => ({
  legal: 'Юридический',
  actual: 'Фактический',
  educational: 'Учебный корпус',
  branch: 'Филиал',
  other: 'Другое'
}[type] || 'Учебный корпус')

const logout = () => {
  if (confirm('Выйти из системы?')) {
    localStorage.removeItem('authToken')
    localStorage.removeItem('user')
    router.push('/login')
  }
}

watch(activeTab, (tab) => {
  if (tab === 'applications') {
    fetchApplications()
  }

  if (tab === 'analytics') {
    fetchApplicationsAnalytics()
  }
})

onMounted(() => {
  fetchSpoCatalog()
  loadCollegeData()
  fetchPendingApplicationsCount()
  fetchApplicationsAnalytics()
})
</script>

<style scoped>
.stats-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: 16px;
}

.calculated-places-card {
  min-height: 86px;
  border: 1px solid #dbeafe;
  border-radius: 12px;
  padding: 14px 16px;
  background: linear-gradient(135deg, rgba(0, 84, 166, 0.08), rgba(0, 166, 81, 0.1));
  display: flex;
  flex-direction: column;
  justify-content: center;
  gap: 4px;
}

.calculated-places-card span {
  color: #475569;
  font-weight: 700;
  font-size: 0.9rem;
}

.calculated-places-card strong {
  color: #0054a6;
  font-size: 1.65rem;
  line-height: 1;
}

.calculated-places-card small {
  color: #64748b;
  font-weight: 600;
}

.loading-state {
  text-align: center;
  padding: 48px 20px;
  color: #64748b;
  font-size: 1.1rem;
}
.loading-state i {
  font-size: 2.5rem;
  color: #667eea;
  margin-bottom: 15px;
  display: block;
  animation: spin 1s linear infinite;
}
@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

.tab-badge {
  min-width: 22px;
  height: 22px;
  padding: 0 7px;
  border-radius: 999px;
  background: #ef4444;
  color: white;
  font-size: 0.78rem;
  font-weight: 800;
  line-height: 22px;
  text-align: center;
  box-shadow: 0 6px 14px rgba(239, 68, 68, 0.28);
}

/* Адреса */
.addresses-table-wrapper {
  margin-bottom: 16px;
  background: white;
  border-radius: 12px;
  overflow: hidden;
  box-shadow: var(--shadow-sm);
}

.address-type-badge {
  padding: 4px 10px;
  border-radius: 12px;
  font-size: 0.75rem;
  font-weight: 600;
  display: inline-block;
}
.address-type-badge.legal { background: #fee2e2; color: #dc2626; }
.address-type-badge.actual { background: #dbeafe; color: #2563eb; }
.address-type-badge.educational { background: #d1fae5; color: #059669; }
.address-type-badge.branch { background: #fef3c7; color: #d97706; }
.address-type-badge.other { background: #f3e8ff; color: #7c3aed; }

.main-badge {
  background: #0054A6;
  color: white;
  padding: 3px 10px;
  border-radius: 10px;
  font-size: 0.75rem;
  font-weight: 600;
}

.empty-addresses {
  text-align: center;
  padding: 32px 20px;
  color: #94a3b8;
}
.empty-addresses i {
  font-size: 2.5rem;
  margin-bottom: 10px;
  display: block;
}

.add-address-btn {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 24px;
  background: #0054A6;
  color: white;
  border: none;
  border-radius: 8px;
  font-weight: 600;
  cursor: pointer;
  margin-top: 15px;
  transition: all 0.3s;
}
.add-address-btn:hover { background: #003d7a; }

.applications-toolbar {
  display: flex;
  justify-content: space-between;
  align-items: flex-end;
  margin-bottom: 16px;
  gap: 14px;
}

.applications-filters {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: 14px;
}

.analytics-filter-toolbar {
  margin-top: 16px;
}

.pagination {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 14px;
  margin-top: 18px;
  font-weight: 700;
  color: #1e293b;
}

.applications-analytics {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
  gap: 12px;
  margin-bottom: 16px;
}

.analytics-card {
  background: white;
  border: 1px solid var(--border-color);
  border-radius: 10px;
  padding: 14px;
  box-shadow: var(--shadow-sm);
}

.analytics-card strong {
  display: block;
  margin-top: 6px;
  color: #1e293b;
  font-size: 1.6rem;
}

.analytics-label {
  color: #64748b;
  font-size: 0.85rem;
  font-weight: 700;
}

.analytics-layout {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
  gap: 14px;
  margin-bottom: 18px;
}

.analytics-panel {
  background: white;
  border: 1px solid var(--border-color);
  border-radius: 10px;
  padding: 16px;
  box-shadow: var(--shadow-sm);
}

.analytics-panel h3 {
  margin: 0 0 12px;
  color: #1e293b;
}

.daily-bars {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.daily-bar-row {
  display: grid;
  grid-template-columns: 48px 1fr 32px;
  gap: 10px;
  align-items: center;
  color: #64748b;
  font-size: 0.9rem;
}

.daily-bar-track {
  height: 9px;
  background: #e2e8f0;
  border-radius: 999px;
  overflow: hidden;
}

.daily-bar-fill {
  height: 100%;
  border-radius: 999px;
  background: linear-gradient(135deg, #0054A6, #22c55e);
}

.specialty-analytics-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
  max-height: 260px;
  overflow: auto;
}

.specialty-analytics-item {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  padding-bottom: 10px;
  border-bottom: 1px solid #eef2f7;
}

.specialty-analytics-item div {
  display: flex;
  flex-direction: column;
  gap: 3px;
}

.specialty-analytics-item span {
  color: #64748b;
  font-size: 0.85rem;
}

.specialty-analytics-item b {
  color: #0054A6;
  font-size: 1.2rem;
}

.applicant-cell {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.applicant-name {
  font-weight: 600;
  color: #1e293b;
}

.applicant-meta {
  font-size: 0.84rem;
  color: #64748b;
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

.btn-accept {
  background: #dcfce7;
  color: #166534;
}

.btn-accept:hover:not(:disabled) {
  background: #22c55e;
  color: white;
}

.btn-reject {
  background: #fee2e2;
  color: #b91c1c;
}

.btn-reject:hover:not(:disabled) {
  background: #ef4444;
  color: white;
}

.btn-action:disabled {
  opacity: 0.55;
  cursor: not-allowed;
}

/* Modal */
.modal-lg { max-width: 700px; }
.form-hint { color: #94a3b8; font-size: 0.8rem; margin-top: 4px; display: block; }
.checkbox-label {
  display: flex;
  align-items: center;
  gap: 10px;
  cursor: pointer;
  font-weight: normal;
}
.checkbox-label input[type="checkbox"] {
  width: 18px;
  height: 18px;
  cursor: pointer;
}

.selected-specialty-summary {
  display: grid;
  grid-template-columns: max-content 1fr;
  gap: 6px 14px;
  margin: 12px 0 18px;
  padding: 14px 16px;
  border: 1px solid #dbeafe;
  border-radius: 8px;
  background: #f8fbff;
}

.selected-specialty-summary span {
  color: #64748b;
  font-size: 0.85rem;
  font-weight: 700;
}

.selected-specialty-summary strong {
  color: #0f172a;
  line-height: 1.35;
}

/* Стили для превью изображений и кнопки удаления */
.image-preview {
  position: relative;
  margin-top: 15px;
  border-radius: 8px;
  overflow: hidden;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  display: inline-block;
}

.image-preview img {
  max-width: 300px;
  max-height: 300px;
  display: block;
}

.remove-image-btn {
  position: absolute;
  top: 8px;
  right: 8px;
  background: rgba(220, 38, 38, 0.9);
  color: white;
  border: none;
  border-radius: 50%;
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.2s;
  font-size: 14px;
}

.remove-image-btn:hover {
  background: rgba(185, 28, 28, 1);
  transform: scale(1.1);
}

.image-upload {
  border: 2px dashed #cbd5e1;
  border-radius: 8px;
  padding: 24px;
  text-align: center;
  cursor: pointer;
  transition: all 0.3s;
  background: #f8fafc;
}

.image-upload:hover {
  border-color: #667eea;
  background: #f0f4ff;
}

.image-upload i {
  font-size: 2.5rem;
  color: #667eea;
  margin-bottom: 10px;
  display: block;
}

.text-small {
  font-size: 0.75rem;
  color: #94a3b8;
  margin-top: 5px;
}

@media (max-width: 768px) {
  .analytics-layout {
    grid-template-columns: 1fr;
  }

  .applications-filters {
    grid-template-columns: 1fr;
    width: 100%;
  }
}
</style>
