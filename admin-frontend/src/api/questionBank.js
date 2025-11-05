import axios from "../utils/axios";

/**
 * Получить список категорий
 */
export const getCategories = async () => {
  const response = await axios.get("/admin/question-bank/categories");
  return response.data;
};

/**
 * Создать категорию
 */
export const createCategory = async (data) => {
  const response = await axios.post("/admin/question-bank/categories", data);
  return response.data;
};

/**
 * Обновить категорию
 */
export const updateCategory = async (id, data) => {
  const response = await axios.put(`/admin/question-bank/categories/${id}`, data);
  return response.data;
};

/**
 * Удалить категорию
 */
export const deleteCategory = async (id) => {
  const response = await axios.delete(`/admin/question-bank/categories/${id}`);
  return response.data;
};

/**
 * Получить список вопросов
 */
export const getQuestions = async (filters = {}) => {
  const response = await axios.get("/admin/question-bank", { params: filters });
  return response.data;
};

/**
 * Получить вопрос по ID
 */
export const getQuestionById = async (id) => {
  const response = await axios.get(`/admin/question-bank/${id}`);
  return response.data;
};

/**
 * Создать вопрос
 */
export const createQuestion = async (data) => {
  const response = await axios.post("/admin/question-bank", data);
  return response.data;
};

/**
 * Обновить вопрос
 */
export const updateQuestion = async (id, data) => {
  const response = await axios.put(`/admin/question-bank/${id}`, data);
  return response.data;
};

/**
 * Удалить вопрос
 */
export const deleteQuestion = async (id) => {
  const response = await axios.delete(`/admin/question-bank/${id}`);
  return response.data;
};
