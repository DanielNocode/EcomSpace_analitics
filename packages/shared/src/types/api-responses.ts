import { AttributionType, UserRole } from './enums';

export interface HealthResponse {
  status: string;
  timestamp: string;
}

export interface RegistrationResponse {
  id: string;
  contact_id: string;
  webinar_id: string;
  funnel: string | null;
}

export interface AttendanceResponse {
  id: string;
  contact_id: string;
  webinar_id: string;
}

export interface OrderResponse {
  id: string;
  attribution_type: AttributionType;
  attributed_webinar_id: string | null;
}

export interface PaymentResponse {
  id: string;
  status: string;
}

export interface ErrorResponse {
  error: string;
}

// ── Auth types ──

export interface LoginRequest {
  email: string;
  password: string;
}

export interface LoginResponse {
  accessToken: string;
  refreshToken: string;
  user: UserProfile;
}

export interface RefreshRequest {
  refreshToken: string;
}

export interface RefreshResponse {
  accessToken: string;
  refreshToken: string;
}

export interface UserProfile {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  active: boolean;
  banned: boolean;
  banReason: string | null;
  createdAt: string;
}

export interface CreateUserRequest {
  email: string;
  name: string;
  password: string;
  role: UserRole;
}

export interface UpdateUserRequest {
  email?: string;
  name?: string;
  password?: string;
  role?: UserRole;
  active?: boolean;
}

// ── Dashboard types ──

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

export interface OverviewStats {
  totalRegistrations: number;
  totalAttendances: number;
  totalOrders: number;
  totalPayments: number;
  totalRevenue: number;
  reachRate: number;
  conversionRate: number;
}

export interface FunnelStep {
  stage: string;
  count: number;
  conversionFromPrev: number | null;
}

export interface SourceBreakdown {
  utmSource: string | null;
  utmMedium: string | null;
  utmCampaign: string | null;
  funnel: string | null;
  registrations: number;
  attendances: number;
  orders: number;
  payments: number;
  revenue: number;
}

export interface DeferredPayment {
  orderId: string;
  contactName: string | null;
  contactEmail: string | null;
  amount: number | null;
  productName: string | null;
  orderedAt: string;
  paidAt: string | null;
  lastWebinarDate: string | null;
  daysSinceWebinar: number | null;
  attributionType: string;
}

// ── Time-to-action ──

export interface TimeToAction {
  registrationToAttendance: number | null; // average hours
  attendanceToOrder: number | null;
  orderToPayment: number | null;
}

// ── Dead leads ──

export interface DeadLead {
  contactId: string;
  name: string | null;
  email: string | null;
  phone: string | null;
  registeredAt: string;
  webinarTitle: string | null;
  funnel: string | null;
  daysSinceRegistration: number;
}

// ── Bizon365 Report ──

export interface BizonReportSummary {
  id: string;
  webinarId: string | null;
  roomTitle: string | null;
  startedAt: string;
  durationMinutes: number;
  peakViewers: number;
  totalViewers: number;
  buttonClickRate: number;
  bannerClickRate: number;
  totalOrders: number;
  totalRevenue: number;
}

export interface BizonViewerSummary {
  id: string;
  name: string | null;
  email: string | null;
  joinedAt: string | null;
  leftAt: string | null;
  durationMin: number | null;
  watchPercent: number | null;
  device: string | null;
  city: string | null;
  clickedButton: boolean;
  clickedBanner: boolean;
  madeOrder: boolean;
  utmSource: string | null;
}

export interface RetentionPoint {
  minuteFromStart: number;
  viewerCount: number;
  percent: number;
}

export interface ChatAnalytics {
  totalMessages: number;
  uniqueSenders: number;
  messagesPerMinute: number;
  peakMinute: string | null;
  peakMessageCount: number;
}

// ── Anomaly ──

export interface AnomalyResponse {
  id: string;
  type: string;
  severity: string;
  message: string;
  metadata: Record<string, any> | null;
  webinarId: string | null;
  resolved: boolean;
  detectedAt: string;
}

// ── Filter types ──

export interface FilterCondition {
  field: string;
  operator: 'eq' | 'neq' | 'contains' | 'in' | 'gte' | 'lte' | 'between';
  value: string | string[] | number | [string, string];
}

export interface FilterGroup {
  logic: 'AND' | 'OR';
  conditions: (FilterCondition | FilterGroup)[];
}

export interface AnalyticsFilter {
  dateFrom?: string;
  dateTo?: string;
  webinarId?: string;
  funnel?: string;
  utmSource?: string;
  utmMedium?: string;
  utmCampaign?: string;
  utmContent?: string;
  utmTerm?: string;
  customLabels?: Record<string, string>;
  advanced?: FilterGroup;
}
