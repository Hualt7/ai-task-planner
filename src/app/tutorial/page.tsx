import Link from 'next/link';

const ACTIONS = [
  { name: 'navigate', args: 'target_id', desc: 'Move the robot adjacent to an object, surface, or container' },
  { name: 'pick_up', args: 'object_id', desc: 'Pick up an object the robot is adjacent to (hands must be empty)' },
  { name: 'place', args: 'object_id, surface_id', desc: 'Place a held object onto a surface with available slots' },
  { name: 'push', args: 'object_id, direction', desc: 'Push an adjacent object one cell in a cardinal direction' },
  { name: 'stack', args: 'object_id, target_object_id', desc: 'Stack a held object on top of another object on a surface' },
  { name: 'open', args: 'container_id', desc: 'Open a closed container the robot is adjacent to' },
  { name: 'close', args: 'container_id', desc: 'Close an open container the robot is adjacent to' },
];

const ENTITIES = [
  { category: 'Objects', items: [
    { id: 'red_box', color: '#ef4444', desc: 'Red box' },
    { id: 'blue_box', color: '#3b82f6', desc: 'Blue box' },
    { id: 'green_box', color: '#22c55e', desc: 'Green box' },
    { id: 'yellow_box', color: '#eab308', desc: 'Yellow box' },
  ]},
  { category: 'Surfaces', items: [
    { id: 'shelf_a', color: '#8b5cf6', desc: 'Shelf A (2 slots)' },
    { id: 'shelf_b', color: '#a855f7', desc: 'Shelf B (2 slots)' },
    { id: 'table_1', color: '#d97706', desc: 'Table 1 (3 slots)' },
    { id: 'table_2', color: '#b45309', desc: 'Table 2 (3 slots)' },
  ]},
  { category: 'Containers', items: [
    { id: 'container_a', color: '#06b6d4', desc: 'Container A (2 slots, openable)' },
    { id: 'container_b', color: '#14b8a6', desc: 'Container B (2 slots, openable)' },
  ]},
];

const GOOD_TASKS = [
  'Put the red box on shelf A',
  'Move all boxes to table 1',
  'Open container A, pick up the blue box, and put it inside',
  'Stack the green box on top of the red box on table 2',
  'Push the yellow box north then pick it up',
];

const BAD_TASKS = [
  'Make the robot dance',
  'Build a tower of 10 blocks',
  'Navigate to coordinate (5,5)',
  'Pick up the purple box',
];

export default function TutorialPage() {
  return (
    <div className="min-h-screen bg-[#0a0a0f] text-white">
      {/* Header */}
      <header className="h-14 border-b border-gray-800/60 flex items-center px-6 sticky top-0 bg-[#0a0a0f]/90 backdrop-blur-sm z-50">
        <Link href="/" className="text-lg font-bold tracking-tight hover:opacity-80 transition-opacity">
          <span className="text-cyan-400">AI</span> Task Planner
        </Link>
        <span className="ml-3 text-xs text-gray-500 font-mono">Tutorial</span>
        <div className="ml-auto flex items-center gap-4">
          <Link href="/playground" className="text-xs text-cyan-400 hover:text-cyan-300 transition-colors font-mono">
            Playground
          </Link>
          <Link href="/history" className="text-xs text-gray-500 hover:text-cyan-400 transition-colors font-mono">
            History
          </Link>
        </div>
      </header>

      <div className="max-w-3xl mx-auto px-6 py-12 space-y-16">
        {/* Intro */}
        <section className="space-y-4">
          <h2 className="text-3xl font-bold tracking-tight">
            What is <span className="text-cyan-400">AI Task Planner</span>?
          </h2>
          <p className="text-gray-400 leading-relaxed">
            AI Task Planner is a robotics task planning system that runs entirely in your browser.
            You describe a task in natural language, an LLM generates a symbolic action plan,
            the plan is validated against domain rules, A* pathfinding computes motion paths,
            and a 3D scene animates the robot executing each step.
          </p>
          <p className="text-gray-400 leading-relaxed">
            It demonstrates a hierarchical robotics architecture where the LLM acts as a high-level
            symbolic planner while code handles the world model, validation, and motion planning.
          </p>
        </section>

        {/* Quick Start */}
        <section className="space-y-4">
          <h2 className="text-2xl font-bold tracking-tight">Quick Start</h2>
          <div className="space-y-3">
            {[
              { step: '1', text: 'Open the Playground', link: '/playground' },
              { step: '2', text: 'Type a task like "Put the red box on shelf A"' },
              { step: '3', text: 'Click "Plan" and wait for the LLM to generate actions' },
              { step: '4', text: 'Watch the robot navigate, pick up, and place objects in 3D' },
            ].map((s) => (
              <div key={s.step} className="flex items-start gap-3">
                <span className="flex-shrink-0 w-7 h-7 rounded-full bg-cyan-900/40 border border-cyan-800/50 flex items-center justify-center text-xs font-bold text-cyan-400">
                  {s.step}
                </span>
                <span className="text-gray-300 text-sm pt-0.5">
                  {s.link ? (
                    <Link href={s.link} className="text-cyan-400 hover:text-cyan-300 underline underline-offset-2">
                      {s.text}
                    </Link>
                  ) : s.text}
                </span>
              </div>
            ))}
          </div>
        </section>

        {/* Interface Guide */}
        <section className="space-y-4">
          <h2 className="text-2xl font-bold tracking-tight">Interface Guide</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {[
              { name: '3D Scene', desc: 'Interactive view of the 10x10 grid world with robot, objects, surfaces, and containers. Drag to orbit, scroll to zoom.' },
              { name: 'Task Input', desc: 'Type a natural language task description. The LLM interprets it into symbolic actions.' },
              { name: 'Model Selector', desc: 'Choose which LLM model to use for planning. Gemini Flash is the default (fast + reliable).' },
              { name: 'Plan Panel', desc: 'Shows the generated action sequence, validation status, and current step during execution.' },
              { name: 'Playback Controls', desc: 'Play/pause, step forward, speed slider, and timeline scrubber for controlling execution.' },
              { name: 'World State Panel', desc: 'Real-time display of robot position, held object, and all entity states.' },
            ].map((panel) => (
              <div key={panel.name} className="bg-[#0a0a1a] border border-gray-800/60 rounded-lg p-4">
                <h4 className="text-sm font-semibold text-cyan-400 mb-1">{panel.name}</h4>
                <p className="text-xs text-gray-500 leading-relaxed">{panel.desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Available Actions */}
        <section className="space-y-4">
          <h2 className="text-2xl font-bold tracking-tight">Available Actions</h2>
          <p className="text-gray-400 text-sm">
            The robot can perform 7 STRIPS-style actions. Each has preconditions that must be met.
          </p>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-800">
                  <th className="text-left py-2 pr-4 text-gray-500 font-medium text-xs">Action</th>
                  <th className="text-left py-2 pr-4 text-gray-500 font-medium text-xs">Arguments</th>
                  <th className="text-left py-2 text-gray-500 font-medium text-xs">Description</th>
                </tr>
              </thead>
              <tbody>
                {ACTIONS.map((a) => (
                  <tr key={a.name} className="border-b border-gray-800/40">
                    <td className="py-2.5 pr-4 font-mono text-cyan-400 text-xs">{a.name}</td>
                    <td className="py-2.5 pr-4 font-mono text-gray-400 text-xs">{a.args}</td>
                    <td className="py-2.5 text-gray-500 text-xs">{a.desc}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* Entity Reference */}
        <section className="space-y-4">
          <h2 className="text-2xl font-bold tracking-tight">Entity Reference</h2>
          <p className="text-gray-400 text-sm">
            The world contains a fixed set of entities. Positions are randomized each session.
          </p>
          <div className="space-y-6">
            {ENTITIES.map((group) => (
              <div key={group.category}>
                <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">{group.category}</h4>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {group.items.map((item) => (
                    <div key={item.id} className="flex items-center gap-2 bg-[#0a0a1a] border border-gray-800/60 rounded-lg px-3 py-2">
                      <div className="w-3 h-3 rounded-sm flex-shrink-0" style={{ backgroundColor: item.color }} />
                      <div>
                        <div className="text-xs font-mono text-gray-300">{item.id}</div>
                        <div className="text-[10px] text-gray-600">{item.desc}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Task Tips */}
        <section className="space-y-4">
          <h2 className="text-2xl font-bold tracking-tight">Task Tips</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div>
              <h4 className="text-xs font-semibold text-green-400 uppercase tracking-wider mb-3">Good Tasks</h4>
              <ul className="space-y-2">
                {GOOD_TASKS.map((t) => (
                  <li key={t} className="text-sm text-gray-400 flex items-start gap-2">
                    <span className="text-green-500 mt-0.5">+</span>
                    <span>&ldquo;{t}&rdquo;</span>
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <h4 className="text-xs font-semibold text-red-400 uppercase tracking-wider mb-3">Won&apos;t Work</h4>
              <ul className="space-y-2">
                {BAD_TASKS.map((t) => (
                  <li key={t} className="text-sm text-gray-400 flex items-start gap-2">
                    <span className="text-red-500 mt-0.5">-</span>
                    <span>&ldquo;{t}&rdquo;</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </section>

        {/* Gazebo Setup */}
        <section className="space-y-4">
          <h2 className="text-2xl font-bold tracking-tight">Gazebo Setup <span className="text-xs text-gray-600 font-normal">(Optional)</span></h2>
          <p className="text-gray-400 text-sm">
            For physics-based simulation, you can connect the web app to Gazebo Harmonic via a ROS2 bridge.
            This requires WSL2 and Docker on Windows.
          </p>
          <div className="bg-[#0a0a1a] border border-gray-800/60 rounded-lg p-5 font-mono text-xs space-y-3">
            <div>
              <span className="text-gray-500"># 1. Start Gazebo + ROS2 bridge</span>
              <div className="text-cyan-400 mt-1">cd gazebo && docker compose up</div>
            </div>
            <div>
              <span className="text-gray-500"># 2. In the playground, click &quot;Connect to Simulator&quot;</span>
            </div>
            <div>
              <span className="text-gray-500"># 3. Run a task — it executes in both web 3D and Gazebo</span>
            </div>
          </div>
          <p className="text-xs text-gray-600">
            The bridge maps grid coordinates to Gazebo world coordinates (1 cell = 0.5m).
            Robot uses differential drive with a P-controller for navigation.
          </p>
        </section>

        {/* Local Dev */}
        <section className="space-y-4">
          <h2 className="text-2xl font-bold tracking-tight">Running Locally</h2>
          <div className="bg-[#0a0a1a] border border-gray-800/60 rounded-lg p-5 font-mono text-xs space-y-3">
            <div>
              <span className="text-gray-500"># Clone and install</span>
              <div className="text-cyan-400 mt-1">git clone https://github.com/Hualt7/ai-task-planner.git</div>
              <div className="text-cyan-400">cd ai-task-planner && npm install</div>
            </div>
            <div>
              <span className="text-gray-500"># Set your OpenRouter API key</span>
              <div className="text-cyan-400 mt-1">echo &quot;OPENROUTER_API_KEY=your_key_here&quot; &gt; .env.local</div>
            </div>
            <div>
              <span className="text-gray-500"># Start dev server</span>
              <div className="text-cyan-400 mt-1">npm run dev</div>
            </div>
            <div>
              <span className="text-gray-500"># Run tests (87 tests)</span>
              <div className="text-cyan-400 mt-1">npx vitest run</div>
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="text-center py-8">
          <Link
            href="/playground"
            className="inline-block px-8 py-3 bg-cyan-500 hover:bg-cyan-400 text-black font-semibold rounded-lg transition-colors text-sm"
          >
            Open Playground
          </Link>
        </section>
      </div>

      {/* Footer */}
      <footer className="h-14 border-t border-gray-800/60 flex items-center justify-center px-6">
        <span className="text-[11px] text-gray-600 font-mono">
          Built with a real robotics planning architecture
        </span>
      </footer>
    </div>
  );
}
