import { NextRequest, NextResponse } from 'next/server';
import { generateObject } from 'ai';
import { createOpenAI } from '@ai-sdk/openai';
import { symbolicPlanSchema } from '@/lib/planner/schema';
import { buildSystemPrompt, buildUserPrompt } from '@/lib/planner/llm-planner';
import type { WorldState } from '@/lib/world/state';
import { validatePlan } from '@/lib/planner/validator';
import type { SymbolicAction } from '@/lib/types';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { currentState, originalTask, failedStep, failureReason, completedSteps, model } = body;

    if (!currentState || !originalTask || !failedStep || !failureReason) {
      return NextResponse.json(
        { error: 'Missing required fields for re-planning' },
        { status: 400 }
      );
    }

    const apiKey = process.env.OPENROUTER_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: 'Server misconfiguration: missing API key' },
        { status: 500 }
      );
    }

    const modelId = model || 'google/gemini-3-flash-preview';
    const openrouter = createOpenAI({
      baseURL: 'https://openrouter.ai/api/v1',
      apiKey,
    });

    const systemPrompt = buildSystemPrompt();
    const baseUserPrompt = buildUserPrompt(currentState as WorldState, originalTask);

    const replanContext = `
## Re-Planning Context

The previous plan failed during execution. Here is what happened:

Steps completed successfully: ${JSON.stringify(completedSteps || [])}
Step that failed: ${JSON.stringify(failedStep)}
Failure reason: "${failureReason}"

The world state shown above is the CURRENT state after the completed steps.
Generate a NEW plan from this current state to complete the original task.
Do NOT repeat steps that already succeeded.`;

    const result = await generateObject({
      model: openrouter(modelId),
      schema: symbolicPlanSchema,
      system: systemPrompt,
      prompt: baseUserPrompt + '\n' + replanContext,
      temperature: 0.1,
    });

    const plan: SymbolicAction[] = result.object.plan.map((a) => ({
      action: a.action,
      args: a.args as Record<string, string>,
    }));

    // Validate the re-plan against the current world state
    const validation = validatePlan(currentState as WorldState, plan);

    return NextResponse.json({
      plan,
      reasoning: result.object.reasoning,
      model: modelId,
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
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json(
      { error: `Re-planning error: ${message}` },
      { status: 500 }
    );
  }
}
