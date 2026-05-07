export const normalizeRussianPhone = (value) => {
  if (typeof value !== 'string') return null

  const digits = value.replace(/\D/g, '')

  if (digits.length === 11 && (digits.startsWith('7') || digits.startsWith('8'))) {
    return `+7${digits.slice(1)}`
  }

  if (digits.length === 10) {
    return `+7${digits}`
  }

  return null
}

export const formatRussianPhone = (value) => {
  const normalized = normalizeRussianPhone(value)
  if (!normalized) return ''

  const digits = normalized.slice(2)
  return `+7 (${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6, 8)}-${digits.slice(8, 10)}`
}

export const maskRussianPhoneInput = (value) => {
  if (typeof value !== 'string') return ''

  let digits = value.replace(/\D/g, '')

  if (!digits) return ''

  if (digits.startsWith('8')) {
    digits = `7${digits.slice(1)}`
  } else if (!digits.startsWith('7')) {
    digits = `7${digits}`
  }

  digits = digits.slice(0, 11)
  const local = digits.slice(1)

  if (!local.length) return '+7'

  let masked = '+7'

  if (local.length > 0) {
    masked += ` (${local.slice(0, 3)}`
  }
  if (local.length >= 4) {
    masked += ') '
    masked += local.slice(3, 6)
  }
  if (local.length >= 7) {
    masked += `-${local.slice(6, 8)}`
  }
  if (local.length >= 9) {
    masked += `-${local.slice(8, 10)}`
  }

  return masked
}
