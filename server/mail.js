// server/mail.js — отправка email
const nodemailer = require('nodemailer')
const fs = require('fs')
const PDFDocument = require('pdfkit')

// Создаём транспортёр один раз
const getSmtpConfig = () => ({
  host: (process.env.SMTP_HOST || '').trim(),
  port: parseInt(process.env.SMTP_PORT, 10) || 587,
  secure: process.env.SMTP_SECURE === 'true',
  user: (process.env.SMTP_USER || '').trim(),
  pass: (process.env.SMTP_PASS || '').replace(/\s+/g, '')
})

const createTransporter = () => {
  const config = getSmtpConfig()

  return nodemailer.createTransport({
    host: config.host,
    port: config.port,
    secure: config.secure,
    auth: {
      user: config.user,
      pass: config.pass
    }
  })
}

const escapeHtml = (value) => String(value ?? '')
  .replace(/&/g, '&amp;')
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;')

const formatScore = (value) => {
  const number = Number(value)
  return Number.isFinite(number) ? number.toFixed(2) : '—'
}

const formatDate = (value) => {
  if (!value) return '—'
  return new Date(value).toLocaleString('ru-RU')
}

const getPdfFontPath = () => {
  const candidates = [
    'C:\\Windows\\Fonts\\arial.ttf',
    'C:\\Windows\\Fonts\\calibri.ttf',
    '/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf'
  ]

  return candidates.find((file) => fs.existsSync(file)) || null
}

const buildAcceptedApplicationPdf = (application) => new Promise((resolve, reject) => {
  const doc = new PDFDocument({ size: 'A4', margin: 48 })
  const chunks = []
  const fontPath = getPdfFontPath()

  doc.on('data', (chunk) => chunks.push(chunk))
  doc.on('end', () => resolve(Buffer.concat(chunks)))
  doc.on('error', reject)

  if (fontPath) {
    doc.font(fontPath)
  }

  const line = (label, value) => {
    doc.fontSize(11).fillColor('#334155').text(label, { continued: true })
    doc.fillColor('#111827').text(` ${value || '—'}`)
  }

  doc.fontSize(18).fillColor('#111827').text(application.college_name || 'Колледж', {
    align: 'center'
  })
  doc.moveDown(1.2)
  doc.fontSize(15).fillColor('#0054A6').text('Подтверждение принятия заявления', {
    align: 'center'
  })
  doc.moveDown(1.5)

  line('Номер заявления:', application.id)
  line('Статус:', 'Принята')
  line('Дата подачи:', formatDate(application.created_at))
  line('Дата принятия:', formatDate(application.decided_at))
  doc.moveDown(0.8)

  line('ФИО абитуриента:', application.applicant_name)
  line('Паспортные данные:', `${application.passport_series || ''} ${application.passport_number || ''}`.trim())
  line('Средний балл аттестата:', formatScore(application.avg_score))
  line('Телефон для обратной связи:', application.phone)
  line('Email:', application.email)
  line('Требуется общежитие:', application.needs_dormitory ? 'Да' : 'Нет')
  doc.moveDown(0.8)

  line('Колледж:', application.college_name)
  line('Специальность:', `${application.specialty_code || ''} ${application.specialty_name || ''}`.trim())
  doc.moveDown(1.5)

  doc.fontSize(10).fillColor('#64748b').text(
    'Документ сформирован автоматически порталом колледжей. Сохраните этот файл как подтверждение принятой заявки.',
    { align: 'left' }
  )

  doc.end()
})

// Проверка, настроен ли SMTP
const isConfigured = () => {
  const config = getSmtpConfig()
  return !!(config.host && config.user && config.pass)
}

// Отправка email с данными для входа
const sendCredentialsEmail = async (toEmail, name, login, password) => {
  if (!isConfigured()) {
    console.log('⚠️ SMTP не настроен. Данные для входа:')
    console.log(`  👤 Имя: ${name}`)
    console.log(`  🔑 Логин: ${login}`)
    console.log(`  🔒 Пароль: ${password}`)
    return { success: false, reason: 'SMTP not configured' }
  }

  try {
    const portalUrl = process.env.PORTAL_URL || 'http://localhost:5173'
    const config = getSmtpConfig()
    const transporter = createTransporter()

    const info = await transporter.sendMail({
      from: `"Портал колледжей Башкортостана" <${config.user}>`,
      to: toEmail,
      subject: 'Доступ к панели представителя колледжа',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h2 style="color: #0054A6;">Здравствуйте, ${name}!</h2>
          <p>Вам предоставлен доступ к панели представителя колледжа на портале колледжей Республики Башкортостан.</p>
          
          <div style="background: #f5f7fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3 style="margin-top: 0; color: #1e293b;">Ваши данные для входа:</h3>
            <p><strong>Логин:</strong> <code style="background: #e2e8f0; padding: 4px 8px; border-radius: 4px;">${login}</code></p>
            <p><strong>Пароль:</strong> <code style="background: #e2e8f0; padding: 4px 8px; border-radius: 4px;">${password}</code></p>
          </div>
          
         
          
          
          
          <hr style="border: none; border-top: 1px solid #e1e8ed; margin: 20px 0;">
          <p style="color: #94a3b8; font-size: 0.85rem;">
            Это письмо отправлено автоматически. Пожалуйста, не отвечайте на него.
          </p>
        </div>
      `
    })

    console.log(`✅ Email отправлен на ${toEmail}, messageId: ${info.messageId}`)
    return { success: true, messageId: info.messageId }
  } catch (error) {
    console.error('❌ Ошибка отправки email:', error)
    return {
      success: false,
      error: error.response || error.message,
      code: error.code || null
    }
  }
}

const sendPasswordResetCodeEmail = async (toEmail, name, code) => {
  if (!isConfigured()) {
    console.log('⚠️ SMTP не настроен. Код смены пароля:')
    console.log(`  👤 Имя: ${name}`)
    console.log(`  📧 Email: ${toEmail}`)
    console.log(`  🔢 Код: ${code}`)
    return { success: false, reason: 'SMTP not configured' }
  }

  try {
    const config = getSmtpConfig()
    const transporter = createTransporter()

    const info = await transporter.sendMail({
      from: `"Портал колледжей Башкортостана" <${config.user}>`,
      to: toEmail,
      subject: 'Код для смены пароля',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 560px; margin: 0 auto; padding: 20px;">
          <h2 style="color: #0054A6;">Здравствуйте, ${name}!</h2>
          <p>Вы запросили смену пароля в личном кабинете абитуриента.</p>
          <div style="background: #f5f7fa; padding: 18px; border-radius: 8px; margin: 20px 0; text-align: center;">
            <div style="color: #64748b; font-size: 14px; margin-bottom: 8px;">Ваш код подтверждения</div>
            <div style="font-size: 32px; letter-spacing: 8px; font-weight: 700; color: #1e293b;">${code}</div>
          </div>
          <p>Код действует 10 минут. Если вы не запрашивали смену пароля, просто проигнорируйте это письмо.</p>
        </div>
      `
    })

    console.log(`✅ Код смены пароля отправлен на ${toEmail}, messageId: ${info.messageId}`)
    return { success: true, messageId: info.messageId }
  } catch (error) {
    console.error('❌ Ошибка отправки кода смены пароля:', error)
    return {
      success: false,
      error: error.response || error.message,
      code: error.code || null
    }
  }
}

const sendRepresentativePasswordChangedEmail = async (toEmail, name, login, password) => {
  if (!isConfigured()) {
    console.log('⚠️ SMTP не настроен. Новый пароль представителя:')
    console.log(`  👤 Имя: ${name}`)
    console.log(`  📧 Email: ${toEmail}`)
    console.log(`  🔑 Логин: ${login}`)
    console.log(`  🔒 Новый пароль: ${password}`)
    return { success: false, reason: 'SMTP not configured' }
  }

  try {
    const portalUrl = process.env.PORTAL_URL || 'http://localhost:5173'
    const config = getSmtpConfig()
    const transporter = createTransporter()

    const info = await transporter.sendMail({
      from: `"Портал колледжей Башкортостана" <${config.user}>`,
      to: toEmail,
      subject: 'Ваш пароль для панели представителя колледжа изменен',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h2 style="color: #0054A6;">Здравствуйте, ${name}!</h2>
          <p>Администратор изменил пароль для вашей учетной записи представителя колледжа.</p>

          <div style="background: #f5f7fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3 style="margin-top: 0; color: #1e293b;">Новые данные для входа:</h3>
            <p><strong>Ссылка:</strong> <a href="${portalUrl}">${portalUrl}</a></p>
            <p><strong>Логин:</strong> <code style="background: #e2e8f0; padding: 4px 8px; border-radius: 4px;">${login}</code></p>
            <p><strong>Новый пароль:</strong> <code style="background: #e2e8f0; padding: 4px 8px; border-radius: 4px;">${password}</code></p>
          </div>

          <p>Если вы не ожидали смену пароля, обратитесь к администратору портала.</p>
          <hr style="border: none; border-top: 1px solid #e1e8ed; margin: 20px 0;">
          <p style="color: #94a3b8; font-size: 0.85rem;">
            Это письмо отправлено автоматически. Пожалуйста, не отвечайте на него.
          </p>
        </div>
      `
    })

    console.log(`✅ Новый пароль представителя отправлен на ${toEmail}, messageId: ${info.messageId}`)
    return { success: true, messageId: info.messageId }
  } catch (error) {
    console.error('❌ Ошибка отправки нового пароля представителя:', error)
    return {
      success: false,
      error: error.response || error.message,
      code: error.code || null
    }
  }
}

const sendAcceptedApplicationEmail = async (toEmail, application) => {
  const pdf = await buildAcceptedApplicationPdf(application)

  if (!isConfigured()) {
    console.log('⚠️ SMTP не настроен. PDF принятой заявки сформирован, но письмо не отправлено.')
    console.log(`  Email: ${toEmail}`)
    console.log(`  Заявка: ${application.id}`)
    return { success: false, reason: 'SMTP not configured', pdfGenerated: true }
  }

  try {
    const config = getSmtpConfig()
    const transporter = createTransporter()
    const applicantName = application.applicant_name || 'абитуриент'
    const collegeName = application.college_name || 'колледж'

    const info = await transporter.sendMail({
      from: `"Портал колледжей Башкортостана" <${config.user}>`,
      to: toEmail,
      subject: `Заявка №${application.id} принята`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h2 style="color: #0054A6;">Здравствуйте, ${escapeHtml(applicantName)}!</h2>
          <p>Ваша заявка №${escapeHtml(application.id)} принята колледжем «${escapeHtml(collegeName)}».</p>
          <p>К письму приложен PDF-файл с полной информацией по принятой заявке.</p>
        </div>
      `,
      attachments: [
        {
          filename: `accepted-application-${application.id}.pdf`,
          content: pdf,
          contentType: 'application/pdf'
        }
      ]
    })

    console.log(`✅ Письмо о принятии заявки отправлено на ${toEmail}, messageId: ${info.messageId}`)
    return { success: true, messageId: info.messageId }
  } catch (error) {
    console.error('❌ Ошибка отправки письма о принятии заявки:', error)
    return {
      success: false,
      error: error.response || error.message,
      code: error.code || null
    }
  }
}

module.exports = {
  sendCredentialsEmail,
  sendPasswordResetCodeEmail,
  sendRepresentativePasswordChangedEmail,
  sendAcceptedApplicationEmail,
  isConfigured
}
