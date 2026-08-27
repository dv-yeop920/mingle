import { NextResponse } from 'next/server';
import OpenAI from 'openai';
import { zodTextFormat } from 'openai/helpers/zod';

import {
  ANALYSIS_INSTRUCTIONS,
  buildAnalysisInput,
} from '@/entities/analysis/api/prompt';
import {
  analysisResultSchema,
  analyzeRequestSchema,
  type AnalysisResult,
} from '@/entities/analysis/model/schemas';

import { estimateResponseSize } from './estimate-response-size';

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

const validateAnalysisCompleteness = (
  expectedPairIds: Set<string>,
  expectedMemberIds: Set<string>,
  result: AnalysisResult,
): CompletenessResult => {
  const roleMemberIds = new Set(
    result.memberRoles.map((role) => role.memberId),
  );

  if (roleMemberIds.size !== expectedMemberIds.size) {
    return { error: '멤버 역할 분석이 누락되었습니다' };
  }

  for (const memberId of expectedMemberIds) {
    if (!roleMemberIds.has(memberId)) {
      return { error: '멤버 역할 분석이 누락되었습니다' };
    }
  }

  const actualPairIds = new Set(
    result.pairChemistry.map((pair) => pair.pairId),
  );

  if (actualPairIds.size !== expectedPairIds.size) {
    return { error: '1:1 케미 분석이 누락되었습니다' };
  }

  for (const pairId of expectedPairIds) {
    if (!actualPairIds.has(pairId)) {
      return { error: '1:1 케미 분석이 누락되었습니다' };
    }
  }

  return { data: true };
};

const formatSSE = (event: string, data: unknown) =>
  `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;

const MIN_PROGRESS_DELTA = 3;
const MIN_PROGRESS_INTERVAL_MS = 500;

export const POST = async (request: Request) => {
  try {
    const body = await request.json();
    const parsed = analyzeRequestSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: '입력값이 올바르지 않습니다' },
        { status: 400 },
      );
    }

    const analysisInput = buildAnalysisInput(parsed.data);
    const openai = new OpenAI();

    const memberCount = analysisInput.members.length;
    const pairCount = analysisInput.expectedPairs.length;
    const estimatedSize = estimateResponseSize(memberCount, pairCount);

    const stream = openai.responses.stream({
      model: process.env.OPENAI_ANALYSIS_MODEL ?? 'gpt-5.6-luna',
      instructions: ANALYSIS_INSTRUCTIONS,
      input: [
        {
          role: 'user',
          content: [
            {
              type: 'input_text',
              text: JSON.stringify(analysisInput),
            },
          ],
        },
      ],
      text: {
        format: zodTextFormat(
          analysisResultSchema,
          'mingle_analysis_result',
          {
            description:
              'MIXTI MBTI group chemistry analysis result for mobile UI cards.',
          },
        ),
        verbosity: 'high',
      },
      reasoning: {
        effort: 'low',
      },
      prompt_cache_key: 'mingle-analysis-v2',
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
            Math.round((receivedChars / estimatedSize) * 90),
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
                    error: '분석 결과를 완성하지 못했어요. 다시 시도해주세요',
                  }),
                ),
              );
              controller.close();
              return;
            }

            const expectedPairIds = new Set(
              analysisInput.expectedPairs.map((pair) => pair.pairId),
            );
            const expectedMemberIds = new Set(
              analysisInput.members.map((member) => member.memberId),
            );
            const completeness = validateAnalysisCompleteness(
              expectedPairIds,
              expectedMemberIds,
              response.output_parsed,
            );

            if ('error' in completeness) {
              controller.enqueue(
                encoder.encode(
                  formatSSE('error', {
                    error: '분석 결과를 완성하지 못했어요. 다시 시도해주세요',
                  }),
                ),
              );
              controller.close();
              return;
            }

            controller.enqueue(
              encoder.encode(formatSSE('progress', { progress: 95 })),
            );

            const resultData = {
              ...response.output_parsed,
              groupType: analysisInput.group.type,
              customName: parsed.data.group.customName,
              members: analysisInput.members.map((member) => ({
                nickname: member.nickname,
                mbti: member.mbti,
                gender: member.gender,
                is_self: member.isSelf,
              })),
            };

            controller.enqueue(
              encoder.encode(formatSSE('result', { data: resultData })),
            );
            controller.close();
          })
          .catch((error) => {
            console.error('[api/analyze] failed', error);

            let errorMessage = '분석 중 오류가 발생했습니다';
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
    console.error('[api/analyze] request parse failed', error);

    return NextResponse.json(
      { error: '분석 중 오류가 발생했습니다' },
      { status: 500 },
    );
  }
};
