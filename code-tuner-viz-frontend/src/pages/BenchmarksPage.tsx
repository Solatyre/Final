import React from "react";
import { createMetricsApi } from "../features/metrics/api";
import { CodeBlock } from "../shared/ui/CodeBlock";
import { Card } from "../shared/ui/Card";

export function BenchmarksPage() {
  const api = React.useMemo(() => createMetricsApi(), []);
  const [rows, setRows] = React.useState<
    { project: string; avgComplexity: number; avgClassSize: number }[]
  >([]);
  const [loading, setLoading] = React.useState(true);
  const [showJson, setShowJson] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    let alive = true;
    (async () => {
      try {
        setError(null);
        const d = await api.getBenchmarks();
        if (alive) setRows(d);
      } catch (e) {
        if (alive) setError(e instanceof Error ? e.message : "Failed to load benchmarks");
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, [api]);

  const json = JSON.stringify(rows, null, 2);

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
      <Card
        title="Benchmark table"
        subtitle="Compare repositories using the latest commit snapshot."
      >
        {loading ? (
          <p className="text-sm text-zinc-600">Loading…</p>
        ) : error ? (
          <p className="text-sm text-red-600">{error}</p>
        ) : rows.length === 0 ? (
          <p className="text-sm text-zinc-600">No benchmark rows returned.</p>
        ) : (
          <div className="overflow-hidden rounded-xl border">
            <table className="w-full border-collapse text-sm">
              <thead className="bg-zinc-50">
                <tr>
                  <th className="px-4 py-3 text-left font-medium text-zinc-700">Project</th>
                  <th className="px-4 py-3 text-right font-medium text-zinc-700">Avg Complexity</th>
                  <th className="px-4 py-3 text-right font-medium text-zinc-700">Avg Class Size</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.project} className="border-t">
                    <td className="px-4 py-3 text-zinc-900">{r.project}</td>
                    <td className="px-4 py-3 text-right tabular-nums text-zinc-900">
                      {r.avgComplexity.toFixed(2)}
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums text-zinc-900">
                      {r.avgClassSize.toFixed(0)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <Card
        title="JSON output"
        subtitle="This is what your backend returns."
        right={
          <button
            onClick={() => setShowJson((s) => !s)}
            className="rounded-full border bg-white px-3 py-1.5 text-sm text-zinc-700 hover:bg-zinc-50"
          >
            {showJson ? "Hide" : "Show"}
          </button>
        }
      >
        {showJson ? (
          <CodeBlock language="json" code={json || "[]"} />
        ) : (
          <p className="text-sm text-zinc-600">Hidden.</p>
        )}
      </Card>
    </div>
  );
}
