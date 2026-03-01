import { NextRequest, NextResponse } from 'next/server';
import { generatePlan } from '@/lib/planner/llm-planner';
import { createInitialState } from '@/lib/world/state';
import { validatePlan } from '@/lib/planner/validator';
import { supabase } from '@/lib/supabase';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { task, model } = body;

    if (!task || typeof task !== 'string' || task.trim().length === 0) {
      return NextResponse.json(
        { error: 'Missing or empty "task" field' },
        { status: 400 }
      );
    }

    // Use server-side API key (never exposed to client)
    const apiKey = process.env.OPENROUTER_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: 'Server misconfiguration: missing API key' },
        { status: 500 }
      );
    }

    // Use the initial world state (always starts from default)
    const worldState = createInitialState();

    // Generate plan from LLM
    const planResult = await generatePlan(worldState, task.trim(), {
      apiKey,
      model: model || undefined,
      temperature: 0.1,
    });

    if (!planResult.success) {
      // Save failed attempt to history
      supabase.from('plan_history').insert({
        task: task.trim(),
        model: model || 'google/gemini-3-flash-preview',
        plan: [],
        validation_passed: false,
        validation_error: planResult.error,
      }).then(() => {});

      return NextResponse.json(
        { error: planResult.error },
        { status: 500 }
      );
    }

    // Validate the LLM's plan through our 3-layer validator
    const validation = validatePlan(worldState, planResult.plan.plan);

    const responseData = {
      plan: planResult.plan.plan,
      reasoning: planResult.plan.reasoning,
      model: planResult.model,
      usage: planResult.usage,
      validation: {
        valid: validation.valid,
        ...(validation.valid
          ? {}
          : {
              failedAtStep: validation.failedAtStep,
              layer: validation.layer,
              reason: validation.reason,
            }),
      },
    };

    // Save to history (fire-and-forget, don't block the response)
    supabase.from('plan_history').insert({
      task: task.trim(),
      model: planResult.model,
      reasoning: planResult.plan.reasoning,
      plan: planResult.plan.plan,
      validation_passed: validation.valid,
      validation_error: validation.valid ? null : (validation as { reason?: string }).reason || null,
      token_usage: planResult.usage || null,
    }).then(() => {});

    return NextResponse.json(responseData);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json(
      { error: `Server error: ${message}` },
      { status: 500 }
    );
  }
}
