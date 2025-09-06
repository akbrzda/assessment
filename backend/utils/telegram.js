const crypto = require('crypto');

/**
 * Валидация initData от Telegram Mini App
 * @param {string} initDataString - строка initData от Telegram
 * @param {string} botToken - токен бота
 * @returns {boolean} - результат валидации
 */
function validateInitData(initDataString, botToken) {
  try {
    console.log('\n🔐 [Telegram Utils] Начало валидации initData');
    console.log('📏 InitData длина:', initDataString.length);
    
    const urlParams = new URLSearchParams(initDataString);
    const receivedHash = urlParams.get('hash');
    
    console.log('🔍 Полученный hash:', receivedHash ? 'Присутствует' : 'Отсутствует');
    
    if (!receivedHash) {
      console.log('❌ Hash отсутствует в initData');
      return false;
    }
    
    // Удаляем hash из параметров
    urlParams.delete('hash');
    
    // Создаем строку для проверки подписи
    const dataCheckString = Array.from(urlParams.entries())
      .sort(([aKey], [bKey]) => aKey.localeCompare(bKey))
      .map(([k, v]) => `${k}=${v}`)
      .join('\n');
    
    console.log('📝 DataCheck string длина:', dataCheckString.length);
    console.log('🔗 DataCheck string:', dataCheckString.substring(0, 200) + '...');
    
    // Создаем секретный ключ для подписи (HMAC-SHA256 от botToken с 'WebAppData')
    console.log('🔑 Создание секретного ключа...');
    const secretKey = crypto
      .createHmac('sha256', 'WebAppData')
      .update(botToken)
      .digest();
    
    // Вычисляем hash
    console.log('🧮 Вычисление hash...');
    const computedHash = crypto
      .createHmac('sha256', secretKey)
      .update(dataCheckString)
      .digest('hex');
    
    console.log('🔍 Полученный hash:   ', receivedHash);
    console.log('🧮 Вычисленный hash: ', computedHash);
    
    // Безопасное сравнение hash'ей
    const isValid = crypto.timingSafeEqual(
      Buffer.from(computedHash), 
      Buffer.from(receivedHash)
    );
    
    console.log('✅ Результат валидации:', isValid ? 'УСПЕШНО' : 'ОШИБКА');
    return isValid;
    
  } catch (error) {
    console.error('\n❌ [Telegram Utils] Ошибка валидации initData:');
    console.error('Error:', error.message);
    console.error('Stack:', error.stack);
    return false;
  }
}

/**
 * Парсинг данных пользователя из initData
 * @param {string} initDataString - строка initData от Telegram
 * @returns {object|null} - данные пользователя или null
 */
function parseInitData(initDataString) {
  try {
    console.log('\n📝 [Telegram Utils] Парсинг initData');
    console.log('📏 InitData длина:', initDataString.length);
    const urlParams = new URLSearchParams(initDataString);
    const userString = urlParams.get('user');
    const authDate = urlParams.get('auth_date');
    
    if (!userString || !authDate) {
      return null;
    }
    
    // Проверяем срок действия auth_date (не старше 24 часов)
    const authTimestamp = parseInt(authDate);
    const currentTimestamp = Math.floor(Date.now() / 1000);
    const maxAge = 24 * 60 * 60; // 24 часа в секундах
    
    if (currentTimestamp - authTimestamp > maxAge) {
      console.warn('initData устарел');
      return null;
    }
    
    const userData = JSON.parse(decodeURIComponent(userString));
    
    return {
      id: userData.id,
      first_name: userData.first_name || '',
      last_name: userData.last_name || '',
      username: userData.username || '',
      language_code: userData.language_code || 'ru',
      auth_date: authTimestamp
    };
  } catch (error) {
    console.error('Ошибка парсинга initData:', error);
    return null;
  }
}

module.exports = {
  validateInitData,
  parseInitData
};
