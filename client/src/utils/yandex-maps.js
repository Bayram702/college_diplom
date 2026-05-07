const DEFAULT_TIMEOUT_MS = 15000

const waitForYmapsReady = () => new Promise((resolve, reject) => {
  if (!window.ymaps || typeof window.ymaps.ready !== 'function') {
    reject(new Error('Yandex Maps API загружен некорректно'))
    return
  }

  window.ymaps.ready(() => resolve(window.ymaps))
})

const loadScriptOnce = (src, timeoutMs = DEFAULT_TIMEOUT_MS) => new Promise((resolve, reject) => {
  const existing = document.querySelector(`script[data-yandex-maps-src="${src}"]`)
  if (existing && window.ymaps) {
    waitForYmapsReady().then(resolve).catch(reject)
    return
  }

  const script = document.createElement('script')
  script.src = src
  script.type = 'text/javascript'
  script.async = true
  script.defer = true
  script.setAttribute('data-yandex-maps-src', src)

  const timer = setTimeout(() => {
    script.remove()
    reject(new Error(`Таймаут загрузки Yandex Maps API (${src})`))
  }, timeoutMs)

  script.onload = async () => {
    clearTimeout(timer)
    try {
      const ymaps = await waitForYmapsReady()
      resolve(ymaps)
    } catch (error) {
      reject(error)
    }
  }

  script.onerror = () => {
    clearTimeout(timer)
    script.remove()
    reject(new Error(`Ошибка загрузки скрипта Yandex Maps API (${src})`))
  }

  document.head.appendChild(script)
})

const getScriptSources = (apiKey) => {
  if (apiKey) {
    return [
      `https://api-maps.yandex.ru/2.1/?apikey=${encodeURIComponent(apiKey)}&lang=ru_RU&load=package.full`,
      `https://api-maps.yandex.ru/2.1/?apikey=${encodeURIComponent(apiKey)}&lang=ru_RU`,
      'https://api-maps.yandex.ru/2.1/?lang=ru_RU&load=package.full'
    ]
  }

  return [
    'https://api-maps.yandex.ru/2.1/?lang=ru_RU&load=package.full',
    'https://api-maps.yandex.ru/2.1/?lang=ru_RU'
  ]
}

export const loadYandexMaps = async (options = {}) => {
  if (window.ymaps) {
    return waitForYmapsReady()
  }

  const apiKey = options.apiKey || import.meta.env.VITE_YANDEX_MAPS_API_KEY || ''
  const timeoutMs = Number(options.timeoutMs) > 0 ? Number(options.timeoutMs) : DEFAULT_TIMEOUT_MS
  const sources = getScriptSources(apiKey)

  let lastError = null

  for (const src of sources) {
    try {
      return await loadScriptOnce(src, timeoutMs)
    } catch (error) {
      lastError = error
      console.warn('Не удалось загрузить Yandex Maps API по URL:', src, error)
    }
  }

  throw lastError || new Error('Не удалось загрузить Yandex Maps API')
}
