'use client';

import { useState, useEffect } from 'react';

const STORAGE_KEY = 'ai-task-planner-openrouter-key';

interface ApiKeyInputProps {
  onKeyChange: (key: string | null) => void;
}

export function ApiKeyInput({ onKeyChange }: ApiKeyInputProps) {
  const [key, setKey] = useState('');
  const [saved, setSaved] = useState(false);
  const [isVisible, setIsVisible] = useState(false);

  // Load from localStorage on mount
  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      setKey(stored);
      setSaved(true);
      onKeyChange(stored);
    }
  }, [onKeyChange]);

  const handleSave = () => {
    if (key.trim().length === 0) return;
    localStorage.setItem(STORAGE_KEY, key.trim());
    setSaved(true);
    onKeyChange(key.trim());
  };

  const handleClear = () => {
    localStorage.removeItem(STORAGE_KEY);
    setKey('');
    setSaved(false);
    onKeyChange(null);
  };

  if (saved) {
    return (
      <div className="flex items-center gap-2 text-xs">
        <span className="text-green-400">API key set</span>
        <span className="text-gray-600">({key.slice(0, 8)}...)</span>
        <button
          onClick={handleClear}
          className="text-gray-500 hover:text-red-400 transition-colors underline"
        >
          clear
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-xs font-semibold text-gray-400 uppercase tracking-wide">
        OpenRouter API Key
      </label>
      <div className="flex gap-1.5">
        <input
          type={isVisible ? 'text' : 'password'}
          value={key}
          onChange={(e) => setKey(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSave()}
          placeholder="sk-or-..."
          className="flex-1 bg-gray-900 border border-gray-700 rounded-md px-2 py-1.5 text-xs text-white placeholder-gray-600 focus:outline-none focus:ring-1 focus:ring-cyan-500"
        />
        <button
          onClick={() => setIsVisible(!isVisible)}
          className="px-2 py-1.5 bg-gray-800 hover:bg-gray-700 rounded-md text-xs text-gray-400 transition-colors"
        >
          {isVisible ? 'Hide' : 'Show'}
        </button>
        <button
          onClick={handleSave}
          disabled={key.trim().length === 0}
          className="px-3 py-1.5 bg-cyan-600 hover:bg-cyan-500 disabled:bg-gray-700 disabled:text-gray-500 rounded-md text-xs font-semibold transition-colors"
        >
          Save
        </button>
      </div>
      <a
        href="https://openrouter.ai/keys"
        target="_blank"
        rel="noopener noreferrer"
        className="text-[10px] text-gray-600 hover:text-gray-400 transition-colors"
      >
        Get a key at openrouter.ai/keys
      </a>
    </div>
  );
}
