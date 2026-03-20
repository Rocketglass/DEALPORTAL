/**
 * Tests for API response helpers.
 */

import { describe, it, expect } from 'vitest';
import { success, created, error, badRequest, notFound, conflict, unauthorized } from '../response';

describe('API Response Helpers', () => {
  it('success returns 200 with data', async () => {
    const res = success({ id: '1', name: 'Test' });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toEqual({ id: '1', name: 'Test' });
  });

  it('success supports custom status code', async () => {
    const res = success({ ok: true }, 202);
    expect(res.status).toBe(202);
  });

  it('created returns 201 with data', async () => {
    const res = created({ id: 'new-1' });
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.id).toBe('new-1');
  });

  it('error returns 500 by default', async () => {
    const res = error('Something went wrong');
    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body.error).toBe('Something went wrong');
  });

  it('badRequest returns 400', async () => {
    const res = badRequest('Missing field');
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBe('Missing field');
  });

  it('notFound returns 404', async () => {
    const res = notFound();
    expect(res.status).toBe(404);
    const body = await res.json();
    expect(body.error).toBe('Not found');
  });

  it('notFound accepts custom message', async () => {
    const res = notFound('Lease not found');
    expect(res.status).toBe(404);
    const body = await res.json();
    expect(body.error).toBe('Lease not found');
  });

  it('conflict returns 409', async () => {
    const res = conflict('Section was modified');
    expect(res.status).toBe(409);
    const body = await res.json();
    expect(body.error).toBe('Section was modified');
  });

  it('unauthorized returns 401', async () => {
    const res = unauthorized();
    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.error).toBe('Unauthorized');
  });
});
