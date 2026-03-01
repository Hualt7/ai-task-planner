'use client';

import { useState, useRef, useEffect } from 'react';

interface TaskInputProps {
  onSubmit: (task: string) => void;
  isLoading: boolean;
  disabled?: boolean;
}

const EXAMPLE_TASKS = [
  'Put the red box on shelf A',
  'Move the blue box to table 1',
  'Place all boxes on shelves',
  'Put the green box on table 2 and the yellow box on shelf B',
];

export function TaskInput({ onSubmit, isLoading, disabled }: TaskInputProps) {
  const [task, setTask] = useState('');
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (!isLoading && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isLoading]);

  const handleSubmit = () => {
    const trimmed = task.trim();
    if (trimmed.length === 0 || isLoading || disabled) return;
    onSubmit(trimmed);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  return (
    <div className="flex flex-col gap-2">
      <label className="text-xs font-semibold text-gray-400 uppercase tracking-wide">
        Describe a task
      </label>

      <div className="relative">
        <textarea
          ref={inputRef}
          value={task}
          onChange={(e) => setTask(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="e.g. Put the red box on shelf A"
          disabled={isLoading || disabled}
          rows={2}
          className="w-full bg-gray-900 border border-gray-700 rounded-md px-3 py-2 text-sm text-white placeholder-gray-600 focus:outline-none focus:ring-1 focus:ring-cyan-500 focus:border-cyan-500 disabled:opacity-50 resize-none"
        />
      </div>

      <button
        onClick={handleSubmit}
        disabled={task.trim().length === 0 || isLoading || disabled}
        className="w-full px-4 py-2 bg-cyan-600 hover:bg-cyan-500 disabled:bg-gray-700 disabled:text-gray-500 rounded-md text-sm font-semibold transition-colors flex items-center justify-center gap-2"
      >
        {isLoading ? (
          <>
            <span className="inline-block w-3 h-3 border-2 border-gray-400 border-t-transparent rounded-full animate-spin" />
            Planning...
          </>
        ) : (
          'Generate Plan'
        )}
      </button>

      {/* Example tasks */}
      <div className="flex flex-wrap gap-1 mt-1">
        {EXAMPLE_TASKS.map((example) => (
          <button
            key={example}
            onClick={() => {
              setTask(example);
              inputRef.current?.focus();
            }}
            disabled={isLoading || disabled}
            className="text-[10px] px-2 py-0.5 bg-gray-800 hover:bg-gray-700 text-gray-400 hover:text-gray-300 rounded-full transition-colors disabled:opacity-50"
          >
            {example}
          </button>
        ))}
      </div>
    </div>
  );
}
