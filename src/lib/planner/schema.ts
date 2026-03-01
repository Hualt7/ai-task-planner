import { z } from 'zod';
import { OBJECT_IDS, SURFACE_IDS, ACTION_NAMES } from '../world/domain';

// --- Zod schemas for structured LLM output ---
// These constrain the LLM to only produce valid actions from our fixed vocabulary.

const objectIdEnum = z.enum(OBJECT_IDS);
const surfaceIdEnum = z.enum(SURFACE_IDS);
const entityIdEnum = z.union([objectIdEnum, surfaceIdEnum]);

// Navigate action: move robot adjacent to a target entity
const navigateActionSchema = z.object({
  action: z.literal('navigate'),
  args: z.object({
    target_id: entityIdEnum,
  }),
});

// Pick up action: pick up an object the robot is adjacent to
const pickUpActionSchema = z.object({
  action: z.literal('pick_up'),
  args: z.object({
    object_id: objectIdEnum,
  }),
});

// Place action: place the held object on a surface the robot is adjacent to
const placeActionSchema = z.object({
  action: z.literal('place'),
  args: z.object({
    object_id: objectIdEnum,
    surface_id: surfaceIdEnum,
  }),
});

// Union of all valid actions
export const symbolicActionSchema = z.discriminatedUnion('action', [
  navigateActionSchema,
  pickUpActionSchema,
  placeActionSchema,
]);

// Complete plan output from the LLM
export const symbolicPlanSchema = z.object({
  reasoning: z
    .string()
    .describe(
      'Brief chain-of-thought explaining the plan. 1-3 sentences. Reference current world state and why each step is needed.'
    ),
  plan: z
    .array(symbolicActionSchema)
    .describe('Ordered list of symbolic actions to execute. Must have at least 1 action and no more than 20.'),
});

export type SymbolicPlanOutput = z.infer<typeof symbolicPlanSchema>;
