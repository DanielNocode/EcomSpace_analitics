import type { RegistrationPayload, AttendancePayload, OrderPayload, PaymentPayload } from '@webinar-pulse/shared';

// Tuesday 2026-03-10 at 18:30 MSK (15:30 UTC) — within Tuesday webinar reg window
export const registrationPayload: RegistrationPayload = {
  gc_deal_id: 'reg-deal-001',
  gc_user_id: 'user-001',
  email: 'test@mail.ru',
  phone: '+79001234567',
  name: 'Тест Тестов',
  utm_source: 'yandex',
  utm_medium: 'cpc',
  utm_campaign: 'webinar_march',
  registered_at: '2026-03-10T18:30:00+03:00',
};

// Tuesday 2026-03-10 at 20:05 MSK (17:05 UTC) — attendance on webinar day
export const attendancePayload: AttendancePayload = {
  gc_deal_id: 'att-deal-001',
  gc_user_id: 'user-001',
  email: 'test@mail.ru',
  attended_at: '2026-03-10T20:05:00+03:00',
};

// Tuesday 2026-03-10 at 21:15 MSK (18:15 UTC) — order right after webinar (DIRECT)
export const orderPayload: OrderPayload = {
  gc_deal_id: 'ord-deal-001',
  gc_user_id: 'user-001',
  email: 'test@mail.ru',
  amount: 29900,
  product_name: 'Курс ВЛМ',
  ordered_at: '2026-03-10T21:15:00+03:00',
};

// Payment scenario A — stage change (same gc_deal_id as order)
export const paymentScenarioA: PaymentPayload = {
  gc_deal_id: 'ord-deal-001',
  paid_at: '2026-03-10T21:45:00+03:00',
};

// Payment scenario B — new deal with amount
export const paymentScenarioB: PaymentPayload = {
  gc_deal_id: 'pay-deal-999',
  gc_user_id: 'user-001',
  email: 'test@mail.ru',
  amount: 29900,
  product_name: 'Курс ВЛМ',
  paid_at: '2026-03-10T21:45:00+03:00',
};

// Order from a user with NO attendance (UNATTRIBUTED)
export const orderNoAttendancePayload: OrderPayload = {
  gc_deal_id: 'ord-deal-unattr-001',
  gc_user_id: 'user-no-attend',
  email: 'noattend@mail.ru',
  amount: 15000,
  product_name: 'Мини-курс',
  ordered_at: '2026-03-10T21:15:00+03:00',
};

// Registration for Thursday window
export const registrationThursdayPayload: RegistrationPayload = {
  gc_deal_id: 'reg-deal-thu-001',
  gc_user_id: 'user-002',
  email: 'thu-user@mail.ru',
  registered_at: '2026-03-11T15:00:00+03:00', // Wed → falls in Thu window
};

// Attendance 4+ days ago (for DEFERRED test)
export const attendanceOldPayload: AttendancePayload = {
  gc_deal_id: 'att-deal-old-001',
  gc_user_id: 'user-deferred',
  email: 'deferred@mail.ru',
  attended_at: '2026-03-03T20:05:00+03:00', // Thu Mar 3 — a week before
};

export const orderDeferredPayload: OrderPayload = {
  gc_deal_id: 'ord-deal-deferred-001',
  gc_user_id: 'user-deferred',
  email: 'deferred@mail.ru',
  amount: 29900,
  product_name: 'Курс ВЛМ',
  ordered_at: '2026-03-10T21:15:00+03:00', // 7 days after attendance → DEFERRED
};
