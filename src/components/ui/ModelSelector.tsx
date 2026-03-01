'use client';

import { useState } from 'react';

const MODELS = [
  { id: 'google/gemini-3-flash-preview', label: 'Gemini 3 Flash', tier: 'fast' },
  { id: 'google/gemini-2.0-flash-001', label: 'Gemini 2.0 Flash', tier: 'fast' },
  { id: 'google/gemini-3.1-pro-preview-customtools', label: 'Gemini 3.1 Pro', tier: 'smart' },
  { id: 'anthropic/claude-opus-4.6', label: 'Claude Opus 4.6', tier: 'smart' },
  { id: 'anthropic/claude-sonnet-4.6', label: 'Claude Sonnet 4.6', tier: 'smart' },
  { id: 'openai/gpt-4.1', label: 'GPT-4.1', tier: 'smart' },
  { id: 'deepseek/deepseek-r1', label: 'DeepSeek R1', tier: 'smart' },
] as const;

interface ModelSelectorProps {
  value: string;
  onChange: (model: string) => void;
  disabled?: boolean;
}

export function ModelSelector({ value, onChange, disabled }: ModelSelectorProps) {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-xs font-semibold text-gray-400 uppercase tracking-wide">
        Model
      </label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        className="bg-gray-900 border border-gray-700 rounded-md px-2 py-1.5 text-xs text-white focus:outline-none focus:ring-1 focus:ring-cyan-500 disabled:opacity-50 cursor-pointer"
      >
        <optgroup label="Fast">
          {MODELS.filter((m) => m.tier === 'fast').map((m) => (
            <option key={m.id} value={m.id}>
              {m.label}
            </option>
          ))}
        </optgroup>
        <optgroup label="Smart">
          {MODELS.filter((m) => m.tier === 'smart').map((m) => (
            <option key={m.id} value={m.id}>
              {m.label}
            </option>
          ))}
        </optgroup>
      </select>
    </div>
  );
}
