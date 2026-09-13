import { NextResponse } from 'next/server';
import OpenAI from 'openai';
import { zodTextFormat } from 'openai/helpers/zod';

import {
  buildCharacterMatchInput,
  CHARACTER_MATCH_INSTRUCTIONS,
} from '@/entities/character-match/api/prompt';
import {
  characterMatchRequestSchema,
  characterMatchResultSchema,
} from '@/entities/character-match/model/schemas';

export const POST = async (request: Request) => {
  try {
    const body = await request.json();
    const parsed = characterMatchRequestSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: '입력값이 올바르지 않습니다' },
        { status: 400 },
      );
    }

    const matchInput = buildCharacterMatchInput(parsed.data);
    const openai = new OpenAI();

    const response = await openai.responses.create({
      model: process.env.OPENAI_ANALYSIS_MODEL ?? 'gpt-5.6-luna',
      instructions: CHARACTER_MATCH_INSTRUCTIONS,
      input: [
        {
          role: 'user',
          content: [
            {
              type: 'input_text',
              text: JSON.stringify(matchInput),
            },
          ],
        },
      ],
      text: {
        format: zodTextFormat(
          characterMatchResultSchema,
          'character_match_result',
          {
            description: 'Character matching result based on MBTI.',
          },
        ),
      },
      reasoning: {
        effort: 'low',
      },
      store: false,
    });

    const textItem = response.output.find((item) => item.type === 'message');
    const textContent =
      textItem && 'content' in textItem
        ? textItem.content.find(
            (c: { type: string }) => c.type === 'output_text',
          )
        : undefined;

    if (!textContent || !('text' in textContent)) {
      return NextResponse.json(
        { error: '매칭 결과를 생성하지 못했어요. 다시 시도해주세요' },
        { status: 500 },
      );
    }

    const result = characterMatchResultSchema.safeParse(
      JSON.parse(textContent.text as string),
    );

    if (!result.success) {
      return NextResponse.json(
        { error: '매칭 결과 형식이 올바르지 않습니다' },
        { status: 500 },
      );
    }

    return NextResponse.json({ data: result.data });
  } catch (error) {
    console.error('[api/character-match] failed', error);

    return NextResponse.json(
      { error: '매칭 중 오류가 발생했습니다' },
      { status: 500 },
    );
  }
};
