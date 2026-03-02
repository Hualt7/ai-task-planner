import Link from 'next/link';

export default function Home() {
  return (
    <div className="min-h-screen bg-[#0a0a0f] text-white flex flex-col">
      {/* Header */}
      <header className="h-14 border-b border-gray-800 flex items-center px-6 shrink-0">
        <h1 className="text-lg font-bold tracking-tight">
          <span className="text-cyan-400">AI</span> Task Planner
        </h1>
        <span className="ml-3 text-xs text-gray-500 font-mono">3D Robotics Planner</span>
        <div className="ml-auto flex items-center gap-4">
          <Link
            href="/playground"
            className="text-xs text-cyan-400 hover:text-cyan-300 transition-colors font-mono"
          >
            Playground
          </Link>
          <Link
            href="/history"
            className="text-xs text-gray-500 hover:text-cyan-400 transition-colors font-mono"
          >
            History
          </Link>
        </div>
      </header>

      {/* Hero */}
      <main className="flex-1 flex flex-col items-center justify-center px-6">
        <div className="max-w-2xl text-center space-y-8">
          {/* Title */}
          <div className="space-y-3">
            <h2 className="text-5xl font-bold tracking-tight leading-tight">
              Describe a task.
              <br />
              <span className="text-cyan-400">Watch a robot plan it.</span>
            </h2>
            <p className="text-lg text-gray-400 leading-relaxed max-w-lg mx-auto">
              A real robotics planning architecture: LLM symbolic planner, STRIPS-style
              action model, A* pathfinding, and 3D execution — all in the browser.
            </p>
          </div>

          {/* CTA */}
          <div className="flex items-center justify-center gap-4">
            <Link
              href="/playground"
              className="px-6 py-3 bg-cyan-500 hover:bg-cyan-400 text-black font-semibold rounded-lg transition-colors text-sm"
            >
              Open Playground
            </Link>
            <Link
              href="/history"
              className="px-6 py-3 bg-gray-800 hover:bg-gray-700 text-gray-300 font-semibold rounded-lg transition-colors text-sm"
            >
              View History
            </Link>
          </div>

          {/* Architecture diagram */}
          <div className="pt-8">
            <div className="bg-[#0a0a1a] border border-gray-800 rounded-xl p-6 text-left">
              <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-4">
                Architecture
              </h3>
              <div className="flex flex-col items-center gap-2 font-mono text-xs">
                <div className="px-4 py-2 bg-cyan-900/30 border border-cyan-800/50 rounded-md text-cyan-400 w-full text-center">
                  Natural Language Task
                </div>
                <span className="text-gray-600">|</span>
                <div className="px-4 py-2 bg-purple-900/30 border border-purple-800/50 rounded-md text-purple-400 w-full text-center">
                  LLM Symbolic Planner (OpenRouter)
                </div>
                <span className="text-gray-600">|</span>
                <div className="px-4 py-2 bg-yellow-900/30 border border-yellow-800/50 rounded-md text-yellow-400 w-full text-center">
                  3-Layer Validator (Schema + Domain + Preconditions)
                </div>
                <span className="text-gray-600">|</span>
                <div className="px-4 py-2 bg-green-900/30 border border-green-800/50 rounded-md text-green-400 w-full text-center">
                  A* Motion Planner (Grid Pathfinding)
                </div>
                <span className="text-gray-600">|</span>
                <div className="px-4 py-2 bg-red-900/30 border border-red-800/50 rounded-md text-red-400 w-full text-center">
                  Executor + 3D Visualization (React Three Fiber)
                </div>
              </div>
            </div>
          </div>

          {/* Features grid */}
          <div className="grid grid-cols-3 gap-4 pt-4">
            <div className="bg-[#0a0a1a] border border-gray-800 rounded-lg p-4 text-left">
              <div className="text-cyan-400 text-lg mb-2">01</div>
              <h4 className="text-sm font-semibold mb-1">Fixed Vocabulary</h4>
              <p className="text-xs text-gray-500 leading-relaxed">
                Strict domain with predefined objects, surfaces, and actions. No hallucinated IDs.
              </p>
            </div>
            <div className="bg-[#0a0a1a] border border-gray-800 rounded-lg p-4 text-left">
              <div className="text-cyan-400 text-lg mb-2">02</div>
              <h4 className="text-sm font-semibold mb-1">Deterministic Validation</h4>
              <p className="text-xs text-gray-500 leading-relaxed">
                Every LLM plan is validated against schema, domain rules, and precondition simulation.
              </p>
            </div>
            <div className="bg-[#0a0a1a] border border-gray-800 rounded-lg p-4 text-left">
              <div className="text-cyan-400 text-lg mb-2">03</div>
              <h4 className="text-sm font-semibold mb-1">A* Pathfinding</h4>
              <p className="text-xs text-gray-500 leading-relaxed">
                Real grid-based pathfinding with obstacle avoidance. No teleporting.
              </p>
            </div>
          </div>

          {/* Tech stack */}
          <div className="flex items-center justify-center gap-3 flex-wrap pt-2 pb-8">
            {['Next.js', 'TypeScript', 'React Three Fiber', 'Vercel AI SDK', 'OpenRouter', 'Supabase', 'A*', 'Vitest'].map((tech) => (
              <span
                key={tech}
                className="px-2.5 py-1 bg-gray-800/50 border border-gray-800 rounded-full text-[10px] text-gray-500 font-mono"
              >
                {tech}
              </span>
            ))}
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="h-12 border-t border-gray-800 flex items-center justify-center px-6 shrink-0">
        <span className="text-[10px] text-gray-600 font-mono">
          Built with a real robotics planning architecture
        </span>
      </footer>
    </div>
  );
}
