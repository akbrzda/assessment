import { getWebApp } from './telegram';

const FALLBACK_PREFIX = 'assessment_app_';

function getFallbackStorage() {
  if (typeof window === 'undefined') {
    return null;
  }
  try {
    return window.localStorage;
  } catch (error) {
    console.warn('LocalStorage is not accessible', error);
    return null;
  }
}

function withCloudStorage(method, key, value) {
  const webApp = getWebApp();
  const storage = webApp?.cloudStorage;
  if (!storage || typeof storage[method] !== 'function') {
    return Promise.reject(new Error('CloudStorage API not available'));
  }
  return new Promise((resolve, reject) => {
    if (value === undefined) {
      storage[method](key, (err, result) => {
        if (err) {
          reject(err);
        } else {
          resolve(result);
        }
      });
    } else {
      storage[method](key, value, (err) => {
        if (err) {
          reject(err);
        } else {
          resolve();
        }
      });
    }
  });
}

export async function setItem(key, value) {
  const serialized = JSON.stringify(value);
  try {
    await withCloudStorage('setItem', key, serialized);
    return;
  } catch (error) {
    console.warn('CloudStorage setItem failed, fallback to localStorage', error);
  }
  const storage = getFallbackStorage();
  storage?.setItem(`${FALLBACK_PREFIX}${key}`, serialized);
}

export async function getItem(key) {
  try {
    const raw = await withCloudStorage('getItem', key);
    return raw ? JSON.parse(raw) : null;
  } catch (error) {
    // fallback ниже
  }
  const storage = getFallbackStorage();
  const raw = storage?.getItem(`${FALLBACK_PREFIX}${key}`);
  return raw ? JSON.parse(raw) : null;
}

export async function removeItem(key) {
  try {
    await withCloudStorage('removeItem', key);
    return;
  } catch (error) {
    // fallback ниже
  }
  const storage = getFallbackStorage();
  storage?.removeItem(`${FALLBACK_PREFIX}${key}`);
}
