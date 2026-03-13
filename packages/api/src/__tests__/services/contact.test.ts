import { describe, it, expect, afterAll } from 'vitest';
import { PrismaClient } from '@prisma/client';
import { contactService } from '../../services/contact.service';

const prisma = new PrismaClient();

describe('contact.service', () => {
  afterAll(async () => {
    await prisma.$disconnect();
  });

  it('finds existing contact by gc_user_id', async () => {
    // Pre-create a contact
    const existing = await prisma.contact.create({
      data: { gcUserId: 'find-gc-user', email: 'existing@mail.ru', name: 'Existing' },
    });

    const result = await contactService.findOrCreate({
      gc_user_id: 'find-gc-user',
      email: 'different@mail.ru',
    });

    expect(result.id).toBe(existing.id);
  });

  it('finds existing contact by email (fallback)', async () => {
    await prisma.contact.create({
      data: { email: 'fallback@mail.ru', name: 'Fallback' },
    });

    const result = await contactService.findOrCreate({
      email: 'fallback@mail.ru',
      name: 'Updated Name',
    });

    expect(result.email).toBe('fallback@mail.ru');
  });

  it('creates a new contact when not found', async () => {
    const result = await contactService.findOrCreate({
      gc_user_id: 'brand-new-user',
      email: 'new@mail.ru',
      phone: '+79991112233',
      name: 'New User',
    });

    expect(result.gcUserId).toBe('brand-new-user');
    expect(result.email).toBe('new@mail.ru');
    expect(result.phone).toBe('+79991112233');
    expect(result.name).toBe('New User');
  });

  it('merges missing fields when finding by gc_user_id', async () => {
    await prisma.contact.create({
      data: { gcUserId: 'merge-user', email: null },
    });

    const result = await contactService.findOrCreate({
      gc_user_id: 'merge-user',
      email: 'merged@mail.ru',
      phone: '+79001112233',
    });

    expect(result.email).toBe('merged@mail.ru');
    expect(result.phone).toBe('+79001112233');
  });
});
