import { NextResponse } from 'next/server';
import OpenAI from 'openai';
import { z } from 'zod';

import { createClient } from '@/shared/lib/supabase/server';

import { buildAnalysisPrompt } from '@/entities/analysis/api/prompt';

const MBTI_TYPES = [
  'INTJ', 'INTP', 'ENTJ', 'ENTP',
  'INFJ', 'INFP', 'ENFJ', 'ENFP',
  'ISTJ', 'ISFJ', 'ESTJ', 'ESFJ',
  'ISTP', 'ISFP', 'ESTP', 'ESFP',
] as const;

const memberSchema = z.object({
  nickname: z.string().min(1).max(8),
  mbti: z.enum(MBTI_TYPES),
  gender: z.enum(['male', 'female', 'other']),
  isSelf: z.boolean(),
});

const requestSchema = z.object({
  groupType: z.enum(['friends', 'work', 'family', 'custom']),
  customName: z.string().max(20).optional(),
  members: z.array(memberSchema).min(2).max(10),
});

const aiResponseSchema = z.object({
  chemistryScore: z.number().int().min(0).max(100),
  tagline: z.string(),
  metrics: z.object({
    conversation: z.number().int().min(0).max(100),
    friendship: z.number().int().min(0).max(100),
    teamwork: z.number().int().min(0).max(100),
    atmosphere: z.number().int().min(0).max(100),
    conflict: z.number().int().min(0).max(100),
  }),
  groupAtmosphere: z.object({
    description: z.string(),
    decisionMaking: z.string(),
    conflict: z.string(),
    bestMoment: z.string(),
  }),
  memberRoles: z.array(
    z.object({
      nickname: z.string(),
      mbti: z.string(),
      role: z.string(),
      description: z.string(),
    }),
  ),
  pairChemistry: z.array(
    z.object({
      memberA: z.string(),
      memberB: z.string(),
      score: z.number().int().min(0).max(100),
      summary: z.string(),
      description: z.string(),
      conversationScore: z.number().int().min(0).max(100),
      conflictScore: z.number().int().min(0).max(100),
      recommendedSituations: z.string(),
    }),
  ),
  summary: z.string(),
});

export const POST = async (request: Request) => {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        { error: '인증이 필요합니다' },
        { status: 401 },
      );
    }

    const body = await request.json();
    const parsed = requestSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: '입력값이 올바르지 않습니다' },
        { status: 400 },
      );
    }

    const { groupType, customName, members } = parsed.data;

    const { data: group, error: groupError } = await supabase
      .from('groups')
      .insert({
        user_id: user.id,
        type: groupType,
        custom_name: customName ?? null,
      })
      .select('id')
      .single();

    if (groupError || !group) {
      return NextResponse.json(
        { error: '그룹 생성에 실패했습니다' },
        { status: 500 },
      );
    }

    const memberRows = members.map((m, i) => ({
      group_id: group.id,
      nickname: m.nickname,
      mbti: m.mbti,
      gender: m.gender,
      is_self: m.isSelf,
      order: i,
    }));

    const { error: membersError } = await supabase
      .from('members')
      .insert(memberRows);

    if (membersError) {
      return NextResponse.json(
        { error: '멤버 저장에 실패했습니다' },
        { status: 500 },
      );
    }

    const { systemPrompt, userPrompt } = buildAnalysisPrompt({
      groupType,
      customName,
      members,
    });

    const openai = new OpenAI();
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      response_format: { type: 'json_object' },
      temperature: 0.8,
    });

    const rawContent = completion.choices[0].message.content;
    if (!rawContent) {
      return NextResponse.json(
        { error: 'AI 응답이 비어있습니다' },
        { status: 500 },
      );
    }

    const aiResult = aiResponseSchema.safeParse(JSON.parse(rawContent));
    if (!aiResult.success) {
      return NextResponse.json(
        { error: 'AI 응답 형식이 올바르지 않습니다' },
        { status: 500 },
      );
    }

    const analysisData = aiResult.data;

    const { data: analysis, error: analysisError } = await supabase
      .from('analyses')
      .insert({
        user_id: user.id,
        group_id: group.id,
        chemistry_score: analysisData.chemistryScore,
        tagline: analysisData.tagline,
        metrics: analysisData.metrics,
        group_atmosphere: analysisData.groupAtmosphere,
        member_roles: analysisData.memberRoles,
        pair_chemistry: analysisData.pairChemistry,
        summary: analysisData.summary,
      })
      .select('id')
      .single();

    if (analysisError || !analysis) {
      return NextResponse.json(
        { error: '분석 결과 저장에 실패했습니다' },
        { status: 500 },
      );
    }

    return NextResponse.json({
      data: {
        analysisId: analysis.id,
        groupId: group.id,
        ...analysisData,
      },
    });
  } catch {
    return NextResponse.json(
      { error: '분석 중 오류가 발생했습니다' },
      { status: 500 },
    );
  }
};
