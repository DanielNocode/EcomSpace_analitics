import { z } from 'zod';

// ── Webhook schemas ──

export const registrationSchema = z.object({
  gc_deal_id: z.string().min(1),
  gc_user_id: z.string().optional(),
  email: z.string().email().optional(),
  phone: z.string().optional(),
  name: z.string().optional(),
  webinar_date: z.string().min(1),
  funnel: z.string().optional(),
  utm_source: z.string().optional(),
  utm_medium: z.string().optional(),
  utm_campaign: z.string().optional(),
  utm_content: z.string().optional(),
  utm_term: z.string().optional(),
  custom_labels: z.record(z.string()).optional(),
  registered_at: z.string().min(1),
});

export const attendanceSchema = z.object({
  gc_deal_id: z.string().min(1),
  gc_user_id: z.string().optional(),
  email: z.string().email().optional(),
  phone: z.string().optional(),
  attended_at: z.string().min(1),
  duration_minutes: z.number().int().min(0).optional(),
});

export const orderSchema = z.object({
  gc_deal_id: z.string().min(1),
  gc_user_id: z.string().optional(),
  email: z.string().email().optional(),
  phone: z.string().optional(),
  amount: z.number().optional(),
  product_name: z.string().optional(),
  ordered_at: z.string().min(1),
});

export const paymentSchema = z.object({
  gc_deal_id: z.string().min(1),
  gc_user_id: z.string().optional(),
  email: z.string().email().optional(),
  phone: z.string().optional(),
  amount: z.number().optional(),
  product_name: z.string().optional(),
  status: z.string().optional(),
  paid_at: z.string().min(1),
});

// ── Auth schemas ──

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export const refreshSchema = z.object({
  refreshToken: z.string().min(1),
});

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1),
  newPassword: z.string().min(6, 'New password must be at least 6 characters'),
});

export const createUserSchema = z.object({
  email: z.string().email(),
  name: z.string().min(1),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  role: z.enum(['ADMIN', 'VIEWER']),
});

export const updateUserSchema = z.object({
  email: z.string().email().optional(),
  name: z.string().min(1).optional(),
  password: z.string().min(6).optional(),
  role: z.enum(['ADMIN', 'VIEWER']).optional(),
  active: z.boolean().optional(),
});

export const banUserSchema = z.object({
  reason: z.string().min(1).optional(),
});

// ── Analytics filter schemas ──

const filterConditionSchema: z.ZodType<any> = z.object({
  field: z.string().min(1),
  operator: z.enum(['eq', 'neq', 'contains', 'in', 'gte', 'lte', 'between']),
  value: z.union([
    z.string(),
    z.array(z.string()),
    z.number(),
    z.tuple([z.string(), z.string()]),
  ]),
});

const filterGroupSchema: z.ZodType<any> = z.lazy(() =>
  z.object({
    logic: z.enum(['AND', 'OR']),
    conditions: z.array(z.union([filterConditionSchema, filterGroupSchema])),
  }),
);

export const analyticsFilterSchema = z.object({
  dateFrom: z.string().optional(),
  dateTo: z.string().optional(),
  webinarId: z.string().optional(),
  funnel: z.string().optional(),
  utmSource: z.string().optional(),
  utmMedium: z.string().optional(),
  utmCampaign: z.string().optional(),
  utmContent: z.string().optional(),
  utmTerm: z.string().optional(),
  customLabels: z.record(z.string()).optional(),
  advanced: filterGroupSchema.optional(),
});
