const { Telegraf } = require('telegraf');
const dotenv = require('dotenv');

dotenv.config();

const { BOT_TOKEN, MINI_APP_URL, ADMIN_CHAT_ID } = process.env;

if (!BOT_TOKEN) {
  console.error('[bot] BOT_TOKEN is not set. Check bot/.env');
  process.exit(1);
}

const bot = new Telegraf(BOT_TOKEN);

const miniAppUrl = (MINI_APP_URL || '').trim();

function buildWelcomeMessage(firstName) {
  const name = firstName ? `, ${firstName}` : '';
  return [
    `Привет${name}!`,
    'Это официальный бот системы аттестаций сотрудников.',
    'Чтобы продолжить, открой MiniApp по кнопке ниже.'
  ].join('\n');
}

bot.start(async (ctx) => {
  const userName = ctx.from?.first_name || '';
  const replyMarkup = miniAppUrl
    ? {
        inline_keyboard: [
          [
            {
              text: 'Открыть MiniApp',
              web_app: { url: miniAppUrl }
            }
          ]
        ]
      }
    : undefined;

  await ctx.reply(buildWelcomeMessage(userName), {
    reply_markup: replyMarkup,
    parse_mode: 'HTML'
  });
});

bot.catch((err, ctx) => {
  console.error('[bot] Error for update %j: %s', ctx.update, err);
});

async function launchBot() {
  try {
    await bot.launch();
    console.log('[bot] started');

    if (miniAppUrl && ADMIN_CHAT_ID) {
      await bot.telegram.sendMessage(
        ADMIN_CHAT_ID,
        'Бот запущен и готов отправлять ссылку на MiniApp.'
      );
    }
  } catch (error) {
    console.error('[bot] Launch failed:', error.message);
    process.exit(1);
  }
}

launchBot();

process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));
