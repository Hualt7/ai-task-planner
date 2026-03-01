'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import type { PlanHistoryRow } from '@/lib/supabase';

export default function HistoryPage() {
  const [history, setHistory] = useState<PlanHistoryRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/history')
      .then((res) => res.json())
      .then((data) => {
        if (data.error) {
          setError(data.error);
        } else {
          setHistory(data.history || []);
        }
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="min-h-screen bg-[#0a0a0f] text-white">
      {/* Header */}
      <header className="h-14 border-b border-gray-800 flex items-center px-6">
        <Link href="/playground" className="text-lg font-bold tracking-tight hover:opacity-80 transition-opacity">
          <span className="text-cyan-400">AI</span> Task Planner
        </Link>
        <span className="ml-3 text-xs text-gray-500 font-mono">Plan History</span>
        <Link
          href="/playground"
          className="ml-auto text-xs text-cyan-400 hover:text-cyan-300 transition-colors"
        >
          ← Back to Playground
        </Link>
      </header>

      <div className="max-w-4xl mx-auto p-6">
        <h2 className="text-lg font-semibold mb-6">Recent Plans</h2>

        {loading && (
          <div className="text-gray-500 text-sm">Loading history...</div>
        )}

        {error && (
          <div className="bg-red-900/50 border border-red-800 rounded-md p-4 text-sm text-red-300">
            {error}
          </div>
        )}

        {!loading && history.length === 0 && !error && (
          <div className="text-gray-500 text-sm">
            No plans yet. Go to the{' '}
            <Link href="/playground" className="text-cyan-400 hover:underline">
              playground
            </Link>{' '}
            and generate some plans!
          </div>
        )}

        <div className="space-y-3">
          {history.map((row) => (
            <div
              key={row.id}
              className="bg-[#0a0a1a] border border-gray-800 rounded-lg p-4 hover:border-gray-700 transition-colors"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-white truncate">
                    &ldquo;{row.task}&rdquo;
                  </p>
                  {row.reasoning && (
                    <p className="text-xs text-gray-400 mt-1 line-clamp-2 italic">
                      {row.reasoning}
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {row.validation_passed ? (
                    <span className="text-[10px] px-2 py-0.5 bg-green-900/50 text-green-400 rounded-full font-mono">
                      valid
                    </span>
                  ) : (
                    <span className="text-[10px] px-2 py-0.5 bg-red-900/50 text-red-400 rounded-full font-mono">
                      failed
                    </span>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-4 mt-3 text-[10px] text-gray-600 font-mono">
                <span>{row.model}</span>
                {row.token_usage != null && typeof row.token_usage === 'object' ? (
                  <span>{(row.token_usage as { totalTokens?: number }).totalTokens ?? 0} tokens</span>
                ) : null}
                <span>
                  {Array.isArray(row.plan) ? row.plan.length : 0} actions
                </span>
                <span className="ml-auto">
                  {new Date(row.created_at).toLocaleString()}
                </span>
              </div>

              {!row.validation_passed && row.validation_error && (
                <div className="mt-2 text-[10px] text-red-400 font-mono bg-red-900/20 rounded px-2 py-1">
                  {row.validation_error}
                </div>
              )}

              {row.validation_passed && Array.isArray(row.plan) && (
                <div className="mt-2 flex flex-wrap gap-1">
                  {(row.plan as Array<{ action: string; args: Record<string, string> }>).map(
                    (step, i) => (
                      <span
                        key={i}
                        className="text-[10px] px-1.5 py-0.5 bg-gray-800 text-gray-400 rounded font-mono"
                      >
                        {step.action}(
                        {Object.values(step.args).join(', ')})
                      </span>
                    )
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
