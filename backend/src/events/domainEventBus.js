const { EventEmitter } = require("events");

class DomainEventBus extends EventEmitter {
  publish(eventName, payload) {
    if (!eventName) {
      throw new Error("DomainEventBus.publish requires eventName");
    }
    this.emit(eventName, payload);
  }

  subscribe(eventName, handler) {
    this.on(eventName, handler);
    return () => this.off(eventName, handler);
  }
}

module.exports = new DomainEventBus();
