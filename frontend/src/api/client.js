// Use environment variable in production, fallback to local proxy in development
const API_BASE = import.meta.env.VITE_API_BASE_URL || '/api';

export const getStoredToken = () => localStorage.getItem('bookleaf_token');
export const setStoredToken = (token) => localStorage.setItem('bookleaf_token', token);
export const removeStoredToken = () => localStorage.removeItem('bookleaf_token');

export const getStoredUser = () => {
  const user = localStorage.getItem('bookleaf_user');
  try {
    return user ? JSON.parse(user) : null;
  } catch (e) {
    return null;
  }
};
export const setStoredUser = (user) => localStorage.setItem('bookleaf_user', JSON.stringify(user));
export const removeStoredUser = () => localStorage.removeItem('bookleaf_user');

async function request(endpoint, options = {}) {
  const token = getStoredToken();
  const headers = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...options.headers,
  };

  const response = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers,
  });

  if (response.status === 401) {
    removeStoredToken();
    removeStoredUser();
  }

  if (!response.ok) {
    let errorMessage = 'An error occurred';
    try {
      const errData = await response.json();
      errorMessage = errData.detail || errorMessage;
    } catch (e) {
      errorMessage = response.statusText;
    }
    throw new Error(errorMessage);
  }

  return response.json();
}

export const api = {
  // Auth
  login: (email, password) =>
    request('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    }),
  getMe: () => request('/auth/me'),
  getDemoAccounts: () => request('/auth/demo-accounts'),

  // Books
  getBooks: () => request('/books'),
  getBook: (id) => request(`/books/${id}`),

  // Tickets
  getTickets: (params = {}) => {
    const searchParams = new URLSearchParams();
    if (params.status) searchParams.append('status', params.status);
    if (params.category) searchParams.append('category', params.category);
    if (params.priority) searchParams.append('priority', params.priority);
    if (params.sort_by) searchParams.append('sort_by', params.sort_by);
    const query = searchParams.toString();
    return request(`/tickets${query ? `?${query}` : ''}`);
  },
  getTicket: (id) => request(`/tickets/${id}`),
  createTicket: (data) =>
    request('/tickets', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  updateTicket: (id, data) =>
    request(`/tickets/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),
  postMessage: (ticketId, data) =>
    request(`/tickets/${ticketId}/messages`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  regenerateDraft: (ticketId) =>
    request(`/tickets/${ticketId}/regenerate-draft`, {
      method: 'POST',
    }),
};
