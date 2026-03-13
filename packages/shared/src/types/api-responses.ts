import { AttributionType } from './enums';

export interface HealthResponse {
  status: string;
  timestamp: string;
}

export interface RegistrationResponse {
  id: string;
  contact_id: string;
  webinar_id: string;
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

export interface WebinarSummary {
  id: string;
  scheduledAt: string;
  dayOfWeek: string;
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
  avgReachRate: number;
  avgConversionRate: number;
}
