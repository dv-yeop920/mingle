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

    const response = await openai.responses.parse({
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

    if (!response.output_parsed) {
      return NextResponse.json(
        { error: '분석 결과를 완성하지 못했어요. 다시 시도해주세요' },
        { status: 502 },
      );
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
      return NextResponse.json(
        { error: '분석 결과를 완성하지 못했어요. 다시 시도해주세요' },
        { status: 502 },
      );
    }

    return NextResponse.json({
      data: {
        ...response.output_parsed,
        groupType: analysisInput.group.type,
        customName: parsed.data.group.customName,
        members: analysisInput.members.map((member) => ({
          nickname: member.nickname,
          mbti: member.mbti,
          gender: member.gender,
          is_self: member.isSelf,
        })),
      },
    });
  } catch (error) {
    console.error('[api/analyze] failed', error);

    if (isOpenAIQuotaError(error)) {
      return NextResponse.json(
        { error: 'AI 분석 사용량 한도를 초과했습니다' },
        { status: 429 },
      );
    }

    if (isOpenAIRateLimitError(error)) {
      return NextResponse.json(
        { error: '분석 요청이 몰리고 있어요. 잠시 후 다시 시도해주세요' },
        { status: 429 },
      );
    }

    return NextResponse.json(
      { error: '분석 중 오류가 발생했습니다' },
      { status: 500 },
    );
  }
};
