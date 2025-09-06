const { pool } = require('../config/database');

/**
 * Модель для работы с пользователями
 */
class UserModel {
  
  /**
   * Поиск пользователя по Telegram ID
   * @param {number} telegramId - ID пользователя в Telegram
   * @returns {object|null} - данные пользователя или null
   */
  static async findByTelegramId(telegramId) {
    try {
      console.log('🔍 [UserModel] Поиск пользователя по telegram_user_id:', telegramId);
      const [rows] = await pool.execute(
        'SELECT * FROM users WHERE telegram_user_id = ?',
        [telegramId]
      );
      console.log('📊 [UserModel] Результат поиска:', rows.length > 0 ? 'Найден' : 'Не найден');
      return rows.length > 0 ? rows[0] : null;
    } catch (error) {
      console.error('❌ [UserModel] Ошибка поиска пользователя по Telegram ID:', error);
      throw error;
    }
  }
  
    /**
   * Создание нового пользователя
   * @param {object} userData - данные пользователя
   * @returns {object} - созданный пользователь
   */
  static async create(userData) {
    try {
      console.log('📝 [UserModel] Создание пользователя:', userData);
      const {
        telegram_id,
        first_name,
        last_name,
        username,
        position,
        branch,
        role = 'employee'
      } = userData;
      
      const [result] = await pool.execute(
        `INSERT INTO users 
         (telegram_user_id, first_name, last_name, position, branch, role, created_at) 
         VALUES (?, ?, ?, ?, ?, ?, NOW())`,
        [telegram_id, first_name, last_name, position, branch, role]
      );
      
      console.log('✅ [UserModel] Пользователь создан с ID:', result.insertId);
      
      // Получаем созданного пользователя
      const [rows] = await pool.execute(
        'SELECT * FROM users WHERE id = ?',
        [result.insertId]
      );
      
      return rows[0];
    } catch (error) {
      console.error('❌ [UserModel] Ошибка создания пользователя:', error);
      throw error;
    }
  }
  
  /**
   * Обновление данных пользователя
   * @param {number} id - ID пользователя
   * @param {object} updateData - данные для обновления
   * @returns {object} - обновленный пользователь
   */
  static async update(id, updateData) {
    try {
      const fields = [];
      const values = [];
      
      // Динамически строим запрос для обновления только переданных полей
      for (const [key, value] of Object.entries(updateData)) {
        if (value !== undefined) {
          fields.push(`${key} = ?`);
          values.push(value);
        }
      }
      
      if (fields.length === 0) {
        throw new Error('Нет данных для обновления');
      }
      
      values.push(id);
      
      await pool.execute(
        `UPDATE users SET ${fields.join(', ')}, updated_at = NOW() WHERE id = ?`,
        values
      );
      
      // Получаем обновленного пользователя
      const [rows] = await pool.execute(
        'SELECT * FROM users WHERE id = ?',
        [id]
      );
      
      return rows[0];
    } catch (error) {
      console.error('Ошибка обновления пользователя:', error);
      throw error;
    }
  }
  
  /**
   * Получение списка всех должностей
   * @returns {array} - список должностей
   */
  static async getPositions() {
    return [
      'Официант',
      'Повар',
      'Старший повар',
      'Шеф повар',
      'Администратор',
      'Бармен',
      'Логист',
      'Курьер'
    ];
  }
  
  /**
   * Получение списка всех филиалов
   * @returns {array} - список филиалов
   */
  static async getBranches() {
    return [
      'Сургут-1 (30 лет Победы)',
      'Сургут-2 (Усольцева)',
      'Сургут-3 (Магистральная)',
      'Парковая (Нефтеюганск)'
    ];
  }
}

module.exports = UserModel;
