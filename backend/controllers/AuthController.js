const UserModel = require('../models/User');

/**
 * Контроллер для авторизации
 */
class AuthController {
  
  /**
   * Проверка авторизации пользователя
   * POST /api/auth/check
   */
  static async checkAuth(req, res) {
    try {
      console.log('\n🔐 [AuthController] Проверка авторизации');
      const { telegramUser } = req;
      console.log('📱 Telegram User:', telegramUser);
      
      // Ищем пользователя в базе данных
      console.log('🔍 Поиск пользователя в БД по telegram_id:', telegramUser.id);
      const user = await UserModel.findByTelegramId(telegramUser.id);
      
      if (user) {
        console.log('✅ Пользователь найден в БД:', user);
        // Пользователь найден, возвращаем его данные
        res.json({
          success: true,
          isRegistered: true,
          user: {
            id: user.id,
            telegram_id: user.telegram_user_id, // обновленное поле
            first_name: user.first_name,
            last_name: user.last_name,
            position: user.position,
            branch: user.branch,
            role: user.role,
            level: user.level || 'Новичок',
            points: user.total_points || 0
          }
        });
      } else {
        console.log('⚠️  Пользователь не найден в БД, требуется регистрация');
        // Пользователь не найден, нужна регистрация
        res.json({
          success: true,
          isRegistered: false,
          telegramData: {
            id: telegramUser.id,
            first_name: telegramUser.first_name,
            last_name: telegramUser.last_name,
            username: telegramUser.username
          }
        });
      }
    } catch (error) {
      console.error('\n❌ [AuthController] Ошибка проверки авторизации:');
      console.error('Error:', error.message);
      console.error('Stack:', error.stack);
      res.status(500).json({
        success: false,
        error: 'Внутренняя ошибка сервера',
        timestamp: new Date().toISOString()
      });
    }
  }
  
  /**
   * Регистрация нового пользователя
   * POST /api/auth/register
   */
  static async register(req, res) {
    try {
      console.log('\n📝 [AuthController] Регистрация пользователя');
      const { telegramUser } = req;
      const { first_name, last_name, position, branch } = req.body;
      
      console.log('📱 Telegram User:', telegramUser);
      console.log('📦 Registration Data:', { first_name, last_name, position, branch });
      
      // Проверяем обязательные поля
      if (!first_name || !last_name || !position || !branch) {
        console.log('❌ Отсутствуют обязательные поля');
        return res.status(400).json({
          success: false,
          error: 'Все поля обязательны для заполнения'
        });
      }
      
      // Проверяем, что пользователь еще не зарегистрирован
      const existingUser = await UserModel.findByTelegramId(telegramUser.id);
      if (existingUser) {
        return res.status(400).json({
          success: false,
          error: 'Пользователь уже зарегистрирован'
        });
      }
      
      // Получаем списки допустимых значений
      const validPositions = await UserModel.getPositions();
      const validBranches = await UserModel.getBranches();
      
      // Проверяем валидность должности и филиала
      if (!validPositions.includes(position)) {
        return res.status(400).json({
          success: false,
          error: 'Недопустимая должность'
        });
      }
      
      if (!validBranches.includes(branch)) {
        return res.status(400).json({
          success: false,
          error: 'Недопустимый филиал'
        });
      }
      
      // Создаем нового пользователя
      const userData = {
        telegram_id: telegramUser.id,
        first_name,
        last_name,
        username: telegramUser.username,
        position,
        branch,
        role: 'employee' // По умолчанию роль сотрудника
      };
      
      const newUser = await UserModel.create(userData);
      
      res.json({
        success: true,
        message: 'Регистрация успешно завершена',
        user: {
          id: newUser.id,
          telegram_id: newUser.telegram_id,
          first_name: newUser.first_name,
          last_name: newUser.last_name,
          username: newUser.username,
          position: newUser.position,
          branch: newUser.branch,
          role: newUser.role,
          level: newUser.level || 1,
          points: newUser.points || 0
        }
      });
      
    } catch (error) {
      console.error('Ошибка регистрации:', error);
      res.status(500).json({
        success: false,
        error: 'Внутренняя ошибка сервера'
      });
    }
  }
  
  /**
   * Получение справочных данных
   * GET /api/auth/reference-data
   */
  static async getReferenceData(req, res) {
    try {
      const positions = await UserModel.getPositions();
      const branches = await UserModel.getBranches();
      
      res.json({
        success: true,
        data: {
          positions,
          branches
        }
      });
    } catch (error) {
      console.error('Ошибка получения справочных данных:', error);
      res.status(500).json({
        success: false,
        error: 'Внутренняя ошибка сервера'
      });
    }
  }
}

module.exports = AuthController;
