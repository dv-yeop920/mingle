import { NextResponse } from 'next/server';
import OpenAI from 'openai';
import { zodTextFormat } from 'openai/helpers/zod';

import {
  buildCompatibilityInput,
  COMPATIBILITY_INSTRUCTIONS,
} from '@/entities/compatibility/api/prompt';
import {
  analyzeCompatibilityRequestSchema,
  compatibilityResultSchema,
  type CompatibilityResult,
} from '@/entities/compatibility/model/schemas';

const MAX_ATTEMPTS = 3;

type CompletenessResult =
  | { data: true }
  | { error: string };

const isOpenAIQuotaError = (error: unknown) =>
  typeof error === 'object'
  && error !== null
  && 'code' in error
  && error.code === 'insufficient_quota';

const isOpenAIRateLimitError = (error: unknown) =>
  typeof error === 'object'
  && error !== null
  && 'status' in error
  && error.status === 429;

const validateCompatibilityCompleteness = (
  result: CompatibilityResult,
): CompletenessResult => {
  const scoredCategories = [
    result.conversationStyle,
    result.conflictStyle,
    result.emotionalConnection,
    result.growthPotential,
  ];

  for (const category of scoredCategories) {
    if (!category.title || !category.description) {
      return { error: '궁합 분석 항목이 누락되었습니다' };
    }
  }

  if (!result.bestMoment.title || !result.bestMoment.description) {
    return { error: '궁합 분석 항목이 누락되었습니다' };
  }

  if (!result.cautionPoint.title || !result.cautionPoint.description) {
    return { error: '궁합 분석 항목이 누락되었습니다' };
  }

  if (result.recommendedActivities.length < 2) {
    return { error: '추천 활동이 부족합니다' };
  }

  return { data: true };
};

const formatSSE = (event: string, data: unknown) =>
  `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;

const ESTIMATED_RESPONSE_SIZE = 3500;
const MIN_PROGRESS_DELTA = 3;
const MIN_PROGRESS_INTERVAL_MS = 500;

export const POST = async (request: Request) => {
  try {
    const body = await request.json();
    const parsed = analyzeCompatibilityRequestSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: '입력값이 올바르지 않습니다' },
        { status: 400 },
      );
    }

    const input = buildCompatibilityInput(parsed.data);
    const openai = new OpenAI();

    const streamConfig = {
      model: process.env.OPENAI_ANALYSIS_MODEL ?? 'gpt-5.6-luna',
      instructions: COMPATIBILITY_INSTRUCTIONS,
      input: [
        {
          role: 'user' as const,
          content: [
            {
              type: 'input_text' as const,
              text: JSON.stringify(input),
            },
          ],
        },
      ],
      text: {
        format: zodTextFormat(
          compatibilityResultSchema,
          'compatibility_result',
          {
            description:
              'MIXTI 1:1 MBTI compatibility analysis result for mobile UI cards.',
          },
        ),
        verbosity: 'high' as const,
      },
      reasoning: {
        effort: 'low' as const,
      },
      store: false,
    };

    let currentStream: ReturnType<typeof openai.responses.stream> | null = null;

    const readable = new ReadableStream({
      async start(controller) {
        const encoder = new TextEncoder();
        let lastSentProgress = 0;
        let lastSentTime = 0;

        controller.enqueue(encoder.encode(formatSSE('progress', { progress: 2 })));
        lastSentProgress = 2;
        lastSentTime = Date.now();

        for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
          let receivedChars = 0;

          const stream = openai.responses.stream(streamConfig);
          currentStream = stream;

          stream.on('response.output_text.delta', (event) => {
            receivedChars += event.delta.length;
            const rawProgress = Math.min(
              Math.round((receivedChars / ESTIMATED_RESPONSE_SIZE) * 90),
              90,
            );

            const now = Date.now();
            const shouldSend
              = rawProgress - lastSentProgress >= MIN_PROGRESS_DELTA
              || now - lastSentTime >= MIN_PROGRESS_INTERVAL_MS;

            if (shouldSend && rawProgress > lastSentProgress) {
              controller.enqueue(
                encoder.encode(formatSSE('progress', { progress: rawProgress })),
              );
              lastSentProgress = rawProgress;
              lastSentTime = now;
            }
          });

          try {
            const response = await stream.finalResponse();

            if (!response.output_parsed) {
              console.warn(`[api/analyze-compatibility] attempt ${attempt}/${MAX_ATTEMPTS} failed: output_parsed is null`);
              if (attempt < MAX_ATTEMPTS) continue;
              controller.enqueue(
                encoder.encode(
                  formatSSE('error', {
                    error: '궁합 분석 결과를 완성하지 못했어요. 다시 시도해주세요',
                  }),
                ),
              );
              controller.close();
              return;
            }

            const completeness = validateCompatibilityCompleteness(
              response.output_parsed,
            );

            if ('error' in completeness) {
              console.warn(`[api/analyze-compatibility] attempt ${attempt}/${MAX_ATTEMPTS} failed: ${completeness.error}`);
              if (attempt < MAX_ATTEMPTS) continue;
              controller.enqueue(
                encoder.encode(
                  formatSSE('error', {
                    error: '궁합 분석 결과를 완성하지 못했어요. 다시 시도해주세요',
                  }),
                ),
              );
              controller.close();
              return;
            }

            controller.enqueue(
              encoder.encode(formatSSE('progress', { progress: 95 })),
            );

            controller.enqueue(
              encoder.encode(formatSSE('result', { data: response.output_parsed })),
            );
            controller.close();
            return;
          } catch (error) {
            if (isOpenAIQuotaError(error)) {
              controller.enqueue(
                encoder.encode(
                  formatSSE('error', { error: 'AI 분석 사용량 한도를 초과했습니다' }),
                ),
              );
              controller.close();
              return;
            }

            if (isOpenAIRateLimitError(error)) {
              controller.enqueue(
                encoder.encode(
                  formatSSE('error', { error: '분석 요청이 몰리고 있어요. 잠시 후 다시 시도해주세요' }),
                ),
              );
              controller.close();
              return;
            }

            console.warn(`[api/analyze-compatibility] attempt ${attempt}/${MAX_ATTEMPTS} failed:`, error);
            if (attempt < MAX_ATTEMPTS) continue;

            controller.enqueue(
              encoder.encode(
                formatSSE('error', { error: '궁합 분석 중 오류가 발생했습니다' }),
              ),
            );
            controller.close();
            return;
          }
        }
      },
      cancel() {
        currentStream?.abort();
      },
    });

    return new Response(readable, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    });
  } catch (error) {
    console.error('[api/analyze-compatibility] request parse failed', error);

    return NextResponse.json(
      { error: '궁합 분석 중 오류가 발생했습니다' },
      { status: 500 },
    );
  }
};
