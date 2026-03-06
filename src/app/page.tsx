import Link from 'next/link';

const STEPS = [
  {
    num: '1',
    title: 'Describe a Task',
    desc: '"Put the red box on shelf A"',
    color: 'cyan',
    bg: 'bg-cyan-900/20',
    border: 'border-cyan-800/40',
    text: 'text-cyan-400',
  },
  {
    num: '2',
    title: 'LLM Plans It',
    desc: 'Symbolic action sequence via structured output',
    color: 'purple',
    bg: 'bg-purple-900/20',
    border: 'border-purple-800/40',
    text: 'text-purple-400',
  },
  {
    num: '3',
    title: 'Validated & Pathfound',
    desc: '3-layer check + A* grid navigation',
    color: 'yellow',
    bg: 'bg-yellow-900/20',
    border: 'border-yellow-800/40',
    text: 'text-yellow-400',
  },
  {
    num: '4',
    title: 'Robot Executes',
    desc: '3D animated execution in the browser',
    color: 'green',
    bg: 'bg-green-900/20',
    border: 'border-green-800/40',
    text: 'text-green-400',
  },
];

const ARCH_LAYERS = [
  { label: 'Natural Language Task', bg: 'bg-cyan-900/30', border: 'border-cyan-800/50', text: 'text-cyan-400' },
  { label: 'LLM Symbolic Planner (OpenRouter)', bg: 'bg-purple-900/30', border: 'border-purple-800/50', text: 'text-purple-400' },
  { label: '3-Layer Validator (Schema + Domain + Preconditions)', bg: 'bg-yellow-900/30', border: 'border-yellow-800/50', text: 'text-yellow-400' },
  { label: 'A* Motion Planner (Grid Pathfinding)', bg: 'bg-green-900/30', border: 'border-green-800/50', text: 'text-green-400' },
  { label: 'Executor + 3D Visualization (React Three Fiber)', bg: 'bg-red-900/30', border: 'border-red-800/50', text: 'text-red-400' },
];

const FEATURES = [
  {
    num: '01',
    title: 'Fixed Vocabulary',
    desc: 'Strict domain with predefined objects, surfaces, and actions. No hallucinated IDs.',
  },
  {
    num: '02',
    title: 'Deterministic Validation',
    desc: 'Every LLM plan is validated against schema, domain rules, and precondition simulation.',
  },
  {
    num: '03',
    title: 'A* Pathfinding',
    desc: 'Real grid-based pathfinding with obstacle avoidance. No teleporting.',
  },
  {
    num: '04',
    title: 'Gazebo Integration',
    desc: 'Optional ROS2 bridge syncs plans to a physics-based Gazebo Harmonic simulator.',
  },
  {
    num: '05',
    title: 'Randomized Layouts',
    desc: 'Each session generates a unique world layout with seeded PRNG for reproducibility.',
  },
  {
    num: '06',
    title: 'Plan History & Replay',
    desc: 'All plans are saved to Supabase. Browse and replay past executions step-by-step.',
  },
];

const TECH = ['Next.js 16', 'TypeScript', 'React Three Fiber', 'Vercel AI SDK', 'OpenRouter', 'Supabase', 'A* Search', 'ROS2', 'Gazebo', 'Vitest'];

export default function Home() {
  return (
    <div className="min-h-screen bg-[#0a0a0f] text-white flex flex-col">
      {/* Header */}
      <header className="h-14 border-b border-gray-800/60 flex items-center px-6 shrink-0 backdrop-blur-sm bg-[#0a0a0f]/80 sticky top-0 z-50">
        <h1 className="text-lg font-bold tracking-tight">
          <span className="text-cyan-400">AI</span> Task Planner
        </h1>
        <span className="ml-3 text-xs text-gray-500 font-mono hidden sm:inline">3D Robotics Planner</span>
        <div className="ml-auto flex items-center gap-4">
          <Link href="/playground" className="text-xs text-cyan-400 hover:text-cyan-300 transition-colors font-mono">
            Playground
          </Link>
          <Link href="/history" className="text-xs text-gray-500 hover:text-cyan-400 transition-colors font-mono">
            History
          </Link>
          <Link href="/tutorial" className="text-xs text-gray-500 hover:text-cyan-400 transition-colors font-mono">
            Tutorial
          </Link>
        </div>
      </header>

      <main className="flex-1 flex flex-col items-center px-6">
        {/* ── Hero ───────────────────────────────────── */}
        <section className="flex flex-col items-center justify-center min-h-[70vh] max-w-3xl text-center relative">
          {/* Radial gradient bg accent */}
          <div className="absolute inset-0 pointer-events-none" style={{
            background: 'radial-gradient(ellipse 60% 40% at 50% 40%, rgba(0,180,255,0.06) 0%, transparent 70%)',
          }} />

          <h2 className="text-5xl sm:text-6xl font-bold tracking-tight leading-tight animate-fade-in-up">
            Describe a task.
            <br />
            <span className="text-cyan-400">Watch a robot plan it.</span>
          </h2>

          <p className="mt-6 text-lg text-gray-400 leading-relaxed max-w-xl animate-fade-in-up delay-200">
            A real robotics planning architecture: LLM symbolic planner, STRIPS-style
            action model, A* pathfinding, and 3D execution — all in the browser.
          </p>

          <div className="flex items-center justify-center gap-4 mt-8 animate-fade-in-up delay-400">
            <Link
              href="/playground"
              className="px-7 py-3 bg-cyan-500 hover:bg-cyan-400 text-black font-semibold rounded-lg transition-all text-sm hover:scale-105 animate-pulse-glow"
            >
              Open Playground
            </Link>
            <Link
              href="/tutorial"
              className="px-7 py-3 bg-gray-800 hover:bg-gray-700 text-gray-300 font-semibold rounded-lg transition-all text-sm hover:scale-105"
            >
              Get Started
            </Link>
          </div>
        </section>

        {/* ── How it Works ───────────────────────────── */}
        <section className="w-full max-w-4xl py-16">
          <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-widest mb-8 text-center animate-fade-in">
            How it Works
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {STEPS.map((step, i) => (
              <div
                key={step.num}
                className={`relative ${step.bg} border ${step.border} rounded-xl p-5 animate-fade-in-up delay-${(i + 1) * 100} group hover:scale-[1.03] transition-transform`}
              >
                <div className={`text-3xl font-black ${step.text} opacity-20 absolute top-3 right-4`}>
                  {step.num}
                </div>
                <h4 className={`text-sm font-semibold ${step.text} mb-2`}>{step.title}</h4>
                <p className="text-xs text-gray-400 leading-relaxed">{step.desc}</p>
                {/* Connecting arrow (hidden on last) */}
                {i < STEPS.length - 1 && (
                  <div className="hidden lg:block absolute -right-3 top-1/2 -translate-y-1/2 text-gray-600 text-lg">
                    &rarr;
                  </div>
                )}
              </div>
            ))}
          </div>
        </section>

        {/* ── Architecture ───────────────────────────── */}
        <section className="w-full max-w-2xl py-12">
          <div className="bg-[#0a0a1a] border border-gray-800/60 rounded-xl p-6 text-left animate-fade-in-up delay-200">
            <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-widest mb-5">
              Architecture Pipeline
            </h3>
            <div className="flex flex-col items-center gap-2 font-mono text-xs">
              {ARCH_LAYERS.map((layer, i) => (
                <div key={layer.label}>
                  <div
                    className={`px-4 py-2.5 ${layer.bg} border ${layer.border} rounded-md ${layer.text} w-full text-center animate-slide-in-left`}
                    style={{ animationDelay: `${i * 0.1 + 0.3}s` }}
                  >
                    {layer.label}
                  </div>
                  {i < ARCH_LAYERS.length - 1 && (
                    <div className="text-gray-600 text-center my-1">
                      <svg className="w-4 h-4 mx-auto" viewBox="0 0 16 16" fill="none">
                        <path d="M8 2v10M4 8l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── Features ───────────────────────────────── */}
        <section className="w-full max-w-4xl py-12">
          <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-widest mb-8 text-center">
            Key Features
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {FEATURES.map((f, i) => (
              <div
                key={f.num}
                className="bg-[#0a0a1a] border border-gray-800/60 rounded-xl p-5 text-left hover:border-cyan-800/40 hover:-translate-y-1 transition-all animate-fade-in-up"
                style={{ animationDelay: `${i * 0.08 + 0.2}s` }}
              >
                <div className="text-cyan-400 text-lg font-bold mb-2 font-mono">{f.num}</div>
                <h4 className="text-sm font-semibold mb-1.5">{f.title}</h4>
                <p className="text-xs text-gray-500 leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* ── Tech Stack ─────────────────────────────── */}
        <section className="w-full max-w-3xl py-10 pb-16">
          <div className="flex items-center justify-center gap-3 flex-wrap">
            {TECH.map((tech, i) => (
              <span
                key={tech}
                className="px-3 py-1.5 bg-gray-800/40 border border-gray-800/60 rounded-full text-[11px] text-gray-400 font-mono hover:border-cyan-800/50 hover:text-cyan-400 transition-all cursor-default animate-fade-in"
                style={{ animationDelay: `${i * 0.05 + 0.5}s` }}
              >
                {tech}
              </span>
            ))}
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="h-14 border-t border-gray-800/60 flex items-center justify-center px-6 shrink-0 gap-4">
        <span className="text-[11px] text-gray-600 font-mono">
          Built with a real robotics planning architecture
        </span>
        <Link href="/tutorial" className="text-[11px] text-gray-500 hover:text-cyan-400 font-mono transition-colors">
          Tutorial &rarr;
        </Link>
      </footer>
    </div>
  );
}
