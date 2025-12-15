/* global __API_BASE_URL__, __INVITE_EXPIRATION_DAYS__, __BOT_USERNAME__ */

export const API_BASE_URL = typeof __API_BASE_URL__ !== "undefined" ? __API_BASE_URL__ : "";
export const INVITE_EXPIRATION_DAYS = Number(
  typeof __INVITE_EXPIRATION_DAYS__ !== "undefined" ? __INVITE_EXPIRATION_DAYS__ : 7
);
export const BOT_USERNAME = typeof __BOT_USERNAME__ !== "undefined" ? __BOT_USERNAME__ : "";
