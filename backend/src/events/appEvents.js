const { EventEmitter } = require("events");

// Глобальный event bus приложения
const appEvents = new EventEmitter();
appEvents.setMaxListeners(20);

module.exports = appEvents;
