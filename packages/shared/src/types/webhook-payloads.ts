export interface RegistrationPayload {
  gc_deal_id: string;
  gc_user_id?: string;
  email?: string;
  phone?: string;
  name?: string;
  utm_source?: string;
  utm_medium?: string;
  utm_campaign?: string;
  utm_content?: string;
  utm_term?: string;
  custom_labels?: Record<string, string>;
  registered_at: string; // ISO 8601
}

export interface AttendancePayload {
  gc_deal_id: string;
  gc_user_id?: string;
  email?: string;
  attended_at: string; // ISO 8601
}

export interface OrderPayload {
  gc_deal_id: string;
  gc_user_id?: string;
  email?: string;
  amount?: number;
  product_name?: string;
  ordered_at: string; // ISO 8601
}

export interface PaymentPayload {
  gc_deal_id: string;
  gc_user_id?: string;
  email?: string;
  amount?: number;
  product_name?: string;
  status?: string;
  paid_at: string; // ISO 8601
}
