import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { setConfigForTests } from '../config';
import { applySciApproval } from './admin';
import type { SciChangeApproval } from './types';

describe('applySciApproval', () => {
  beforeEach(() => {
    setConfigForTests({ apiBaseUrl: 'https://api.example.test', useMocks: false });
  });

  afterEach(() => vi.restoreAllMocks());

  it('sends the approval etag unchanged in If-Match', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(JSON.stringify({}), { status: 200 }));
    const approval = {
      changeApprovalId: 'approval_123',
      etag: '"1"',
    } as SciChangeApproval;

    await applySciApproval(approval);

    expect(fetchMock).toHaveBeenCalledWith(
      'https://api.example.test/v1/admin/sci/approvals/approval_123/apply',
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({
          'If-Match': '"1"',
          'Idempotency-Key': expect.any(String),
        }),
      }),
    );
  });
});
