/**
 * Утилиты для работы с Telegram Mini App
 */

// Проверка доступности Telegram WebApp API
export function isTelegramWebApp() {
  const isAvailable = typeof window !== 'undefined' && 
         window.Telegram && 
         window.Telegram.WebApp
  
  console.log('🤖 [Telegram Utils] WebApp доступен:', isAvailable)
  if (isAvailable) {
    console.log('📱 WebApp версия:', window.Telegram.WebApp.version)
    console.log('🎯 WebApp платформа:', window.Telegram.WebApp.platform)
  }
  
  return isAvailable
}

// Получение данных пользователя из Telegram
export function getTelegramUser() {
  console.log('\n👤 [Telegram Utils] Получение данных пользователя')
  
  if (!isTelegramWebApp()) {
    console.log('❌ Telegram WebApp недоступен')
    return null
  }
  
  try {
    const initData = window.Telegram.WebApp.initDataUnsafe
    console.log('🔍 InitDataUnsafe:', initData)
    
    const user = initData.user || null
    console.log('👤 User данные:', user)
    
    return user
  } catch (error) {
    console.error('❌ [Telegram Utils] Ошибка получения данных пользователя:')
    console.error('Error:', error.message)
    console.error('Stack:', error.stack)
    return null
  }
}

// Получение initData для отправки на сервер
export function getInitData() {
  console.log('\n🔑 [Telegram Utils] Получение initData')
  
  if (!isTelegramWebApp()) {
    console.log('❌ Telegram WebApp недоступен')
    return null
  }
  
  return window.Telegram.WebApp.initData
}

// Инициализация Telegram Mini App
export function initTelegramApp() {
  if (!isTelegramWebApp()) {
    console.warn('Telegram WebApp API недоступен')
    return false
  }
  
  const tg = window.Telegram.WebApp
  
  try {
    // Уведомляем Telegram о готовности приложения
    tg.ready()
    
    // Разворачиваем приложение на весь экран
    tg.expand()
    
    // Включаем закрывающее подтверждение
    tg.enableClosingConfirmation()
    
    console.log('✅ Telegram Mini App инициализирован')
    return true
  } catch (error) {
    console.error('❌ Ошибка инициализации Telegram Mini App:', error)
    return false
  }
}

// Показать главную кнопку
export function showMainButton(text, onClick) {
  if (!isTelegramWebApp()) return
  
  const mainButton = window.Telegram.WebApp.MainButton
  mainButton.setText(text)
  mainButton.onClick(onClick)
  mainButton.show()
}

// Скрыть главную кнопку
export function hideMainButton() {
  if (!isTelegramWebApp()) return
  
  window.Telegram.WebApp.MainButton.hide()
}

// Показать кнопку назад
export function showBackButton(onClick) {
  if (!isTelegramWebApp()) return
  
  const backButton = window.Telegram.WebApp.BackButton
  backButton.onClick(onClick)
  backButton.show()
}

// Скрыть кнопку назад
export function hideBackButton() {
  if (!isTelegramWebApp()) return
  
  window.Telegram.WebApp.BackButton.hide()
}

// Показать всплывающее окно
export function showPopup(params) {
  if (!isTelegramWebApp()) {
    alert(params.message)
    return
  }
  
  window.Telegram.WebApp.showPopup(params)
}

// Подтверждение действия
export function showConfirm(message, callback) {
  if (!isTelegramWebApp()) {
    const result = confirm(message)
    callback(result)
    return
  }
  
  window.Telegram.WebApp.showConfirm(message, callback)
}

// Вибрация (haptic feedback)
export function hapticFeedback(type = 'impact', style = 'medium') {
  if (!isTelegramWebApp()) return
  
  const haptic = window.Telegram.WebApp.HapticFeedback
  
  if (type === 'impact') {
    haptic.impactOccurred(style) // light, medium, heavy
  } else if (type === 'notification') {
    haptic.notificationOccurred(style) // error, success, warning
  } else if (type === 'selection') {
    haptic.selectionChanged()
  }
}

// Закрыть приложение
export function closeApp() {
  if (!isTelegramWebApp()) {
    window.close()
    return
  }
  
  window.Telegram.WebApp.close()
}

// Получение параметров темы
export function getThemeParams() {
  if (!isTelegramWebApp()) {
    return {}
  }
  
  return window.Telegram.WebApp.themeParams
}

// Применение CSS переменных темы
export function applyTheme() {
  if (!isTelegramWebApp()) return
  
  const themeParams = getThemeParams()
  const root = document.documentElement
  
  // Применяем переменные темы Telegram
  Object.entries(themeParams).forEach(([key, value]) => {
    const cssVar = `--tg-theme-${key.replace(/_/g, '-')}`
    root.style.setProperty(cssVar, value)
  })
}

// Сохранение данных в CloudStorage
export async function saveToCloudStorage(key, value) {
  if (!isTelegramWebApp() || !window.Telegram.WebApp.CloudStorage) {
    // Fallback: сохраняем в localStorage
    localStorage.setItem(key, JSON.stringify(value))
    return
  }
  
  try {
    await window.Telegram.WebApp.CloudStorage.setItem(key, JSON.stringify(value))
  } catch (error) {
    console.error('Ошибка сохранения в CloudStorage:', error)
    // Fallback: сохраняем в localStorage
    localStorage.setItem(key, JSON.stringify(value))
  }
}

// Получение данных из CloudStorage
export async function getFromCloudStorage(key) {
  if (!isTelegramWebApp() || !window.Telegram.WebApp.CloudStorage) {
    // Fallback: получаем из localStorage
    const item = localStorage.getItem(key)
    return item ? JSON.parse(item) : null
  }
  
  try {
    const value = await window.Telegram.WebApp.CloudStorage.getItem(key)
    return value ? JSON.parse(value) : null
  } catch (error) {
    console.error('Ошибка получения из CloudStorage:', error)
    // Fallback: получаем из localStorage
    const item = localStorage.getItem(key)
    return item ? JSON.parse(item) : null
  }
}

export default {
  isTelegramWebApp,
  getTelegramUser,
  getInitData,
  initTelegramApp,
  showMainButton,
  hideMainButton,
  showBackButton,
  hideBackButton,
  showPopup,
  showConfirm,
  hapticFeedback,
  closeApp,
  getThemeParams,
  applyTheme,
  saveToCloudStorage,
  getFromCloudStorage
}
