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
} from '@/entities/compatibility/model/schemas';

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

    const stream = openai.responses.stream({
      model: process.env.OPENAI_ANALYSIS_MODEL ?? 'gpt-5.6-luna',
      instructions: COMPATIBILITY_INSTRUCTIONS,
      input: [
        {
          role: 'user',
          content: [
            {
              type: 'input_text',
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
        verbosity: 'high',
      },
      reasoning: {
        effort: 'low',
      },
      store: false,
    });

    let receivedChars = 0;
    let lastSentProgress = 0;
    let lastSentTime = 0;

    const readable = new ReadableStream({
      start(controller) {
        const encoder = new TextEncoder();

        controller.enqueue(encoder.encode(formatSSE('progress', { progress: 2 })));
        lastSentProgress = 2;
        lastSentTime = Date.now();

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

        stream.finalResponse()
          .then((response) => {
            if (!response.output_parsed) {
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
          })
          .catch((error) => {
            console.error('[api/analyze-compatibility] failed', error);

            let errorMessage = '궁합 분석 중 오류가 발생했습니다';
            if (isOpenAIQuotaError(error)) {
              errorMessage = 'AI 분석 사용량 한도를 초과했습니다';
            } else if (isOpenAIRateLimitError(error)) {
              errorMessage = '분석 요청이 몰리고 있어요. 잠시 후 다시 시도해주세요';
            }

            controller.enqueue(
              encoder.encode(formatSSE('error', { error: errorMessage })),
            );
            controller.close();
          });
      },
      cancel() {
        stream.abort();
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
