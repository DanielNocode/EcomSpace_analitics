import { prisma } from '../lib/prisma';
import type { Contact } from '@prisma/client';

interface ContactPayload {
  gc_user_id?: string;
  email?: string;
  phone?: string;
  name?: string;
}

export const contactService = {
  /**
   * Find or create a contact. Matching order:
   * 1. By gc_user_id (if provided)
   * 2. By email (if provided)
   * 3. By phone (if provided)
   * 4. Create new if not found
   *
   * When found by one key, updates remaining fields (merge).
   */
  async findOrCreate(payload: ContactPayload): Promise<Contact> {
    const { gc_user_id, email, phone, name } = payload;

    // 1. Search by gc_user_id
    if (gc_user_id) {
      const existing = await prisma.contact.findUnique({
        where: { gcUserId: gc_user_id },
      });
      if (existing) {
        return this.mergeContact(existing, payload);
      }
    }

    // 2. Search by email
    if (email) {
      const existing = await prisma.contact.findFirst({
        where: { email },
      });
      if (existing) {
        return this.mergeContact(existing, payload);
      }
    }

    // 3. Search by phone
    if (phone) {
      const existing = await prisma.contact.findFirst({
        where: { phone },
      });
      if (existing) {
        return this.mergeContact(existing, payload);
      }
    }

    // 4. Create new contact
    return prisma.contact.create({
      data: {
        gcUserId: gc_user_id ?? null,
        email: email ?? null,
        phone: phone ?? null,
        name: name ?? null,
      },
    });
  },

  /** Merge new data into existing contact */
  async mergeContact(existing: Contact, payload: ContactPayload): Promise<Contact> {
    const updates: Record<string, string> = {};

    if (payload.gc_user_id && !existing.gcUserId) {
      updates.gcUserId = payload.gc_user_id;
    }
    if (payload.email && !existing.email) {
      updates.email = payload.email;
    }
    if (payload.phone && !existing.phone) {
      updates.phone = payload.phone;
    }
    if (payload.name && !existing.name) {
      updates.name = payload.name;
    }

    if (Object.keys(updates).length === 0) {
      return existing;
    }

    return prisma.contact.update({
      where: { id: existing.id },
      data: updates,
    });
  },
};
