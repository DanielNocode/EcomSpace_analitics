const BASE_URL = '/api';

function getToken(): string | null {
  return localStorage.getItem('accessToken');
}

async function request<T>(
  method: string,
  path: string,
  body?: unknown,
  isFormData?: boolean,
): Promise<T> {
  const token = getToken();
  const headers: Record<string, string> = {};
  if (token) headers['Authorization'] = `Bearer ${token}`;
  if (body && !isFormData) headers['Content-Type'] = 'application/json';

  const res = await fetch(`${BASE_URL}${path}`, {
    method,
    headers,
    body: isFormData ? (body as FormData) : body ? JSON.stringify(body) : undefined,
  });

  if (res.status === 401) {
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    window.location.href = '/login';
    throw new Error('Unauthorized');
  }

  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Request failed');
  return data as T;
}

export const api = {
  get: <T>(path: string) => request<T>('GET', path),
  post: <T>(path: string, body?: unknown) => request<T>('POST', path, body),
  put: <T>(path: string, body?: unknown) => request<T>('PUT', path, body),
  delete: <T>(path: string) => request<T>('DELETE', path),
};

// Auth
export const authApi = {
  login: (email: string, password: string) =>
    api.post<{ accessToken: string; refreshToken: string; user: UserProfile }>('/auth/login', { email, password }),
  me: () => api.get<UserProfile>('/auth/me'),
  changePassword: (currentPassword: string, newPassword: string) =>
    api.put<{ message: string }>('/auth/change-password', { currentPassword, newPassword }),
};

// Admin
export const adminApi = {
  getUsers: () => api.get<UserProfile[]>('/admin/users'),
  createUser: (data: CreateUserRequest) => api.post<UserProfile>('/admin/users', data),
  updateUser: (id: string, data: Partial<CreateUserRequest>) => api.put<UserProfile>(`/admin/users/${id}`, data),
  banUser: (id: string, reason?: string) => api.post<UserProfile>(`/admin/users/${id}/ban`, { reason }),
  unbanUser: (id: string) => api.post<UserProfile>(`/admin/users/${id}/unban`),
  deactivateUser: (id: string) => api.delete<{ message: string }>(`/admin/users/${id}`),
};

// Analytics
export const analyticsApi = {
  getOverview: (params?: Record<string, string>) => {
    const qs = params ? '?' + new URLSearchParams(params).toString() : '';
    return api.get<OverviewStats>(`/modules/core/overview${qs}`);
  },
  getWebinars: (params?: Record<string, string>) => {
    const qs = params ? '?' + new URLSearchParams(params).toString() : '';
    return api.get<WebinarSummary[]>(`/modules/core/webinars${qs}`);
  },
  getWebinar: (id: string) => api.get<any>(`/modules/core/webinars/${id}`),
  getWebinarFunnel: (id: string) => api.get<FunnelStage[]>(`/modules/core/webinars/${id}/funnel`),
  getWebinarBySource: (id: string) => api.get<any[]>(`/modules/core/webinars/${id}/by-source`),
  getWebinarParticipants: (id: string) => api.get<any[]>(`/modules/core/webinars/${id}/participants`),
  getDeferred: () => api.get<any[]>(`/modules/core/deferred`),
  getDeadLeads: (params?: Record<string, string>) => {
    const qs = params ? '?' + new URLSearchParams(params).toString() : '';
    return api.get<any[]>(`/modules/core/dead-leads${qs}`);
  },
  getTimeToAction: () => api.get<TimeToActionStats>(`/modules/core/time-to-action`),
  getAnomalies: (resolved?: boolean) => {
    const qs = resolved !== undefined ? `?resolved=${resolved}` : '';
    return api.get<any[]>(`/modules/core/anomalies${qs}`);
  },
  resolveAnomaly: (id: string) => api.put<any>(`/modules/core/anomalies/${id}/resolve`),
  getBizonReports: () => api.get<any[]>('/webhooks/bizon-report'),
  getBizonReport: (id: string) => api.get<any>(`/webhooks/bizon-report/${id}`),
  deleteBizonReport: (id: string) => api.delete<any>(`/webhooks/bizon-report/${id}`),
  getBizonRetention: (id: string) => api.get<any>(`/webhooks/bizon-report/${id}/retention`),
  getBizonChat: (id: string) => api.get<any>(`/webhooks/bizon-report/${id}/chat`),
  getFilterOptions: () => api.get<any>('/modules/core/filter-options'),
};

// Types
export interface UserProfile {
  id: string;
  email: string;
  name: string;
  role: 'ADMIN' | 'VIEWER';
  active: boolean;
  banned: boolean;
  banReason?: string | null;
  bannedAt?: string | null;
  createdAt: string;
  updatedAt?: string;
}

export interface CreateUserRequest {
  email: string;
  name: string;
  password: string;
  role: 'ADMIN' | 'VIEWER';
}

export interface OverviewStats {
  totalRegistrations: number;
  totalAttendances: number;
  totalOrders: number;
  totalPayments: number;
  totalRevenue: number;
  reachRate: number;      // percent 0-100
  conversionRate: number; // percent 0-100
}

export interface WebinarSummary {
  id: string;
  scheduledAt: string;
  title: string | null;
  status: string;
  registrations: number;
  attendances: number;
  orders: number;
  payments: number;
  revenue: number;
  reachRate: number;
  conversionRate: number;
}

// Funnel returns an array of stages
export interface FunnelStage {
  stage: string;
  count: number;
  conversionFromPrev: number | null;
}

export interface TimeToActionStats {
  registrationToAttendance: { avgHours: number | null; sampleSize: number };
  attendanceToOrder: { avgHours: number | null; sampleSize: number };
  orderToPayment: { avgHours: number | null; sampleSize: number };
}

// Bizon report detail (same as analyticsApi.getBizonReport*)
export const bizonApi = {
  getReport: (id: string) => api.get<any>(`/webhooks/bizon-report/${id}`),
  getAll: () => api.get<any[]>('/webhooks/bizon-report'),
};

// Manual Data Entry
export const manualApi = {
  // Contacts
  getContacts: (page?: number, limit?: number, search?: string) => {
    const params = new URLSearchParams();
    if (page !== undefined) params.append('page', page.toString());
    if (limit !== undefined) params.append('limit', limit.toString());
    if (search) params.append('search', search);
    const qs = params.toString() ? `?${params.toString()}` : '';
    return api.get<{ data: any[]; total: number }>(`/manual/contacts${qs}`);
  },
  createContact: (data: { name: string; email: string; phone: string }) =>
    api.post<any>('/manual/contacts', data),

  // Registrations
  createRegistration: (data: {
    contactId: string;
    webinarId: string;
    funnel: string;
    utm_source?: string;
    utm_medium?: string;
  }) => api.post<any>('/manual/registrations', data),

  // Attendances
  createAttendance: (data: { contactId: string; webinarId: string; duration: number }) =>
    api.post<any>('/manual/attendances', data),

  // Orders
  createOrder: (data: {
    contactId: string;
    amount: number;
    productName: string;
    webinarId?: string;
  }) => api.post<any>('/manual/orders', data),

  // Webinars
  getWebinars: () => api.get<any[]>('/manual/webinars'),
  createWebinar: (data: { title: string; scheduledAt: string }) =>
    api.post<any>('/manual/webinars', data),

  // Bizon Upload
  uploadBizonReport: (file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    return request<any>('POST', '/manual/bizon-upload', formData, true);
  },
};
