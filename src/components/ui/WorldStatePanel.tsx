'use client';

import type { WorldState } from '@/lib/world/state';

interface WorldStatePanelProps {
  worldState: WorldState;
}

export function WorldStatePanel({ worldState }: WorldStatePanelProps) {
  return (
    <div className="p-4 border-t border-gray-800">
      <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">
        World State
      </h3>

      {/* Robot */}
      <div className="mb-3">
        <div className="text-[10px] text-gray-600 uppercase tracking-wide mb-1">Robot</div>
        <div className="space-y-0.5 text-xs font-mono text-gray-400">
          <div className="flex justify-between">
            <span className="text-cyan-400">position</span>
            <span>({worldState.robot.position.row}, {worldState.robot.position.col})</span>
          </div>
          <div className="flex justify-between">
            <span className="text-cyan-400">facing</span>
            <span>{worldState.robot.facing}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-cyan-400">holding</span>
            <span className={worldState.robot.holding ? 'text-yellow-400' : 'text-gray-600'}>
              {worldState.robot.holding ?? 'nothing'}
            </span>
          </div>
        </div>
      </div>

      {/* Objects */}
      <div className="mb-3">
        <div className="text-[10px] text-gray-600 uppercase tracking-wide mb-1">Objects</div>
        <div className="space-y-0.5 text-xs font-mono text-gray-400">
          {Object.values(worldState.objects).map((obj) => (
            <div key={obj.id} className="flex justify-between">
              <span style={{ color: obj.color }}>{obj.id}</span>
              <span>
                {obj.isHeld
                  ? 'held'
                  : obj.onSurface
                    ? `on ${obj.onSurface}`
                    : `(${obj.position.row},${obj.position.col})`}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Surfaces */}
      <div>
        <div className="text-[10px] text-gray-600 uppercase tracking-wide mb-1">Surfaces</div>
        <div className="space-y-0.5 text-xs font-mono text-gray-400">
          {Object.values(worldState.surfaces).map((surface) => (
            <div key={surface.id} className="flex justify-between">
              <span className="text-gray-300">{surface.id}</span>
              <span>
                {surface.objectsOn.length > 0
                  ? surface.objectsOn.join(', ')
                  : 'empty'}
                <span className="text-gray-600 ml-1">
                  ({surface.objectsOn.length}/{surface.slots})
                </span>
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
