require('./config/env');
const config = require('./config/env');
const logger = require('./utils/logger');
const { healthCheck } = require('./config/database');
const app = require('./app');

async function bootstrap() {
  try {
    await healthCheck();
    app.listen(config.port, () => {
      logger.info(`Server listening on port ${config.port}`);
    });
  } catch (error) {
    logger.error('Failed to start server: %s', error.message);
    process.exit(1);
  }
}

bootstrap();
