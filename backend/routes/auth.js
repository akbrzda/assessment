const express = require('express');
const router = express.Router();
const AuthController = require('../controllers/AuthController');
const { validateTelegramData } = require('../middleware/auth');

// Health check endpoint
router.get('/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    message: 'Backend server is running',
    timestamp: new Date().toISOString()
  });
});

// Проверка авторизации пользователя
router.post('/check', validateTelegramData, AuthController.checkAuth);

// Регистрация нового пользователя
router.post('/register', validateTelegramData, AuthController.register);

// Получение справочных данных (должности, филиалы) - без авторизации
router.get('/reference-data', AuthController.getReferenceData);

module.exports = router;
