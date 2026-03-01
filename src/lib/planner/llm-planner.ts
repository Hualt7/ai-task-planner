import { generateObject } from 'ai';
import { createOpenAI } from '@ai-sdk/openai';
import { symbolicPlanSchema } from './schema';
import type { WorldState } from '../world/state';
import { OBJECT_IDS, SURFACE_IDS, ACTION_NAMES } from '../world/domain';
import type { SymbolicPlan } from '../types';

// --- System prompt ---
// Describes the robot's world, available actions, and output format constraints.
function buildSystemPrompt(): string {
  return `You are a robotic task planner. You decompose natural language instructions into a sequence of symbolic actions that a robot can execute on a 10x10 grid.

## World

The world is a 10x10 grid. There is one robot, several movable box objects, and fixed surfaces (shelves and tables).

### Fixed Vocabulary (use ONLY these IDs)

Objects: ${OBJECT_IDS.join(', ')}
Surfaces: ${SURFACE_IDS.join(', ')}
Actions: ${ACTION_NAMES.join(', ')}

### Actions

1. **navigate** — Move the robot to a cell adjacent to a target entity.
   - Args: { "target_id": "<object_id or surface_id>" }
   - The robot pathfinds around obstacles automatically. You only specify the target.

2. **pick_up** — Pick up an object. Robot must be adjacent and not holding anything.
   - Args: { "object_id": "<object_id>" }

3. **place** — Place the held object on a surface. Robot must be adjacent to the surface and be holding the object. Surface must have available slots.
   - Args: { "object_id": "<object_id>", "surface_id": "<surface_id>" }

### Planning Rules

- Always navigate to an object/surface BEFORE interacting with it.
- The robot can only hold ONE object at a time.
- To move object A to surface B: navigate(A) → pick_up(A) → navigate(B) → place(A, B)
- For multi-object tasks, complete one object fully before starting the next.
- Use the fewest actions possible. Do not add unnecessary steps.
- Only use IDs from the fixed vocabulary above. Never invent new IDs.`;
}

// --- User prompt ---
// Provides current world state and the user's natural language task.
function buildUserPrompt(worldState: WorldState, task: string): string {
  const objectStates = Object.values(worldState.objects)
    .map((obj) => {
      if (obj.isHeld) return `  - ${obj.id}: held by robot`;
      if (obj.onSurface) return `  - ${obj.id}: on ${obj.onSurface}`;
      return `  - ${obj.id}: at position (${obj.position.row}, ${obj.position.col})`;
    })
    .join('\n');

  const surfaceStates = Object.values(worldState.surfaces)
    .map((surf) => {
      const items = surf.objectsOn.length > 0 ? surf.objectsOn.join(', ') : 'empty';
      return `  - ${surf.id} (${surf.type}, ${surf.slots} slots): [${items}] at (${surf.position.row}, ${surf.position.col})`;
    })
    .join('\n');

  const robotState = `  - Position: (${worldState.robot.position.row}, ${worldState.robot.position.col})
  - Holding: ${worldState.robot.holding ?? 'nothing'}
  - Facing: ${worldState.robot.facing}`;

  return `## Current World State

Robot:
${robotState}

Objects:
${objectStates}

Surfaces:
${surfaceStates}

## Task

"${task}"

Generate the action plan.`;
}

// --- LLM planner ---
export interface PlannerConfig {
  apiKey: string;
  model?: string;
  temperature?: number;
}

export interface PlannerResult {
  success: true;
  plan: SymbolicPlan;
  model: string;
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
}

export interface PlannerError {
  success: false;
  error: string;
}

export type PlanResult = PlannerResult | PlannerError;

export async function generatePlan(
  worldState: WorldState,
  task: string,
  config: PlannerConfig
): Promise<PlanResult> {
  const modelId = config.model || 'google/gemini-3-flash-preview';

  try {
    const openrouter = createOpenAI({
      baseURL: 'https://openrouter.ai/api/v1',
      apiKey: config.apiKey,
    });

    const result = await generateObject({
      model: openrouter(modelId),
      mode: 'tool',
      schema: symbolicPlanSchema,
      schemaName: 'robotPlan',
      schemaDescription: 'A symbolic action plan for the robot to execute',
      system: buildSystemPrompt(),
      prompt: buildUserPrompt(worldState, task),
      temperature: config.temperature ?? 0.1,
    });

    return {
      success: true,
      plan: {
        plan: result.object.plan.map((a) => ({
          action: a.action,
          args: a.args as Record<string, string>,
        })),
        reasoning: result.object.reasoning,
      },
      model: modelId,
      usage: result.usage
        ? {
            promptTokens: result.usage.promptTokens,
            completionTokens: result.usage.completionTokens,
            totalTokens: result.usage.totalTokens,
          }
        : undefined,
    };
  } catch (err: unknown) {
    let detail = '';
    if (err instanceof Error) {
      detail = err.message;
      // Dig into nested error properties for provider details
      const anyErr = err as Record<string, unknown>;
      if (anyErr.data) detail += ` | data: ${JSON.stringify(anyErr.data)}`;
      if (anyErr.statusCode) detail += ` | status: ${anyErr.statusCode}`;
      if (anyErr.responseBody) detail += ` | body: ${JSON.stringify(anyErr.responseBody)}`;
      if (err.cause) detail += ` | cause: ${JSON.stringify(err.cause)}`;
    } else {
      detail = JSON.stringify(err);
    }
    return {
      success: false,
      error: `LLM error (${modelId}): ${detail}`,
    };
  }
}
