const { validateInitData, parseInitData } = require('../utils/telegram');

/**
 * Middleware для валидации initData от Telegram Mini App
 */
function validateTelegramData(req, res, next) {
  try {
    console.log('\n🔒 [Auth Middleware] Валидация Telegram данных');
    const { initData } = req.body;
    
    console.log('🔍 InitData присутствует:', !!initData);
    if (initData) {
      console.log('📏 InitData длина:', initData.length);
      console.log('🔗 InitData начало:', initData.substring(0, 100) + '...');
    }
    
    if (!initData) {
      console.log('❌ InitData отсутствует в теле запроса');
      return res.status(401).json({ 
        error: 'initData отсутствует',
        code: 'MISSING_INIT_DATA'
      });
    }
    
    const botToken = process.env.BOT_TOKEN;
    if (!botToken) {
      console.error('❌ BOT_TOKEN не настроен в переменных окружения');
      return res.status(500).json({ 
        error: 'Ошибка конфигурации сервера',
        code: 'SERVER_CONFIG_ERROR'
      });
    }
    
    console.log('🤖 BOT_TOKEN настроен:', botToken ? 'Да' : 'Нет');
    
    // Валидируем подпись
    console.log('🔐 Валидация подписи initData...');
    if (!validateInitData(initData, botToken)) {
      console.log('❌ Недействительная подпись initData');
      return res.status(401).json({ 
        error: 'Недействительная подпись initData',
        code: 'INVALID_SIGNATURE'
      });
    }
    
    console.log('✅ Подпись initData валидна');
    
    // Парсим данные пользователя
    console.log('📝 Парсинг данных пользователя...');
    const userData = parseInitData(initData);
    if (!userData) {
      console.log('❌ Не удалось спарсить данные пользователя');
      return res.status(401).json({ 
        error: 'Не удалось получить данные пользователя',
        code: 'PARSE_ERROR'
      });
    }
    
    console.log('✅ Данные пользователя получены:', userData);
    
    // Добавляем данные пользователя в объект запроса
    req.telegramUser = userData;
    console.log('🎯 Переходим к следующему middleware/контроллеру');
    next();
    
  } catch (error) {
    console.error('\n❌ [Auth Middleware] Ошибка валидации:');
    console.error('Error:', error.message);
    console.error('Stack:', error.stack);
    return res.status(500).json({ 
      error: 'Внутренняя ошибка сервера',
      code: 'INTERNAL_ERROR',
      timestamp: new Date().toISOString()
    });
  }
}

module.exports = {
  validateTelegramData
};
