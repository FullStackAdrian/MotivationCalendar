/**
 * Cliente API para comunicación con el backend.
 * La URL de producción se configura mediante window.APP_CONFIG.apiBaseUrl.
 */
const getBaseURL = () => {
  const configuredURL = window.APP_CONFIG?.apiBaseUrl;
  if (configuredURL) return configuredURL.replace(/\/$/, '');
  return '';
};

class APIError extends Error {
  constructor(message, status) {
    super(message);
    this.name = 'APIError';
    this.status = status;
  }
}

class APIClient {
  constructor(baseURL = getBaseURL()) {
    this.baseURL = baseURL;
    this.token = localStorage.getItem('authToken');
  }

  setToken(token) {
    this.token = token;
    if (token) localStorage.setItem('authToken', token);
    else localStorage.removeItem('authToken');
  }

  getAuthHeaders() {
    const headers = { 'Content-Type': 'application/json' };
    if (this.token) headers.Authorization = `Bearer ${this.token}`;
    return headers;
  }

  async request(endpoint, options = {}) {
    const url = `${this.baseURL}${endpoint}`;
    const requestConfig = {
      ...options,
      headers: { ...this.getAuthHeaders(), ...options.headers }
    };

    const response = await fetch(url, requestConfig);
    const contentType = response.headers.get('content-type') || '';
    const data = contentType.includes('application/json')
      ? await response.json()
      : null;

    if (!response.ok) {
      throw new APIError(data?.error || `Error HTTP ${response.status}`, response.status);
    }

    return data;
  }

  async register(username, email, password) {
    const data = await this.request('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify({ username, email, password })
    });
    if (data?.token) this.setToken(data.token);
    return data;
  }

  async login(identifier, password) {
    const data = await this.request('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ identifier, password })
    });
    if (data?.token) this.setToken(data.token);
    return data;
  }

  logout() {
    this.setToken(null);
  }

  isAuthenticated() {
    return !!this.token;
  }

  getCurrentUser() {
    if (!this.token) return null;

    try {
      const base64Url = this.token.split('.')[1];
      if (!base64Url) return null;
      const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
      const jsonPayload = decodeURIComponent(atob(base64).split('').map((c) =>
        `%${(`00${c.charCodeAt(0).toString(16)}`).slice(-2)}`
      ).join(''));
      const payload = JSON.parse(jsonPayload);

      return {
        id: payload.id || payload.userId,
        username: payload.username,
        email: payload.email
      };
    } catch (error) {
      console.error('Error al decodificar token:', error);
      return null;
    }
  }

  async getProgress() {
    return this.request('/api/progress');
  }

  async updateDay(dayKey, status) {
    return this.request(`/api/progress/${dayKey}`, {
      method: 'PUT',
      body: JSON.stringify({ status })
    });
  }

  async bulkUpdate(updates) {
    return this.request('/api/progress/bulk', {
      method: 'POST',
      body: JSON.stringify({ updates })
    });
  }

  async healthCheck() {
    return this.request('/api/health');
  }
}

window.APIError = APIError;
window.apiClient = new APIClient();
