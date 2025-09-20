import { getInitData } from './telegram';

const envBaseUrl = import.meta.env.VITE_API_BASE_URL?.trim();
const runtimeBaseUrl =
  typeof window !== 'undefined' && window.location ? window.location.origin : '';
const BASE_URL = (envBaseUrl || runtimeBaseUrl || '').replace(/\/$/, '');

async function request(path, options = {}) {
  const headers = new Headers(options.headers || {});
  headers.set('Content-Type', 'application/json');
  const initData = getInitData();
  if (initData) {
    headers.set('x-telegram-init-data', initData);
  }

  const targetUrl = BASE_URL ? `${BASE_URL}${path}` : path;
  const response = await fetch(targetUrl, {
    ...options,
    headers,
    credentials: 'include'
  });

  if (!response.ok) {
    const errorBody = await response.json().catch(() => ({}));
    const message = errorBody.error || 'Произошла ошибка';
    const error = new Error(message);
    error.status = response.status;
    throw error;
  }

  if (response.status === 204) {
    return null;
  }

  return response.json();
}

export const apiClient = {
  getStatus() {
    return request('/auth/status', { method: 'POST' });
  },
  register(payload) {
    return request('/auth/register', {
      method: 'POST',
      body: JSON.stringify(payload)
    });
  },
  getProfile() {
    return request('/auth/profile');
  },
  updateProfile(payload) {
    return request('/auth/profile', {
      method: 'PATCH',
      body: JSON.stringify(payload)
    });
  },
  getReferences() {
    return request('/auth/references');
  },
  createInvitation(payload) {
    return request('/invitations', {
      method: 'POST',
      body: JSON.stringify(payload)
    });
  },
  listInvitations() {
    return request('/invitations');
  },
  extendInvitation(id, payload) {
    return request(`/invitations/${id}/extend`, {
      method: 'POST',
      body: JSON.stringify(payload)
    });
  },
  deleteInvitation(id) {
    return request(`/invitations/${id}`, {
      method: 'DELETE'
    });
  },
  listUsers() {
    return request('/admin/users');
  },
  updateUser(id, payload) {
    return request(`/admin/users/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(payload)
    });
  },
  deleteUser(id) {
    return request(`/admin/users/${id}`, {
      method: 'DELETE'
    });
  }
};
