import { z } from 'zod';

export const registrationSchema = z.object({
  gc_deal_id: z.string().min(1),
  gc_user_id: z.string().optional(),
  email: z.string().email().optional(),
  phone: z.string().optional(),
  name: z.string().optional(),
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
  attended_at: z.string().min(1),
});

export const orderSchema = z.object({
  gc_deal_id: z.string().min(1),
  gc_user_id: z.string().optional(),
  email: z.string().email().optional(),
  amount: z.number().optional(),
  product_name: z.string().optional(),
  ordered_at: z.string().min(1),
});

export const paymentSchema = z.object({
  gc_deal_id: z.string().min(1),
  gc_user_id: z.string().optional(),
  email: z.string().email().optional(),
  amount: z.number().optional(),
  product_name: z.string().optional(),
  status: z.string().optional(),
  paid_at: z.string().min(1),
});
