const TelegramBot = require('node-telegram-bot-api');
require('dotenv').config();

// Проверка обязательных переменных окружения
if (!process.env.BOT_TOKEN) {
  console.error('❌ BOT_TOKEN не установлен в переменных окружения');
  process.exit(1);
}

console.log('🤖 [Telegram Bot] Инициализация бота...');
console.log('🔑 BOT_TOKEN настроен:', process.env.BOT_TOKEN ? 'Да' : 'Нет');

// Создание экземпляра бота
const bot = new TelegramBot(process.env.BOT_TOKEN, { polling: true });

// URL Mini App (пока заглушка)
const MINI_APP_URL = process.env.MINI_APP_URL || 'https://your-domain.com';
console.log('🌐 MINI_APP_URL:', MINI_APP_URL);

// ID чата для логирования
const LOG_CHAT_ID = process.env.LOG_CHAT_ID;
console.log('📝 LOG_CHAT_ID настроен:', LOG_CHAT_ID ? 'Да' : 'Нет');

/**
 * Функция для отправки лога в группу
 */
async function sendLog(message) {
  if (!LOG_CHAT_ID) {
    console.log('⚠️  LOG_CHAT_ID не настроен, лог не отправлен');
    return;
  }
  
  try {
    console.log('📤 Отправка лога в группу:', message);
    await bot.sendMessage(LOG_CHAT_ID, `📝 Лог: ${message}`, {
      parse_mode: 'HTML'
    });
    console.log('✅ Лог успешно отправлен');
  } catch (error) {
    console.error('❌ Ошибка отправки лога:', error.message);
  }
}

/**
 * Обработчик команды /start
 */
bot.onText(/\/start/, async (msg) => {
  const timestamp = new Date().toISOString();
  const chatId = msg.chat.id;
  const user = msg.from;
  
  console.log(`\n🚀 [${timestamp}] Команда /start от пользователя:`);
  console.log('👤 User ID:', user.id);
  console.log('👤 Username:', user.username);
  console.log('👤 Name:', user.first_name, user.last_name);
  console.log('💬 Chat ID:', chatId);
  
  console.log(`📱 Команда /start от пользователя: ${user.first_name} ${user.last_name} (ID: ${user.id})`);
  
  try {
    // Отправляем приветственное сообщение с кнопкой для открытия Mini App
    const welcomeMessage = `
🎓 <b>Добро пожаловать в систему аттестации!</b>

Привет, ${user.first_name}! 👋

Эта система поможет вам:
• Проходить аттестации и тесты
• Отслеживать свой прогресс
• Участвовать в соревнованиях
• Получать бейджи и награды

Нажмите кнопку ниже, чтобы открыть приложение:
    `;
    
    const keyboard = {
      inline_keyboard: [
        [
          {
            text: '🚀 Открыть приложение',
            web_app: { url: MINI_APP_URL }
          }
        ]
      ]
    };
    
    await bot.sendMessage(chatId, welcomeMessage, {
      parse_mode: 'HTML',
      reply_markup: keyboard
    });
    
    // Логируем событие
    await sendLog(`Пользователь ${user.first_name} ${user.last_name} (ID: ${user.id}) выполнил команду /start`);
    
  } catch (error) {
    console.error('Ошибка обработки команды /start:', error);
    
    await bot.sendMessage(chatId, '❌ Произошла ошибка. Попробуйте позже.', {
      parse_mode: 'HTML'
    });
  }
});

/**
 * Обработчик команды /help
 */
bot.onText(/\/help/, async (msg) => {
  const chatId = msg.chat.id;
  
  const helpMessage = `
📚 <b>Помощь по системе аттестации</b>

<b>Доступные команды:</b>
/start - Запуск системы аттестации
/help - Показать эту справку

<b>Как пользоваться:</b>
1. Нажмите /start для запуска
2. Откройте приложение
3. Пройдите регистрацию
4. Начните проходить аттестации

<b>Техническая поддержка:</b>
Если возникли проблемы, обратитесь к администратору.
  `;
  
  await bot.sendMessage(chatId, helpMessage, {
    parse_mode: 'HTML'
  });
});

/**
 * Обработчик неизвестных команд
 */
bot.on('message', async (msg) => {
  // Игнорируем обработанные команды и сообщения от ботов
  if (msg.text?.startsWith('/') || msg.from.is_bot) {
    return;
  }
  
  const chatId = msg.chat.id;
  
  const responseMessage = `
❓ Извините, я не понимаю это сообщение.

Используйте команду /start для запуска системы аттестации или /help для получения справки.
  `;
  
  await bot.sendMessage(chatId, responseMessage, {
    parse_mode: 'HTML'
  });
});

/**
 * Обработчик ошибок
 */
bot.on('error', (error) => {
  console.error('❌ Ошибка бота:', error);
});

bot.on('polling_error', (error) => {
  console.error('❌ Ошибка polling:', error);
});

// Запуск бота
console.log('🤖 Telegram бот запущен и готов к работе');
console.log(`📡 Бот: @${process.env.BOT_USERNAME || 'unknown'}`);

// Обработка сигналов завершения
process.on('SIGTERM', () => {
  console.log('📴 Получен сигнал SIGTERM. Завершение работы бота...');
  bot.stopPolling();
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('📴 Получен сигнал SIGINT. Завершение работы бота...');
  bot.stopPolling();
  process.exit(0);
});

module.exports = bot;
