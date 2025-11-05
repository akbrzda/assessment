import axios from "../utils/axios";

/**
 * Получить все настройки (с опциональным фильтром по категории)
 */
export const getSettings = async (category = null) => {
  const params = category ? { category } : {};
  const response = await axios.get("/admin/settings", { params });
  return response.data;
};

/**
 * Обновить настройку по ID
 */
export const updateSetting = async (id, value) => {
  const response = await axios.put(`/admin/settings/${id}`, { value });
  return response.data;
};

/**
 * Тест подключения к Telegram
 */
export const testTelegramConnection = async () => {
  const response = await axios.post("/admin/settings/telegram/test");
  return response.data;
};
