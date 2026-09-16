// @vitest-environment node
import { afterEach, describe, expect, it, vi } from 'vitest';

const mockCreate = vi.fn();
vi.mock('@anthropic-ai/sdk', () => {
  class MockAnthropic {
    messages = { create: mockCreate };
  }
  return { default: MockAnthropic };
});

import { performReview } from './review';

afterEach(() => {
  vi.clearAllMocks();
});

const BASE_CONFIG = {
  anthropicApiKey: 'test-key',
  maxTokens: 4096,
  diff: 'modified src/test.ts',
  changedFiles: ['src/test.ts'],
  incidentFingerprint: 'abc123',
  incidentCategory: 'server',
  fixDescription: 'Fix null check',
};

describe('Independent Review', () => {
  it('승인된 리뷰 결과를 반환한다', async () => {
    mockCreate.mockResolvedValue({
      content: [
        {
          type: 'text',
          text: JSON.stringify({
            isApproved: true,
            isIncidentPathCovered: true,
            isRegressionCovered: true,
            isValidationWeakened: false,
            findings: [],
          }),
        },
      ],
    });

    const result = await performReview(BASE_CONFIG);
    expect(result.isApproved).toBe(true);
    expect(result.isIncidentPathCovered).toBe(true);
    expect(result.isValidationWeakened).toBe(false);
  });

  it('거절된 리뷰 결과를 반환한다', async () => {
    mockCreate.mockResolvedValue({
      content: [
        {
          type: 'text',
          text: JSON.stringify({
            isApproved: false,
            isIncidentPathCovered: true,
            isRegressionCovered: false,
            isValidationWeakened: false,
            findings: ['Missing test coverage'],
          }),
        },
      ],
    });

    const result = await performReview(BASE_CONFIG);
    expect(result.isApproved).toBe(false);
    expect(result.isRegressionCovered).toBe(false);
    expect(result.findings).toContain('Missing test coverage');
  });

  it('파싱 불가능한 응답은 거절로 처리한다', async () => {
    mockCreate.mockResolvedValue({
      content: [{ type: 'text', text: 'This is not JSON' }],
    });

    const result = await performReview(BASE_CONFIG);
    expect(result.isApproved).toBe(false);
    expect(result.isValidationWeakened).toBe(true);
    expect(result.findings[0]).toMatch(/Failed to parse/);
  });

  it('isValidationWeakened가 누락되면 fail-closed로 true 반환', async () => {
    mockCreate.mockResolvedValue({
      content: [
        {
          type: 'text',
          text: JSON.stringify({
            isApproved: true,
            isIncidentPathCovered: true,
            isRegressionCovered: true,
            findings: [],
          }),
        },
      ],
    });

    const result = await performReview(BASE_CONFIG);
    expect(result.isValidationWeakened).toBe(true);
  });
});
