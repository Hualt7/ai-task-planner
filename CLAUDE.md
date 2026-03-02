# AI Task Planner

A robotics task planner where users describe tasks in natural language, an LLM generates symbolic action plans, and a 3D scene animates robot execution.

## Architecture

```
Natural Language Task
  → LLM Symbolic Planner (OpenRouter via Vercel AI SDK)
  → 3-Layer Validator (Schema → Domain → Precondition Simulation)
  → A* Motion Planner (Grid Pathfinding)
  → Executor + 3D Visualization (React Three Fiber)
```

Hierarchical robotics design: LLM = symbolic planner, Code = world model + validation + motion planning.

## Tech Stack

- **Framework**: Next.js 16 App Router, TypeScript, Tailwind CSS
- **3D**: React Three Fiber (R3F) — dynamic import, no SSR
- **AI**: Vercel AI SDK `generateObject()` + OpenRouter (baseURL proxy)
- **DB**: Supabase (plan_history table, RLS with public read/insert)
- **Testing**: Vitest (64 tests across 6 files)
- **Deploy**: Vercel at https://ai-task-planner-pi.vercel.app

## Key Design Decisions

- **Fixed vocabulary**: All entity IDs defined as `const` arrays in `domain.ts`. No dynamic names.
- **STRIPS/PDDL-style actions**: navigate, pick_up, place with preconditions and effects
- **Low LLM temperature** (0.1): Planner-like behavior, not creative
- **Zod schemas for structured output**: No `.min()/.max()` on arrays (breaks Anthropic/Bedrock providers)
- **AI SDK v4**: No `mode` param on `generateObject` (auto-inferred). Usage props are `inputTokens`/`outputTokens` (not `promptTokens`/`completionTokens`)
- **OpenRouter API key**: Server-side only via `process.env.OPENROUTER_API_KEY` (Vercel env var). Never sent from client.

## Project Structure

```
src/
├── app/
│   ├── page.tsx                    # Landing page (hero + architecture diagram)
│   ├── playground/page.tsx         # Main playground (3D scene + side panel)
│   ├── history/page.tsx            # Browse + replay past plans
│   ├── api/plan/route.ts           # POST: LLM planning endpoint (server-side API key)
│   ├── api/history/route.ts        # GET: list plan history from Supabase
│   └── api/history/[id]/route.ts   # GET: single plan for replay
├── lib/
│   ├── types.ts                    # SymbolicAction, SymbolicPlan
│   ├── supabase.ts                 # Supabase client + PlanHistoryRow type
│   ├── world/
│   │   ├── domain.ts               # OBJECT_IDS, SURFACE_IDS, ACTION_NAMES (source of truth)
│   │   ├── state.ts                # WorldState, createInitialState(), cloneState()
│   │   ├── actions.ts              # STRIPS-style action definitions
│   │   └── grid.ts                 # Grid utilities, adjacency, occupancy
│   ├── planner/
│   │   ├── astar.ts                # A* pathfinding (Manhattan heuristic)
│   │   ├── validator.ts            # 3-layer plan validation
│   │   ├── schema.ts               # Zod schemas for LLM structured output
│   │   └── llm-planner.ts          # LLM planner (OpenRouter + generateObject)
│   └── executor/
│       └── executor.ts             # buildExecutablePlan, executeStep
├── hooks/
│   └── useExecutor.ts              # React hook: runPlan, pause, resume, stepForward, reset
├── components/
│   ├── scene/                      # R3F: SceneCanvas, Robot, SceneObject, Surface, Room, PathVisualization
│   └── ui/                         # TaskInput, ModelSelector, PlanPanel, PlaybackControls, WorldStatePanel, ApiKeyInput (unused)
└── __tests__/                      # 64 tests: domain, astar, actions, validator, executor, schema
```

## Common Gotchas

- **SceneObject.tsx**: `useFrame` must be called before any conditional `return null` (React hooks rules)
- **OpenRouter model compat**: Anthropic models via OpenRouter can fail with structured output. Google Gemini models work reliably. Default: `google/gemini-3-flash-preview`
- **Vercel builds**: Strict TypeScript — no `unknown` as `ReactNode`, no unused params, double-cast errors with `as unknown as Record<string, unknown>`
- **Supabase**: Project ID `fjytqiciflasnipvabtl`. Anon key is hardcoded in supabase.ts (public, RLS-protected)

## Running Locally

```bash
npm run dev      # Dev server on port 3000
npx vitest run   # Run all 64 tests
npx next build   # Production build check
```
