/**
 * BloodChain API Client
 * Primary HTTP interface communicating with Django REST Framework backend (Port 8000).
 */

const API_BASE_URL = 'http://localhost:8000/api';

function getAuthHeaders(): Record<string, string> {
  const storedUserStr = localStorage.getItem('bloodchain_user');
  let role = 'HOSPITAL_STAFF';
  let userId = 'USR_HOSP_A';
  let username = 'Dr. Rajesh Kumar';

  if (storedUserStr) {
    try {
      const user = JSON.parse(storedUserStr);
      role = user.role || role;
      userId = user.id || userId;
      username = user.name || user.username || username;
    } catch {
      // fallback
    }
  }

  return {
    'Content-Type': 'application/json',
    'X-User-Role': role,
    'X-User-Id': userId,
    'X-User-Name': username,
  };
}

async function handleResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    let errorData: any = {};
    try {
      errorData = await response.json();
    } catch {
      errorData = { message: response.statusText };
    }
    const message = errorData.message || errorData.error || `HTTP ${response.status} Error`;
    throw new Error(message);
  }
  return response.json();
}

export const apiClient = {
  // Auth API
  async login(credentials: { username?: string; email?: string; password?: string; role?: string }) {
    const res = await fetch(`${API_BASE_URL}/auth/login/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(credentials),
    });
    return handleResponse<{ status: string; user: any; token: string }>(res);
  },

  async getCurrentUser() {
    const res = await fetch(`${API_BASE_URL}/auth/me/`, {
      headers: getAuthHeaders(),
    });
    return handleResponse<any>(res);
  },

  // Transfers API
  async getTransfers() {
    const res = await fetch(`${API_BASE_URL}/transfers/`, {
      headers: getAuthHeaders(),
    });
    return handleResponse<any[]>(res);
  },

  async createTransfer(data: {
    source_facility: string;
    destination_facility: string;
    blood_group: string;
    component_type: string;
    requested_quantity: number;
    priority?: string;
  }) {
    const res = await fetch(`${API_BASE_URL}/transfers/`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(data),
    });
    return handleResponse<any>(res);
  },

  async approveTransfer(id: string) {
    const res = await fetch(`${API_BASE_URL}/transfers/${id}/approve/`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({}),
    });
    return handleResponse<any>(res);
  },

  async rejectTransfer(id: string, reason: string) {
    const res = await fetch(`${API_BASE_URL}/transfers/${id}/reject/`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ reason }),
    });
    return handleResponse<any>(res);
  },

  async dispatchTransfer(id: string) {
    const res = await fetch(`${API_BASE_URL}/transfers/${id}/dispatch/`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({}),
    });
    return handleResponse<any>(res);
  },

  async receiveTransfer(id: string) {
    const res = await fetch(`${API_BASE_URL}/transfers/${id}/receive/`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({}),
    });
    return handleResponse<any>(res);
  },

  // Facilities API
  async getFacilities() {
    const res = await fetch(`${API_BASE_URL}/facilities/`, {
      headers: getAuthHeaders(),
    });
    return handleResponse<any[]>(res);
  },

  // Inventory API
  async getInventory() {
    const res = await fetch(`${API_BASE_URL}/inventory/`, {
      headers: getAuthHeaders(),
    });
    return handleResponse<any[]>(res);
  },

  async recordUsage(data: {
    facility: string;
    blood_group: string;
    component_type: string;
    units_used: number;
    usage_date?: string;
    recorded_by?: string;
  }) {
    const res = await fetch(`${API_BASE_URL}/inventory/usage/`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(data),
    });
    return handleResponse<any>(res);
  },

  // Audit API
  async getAuditLogs() {
    const res = await fetch(`${API_BASE_URL}/audit/`, {
      headers: getAuthHeaders(),
    });
    return handleResponse<any[]>(res);
  },

  // Notifications API
  async getNotifications() {
    const res = await fetch(`${API_BASE_URL}/notifications/`, {
      headers: getAuthHeaders(),
    });
    return handleResponse<any[]>(res);
  },

  // Analytics & Matching API
  async getAnalyticsSummary() {
    const res = await fetch(`${API_BASE_URL}/analytics/summary/`, {
      headers: getAuthHeaders(),
    });
    return handleResponse<any>(res);
  },

  async getMatchingSources(params: {
    destination_facility: string;
    blood_group: string;
    component_type: string;
    quantity: number;
  }) {
    const res = await fetch(`${API_BASE_URL}/matching/calculate/`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(params),
    });
    return handleResponse<any>(res);
  },

  // Forecasting ML API
  async generateForecast(data: {
    facility_id: string;
    blood_group: string;
    component_type: string;
    horizon_days?: number;
  }) {
    const res = await fetch(`${API_BASE_URL}/forecast/`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(data),
    });
    return handleResponse<any>(res);
  },
};
