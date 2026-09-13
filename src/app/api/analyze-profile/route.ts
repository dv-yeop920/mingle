import { NextResponse } from 'next/server';
import OpenAI from 'openai';
import { zodTextFormat } from 'openai/helpers/zod';

import {
  buildProfileInput,
  MBTI_PROFILE_INSTRUCTIONS,
} from '@/entities/mbti-profile/api/prompt';
import {
  analyzeProfileRequestSchema,
  mbtiProfileResultSchema,
} from '@/entities/mbti-profile/model/schemas';

export const POST = async (request: Request) => {
  try {
    const body = await request.json();
    const parsed = analyzeProfileRequestSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: '입력값이 올바르지 않습니다' },
        { status: 400 },
      );
    }

    const profileInput = buildProfileInput(parsed.data);
    const openai = new OpenAI();

    const response = await openai.responses.create({
      model: process.env.OPENAI_ANALYSIS_MODEL ?? 'gpt-5.6-luna',
      instructions: MBTI_PROFILE_INSTRUCTIONS,
      input: [
        {
          role: 'user',
          content: [
            {
              type: 'input_text',
              text: JSON.stringify(profileInput),
            },
          ],
        },
      ],
      text: {
        format: zodTextFormat(
          mbtiProfileResultSchema,
          'mbti_profile_result',
          {
            description: 'MBTI personality profile analysis result.',
          },
        ),
      },
      reasoning: {
        effort: 'low',
      },
      store: false,
    });

    const textItem = response.output.find(
      (item) => item.type === 'message',
    );
    const textContent =
      textItem && 'content' in textItem
        ? textItem.content.find(
            (c: { type: string }) => c.type === 'output_text',
          )
        : undefined;

    if (!textContent || !('text' in textContent)) {
      return NextResponse.json(
        { error: '분석 결과를 생성하지 못했어요. 다시 시도해주세요' },
        { status: 500 },
      );
    }

    const result = mbtiProfileResultSchema.safeParse(
      JSON.parse(textContent.text as string),
    );

    if (!result.success) {
      return NextResponse.json(
        { error: '분석 결과 형식이 올바르지 않습니다' },
        { status: 500 },
      );
    }

    return NextResponse.json({ data: result.data });
  } catch (error) {
    console.error('[api/analyze-profile] failed', error);

    return NextResponse.json(
      { error: '분석 중 오류가 발생했습니다' },
      { status: 500 },
    );
  }
};
