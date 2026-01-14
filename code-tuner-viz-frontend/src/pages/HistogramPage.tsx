import React from "react";
import { createMetricsApi } from "../features/metrics/api";
import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

type Bucket = { label: string; count: number };
type BenchRow = { project: string; avgComplexity: number; avgClassSize: number };
type CompareRow = { label: string; A: number; B?: number };

function mergeBuckets(a: Bucket[], b?: Bucket[]): CompareRow[] {
  const wanted = ["0-2", "3-5", "6-8", "9-12", "13+"];
  const mapA = new Map(a.map((x) => [x.label, x.count]));
  const mapB = new Map((b ?? []).map((x) => [x.label, x.count]));
  return wanted.map((label) => ({
    label,
    A: mapA.get(label) ?? 0,
    B: b ? (mapB.get(label) ?? 0) : undefined,
  }));
}

export function HistogramPage() {
  const api = React.useMemo(() => createMetricsApi(), []);

  const [projects, setProjects] = React.useState<string[]>([]);
  const [projectA, setProjectA] = React.useState<string>("");
  const [compare, setCompare] = React.useState(false);
  const [projectB, setProjectB] = React.useState<string>("");

  const [rows, setRows] = React.useState<CompareRow[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  // Load project list from existing benchmarks endpoint
  React.useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const b = (await api.getBenchmarks()) as BenchRow[];
        const list = b.map((x) => x.project).filter(Boolean);
        if (!alive) return;
        setProjects(list);
        if (!projectA && list.length) setProjectA(list[0]);
      } catch (e) {
        if (!alive) return;
        setError(e instanceof Error ? e.message : "Failed to load projects");
      }
    })();
    return () => {
      alive = false;
    };
  }, [api, projectA]);

  // Load histogram(s)
  React.useEffect(() => {
    let alive = true;
    (async () => {
      try {
        setLoading(true);
        setError(null);

        const a = await api.getComplexityHistogram(projectA || undefined);

        if (compare && projectB) {
          const b = await api.getComplexityHistogram(projectB);
          if (alive) setRows(mergeBuckets(a, b));
        } else {
          if (alive) setRows(mergeBuckets(a));
        }
      } catch (e) {
        if (alive) setError(e instanceof Error ? e.message : "Failed to load histogram");
      } finally {
        if (alive) setLoading(false);
      }
    })();

    return () => {
      alive = false;
    };
  }, [api, projectA, compare, projectB]);

  return (
    <div className="card">
      <h2>Complexity Histogram</h2>
      <p className="small">
        Buckets are fixed bands (0–2, 3–5, 6–8, 9–12, 13+). Use the project selector to change what data is bucketed.
      </p>

      <div style={{ display: "flex", gap: 12, flexWrap: "wrap", alignItems: "center", marginBottom: 12 }}>
        <label className="small" style={{ display: "flex", gap: 8, alignItems: "center" }}>
          Project
          <select value={projectA} onChange={(e) => setProjectA(e.target.value)}>
            {projects.map((p) => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
          </select>
        </label>

        <label className="small" style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <input
            type="checkbox"
            checked={compare}
            onChange={(e) => {
              setCompare(e.target.checked);
              if (!e.target.checked) setProjectB("");
            }}
          />
          Compare
        </label>

        {compare && (
          <label className="small" style={{ display: "flex", gap: 8, alignItems: "center" }}>
            Against
            <select value={projectB} onChange={(e) => setProjectB(e.target.value)}>
              <option value="">Select…</option>
              {projects
                .filter((p) => p !== projectA)
                .map((p) => (
                  <option key={p} value={p}>
                    {p}
                  </option>
                ))}
            </select>
          </label>
        )}
      </div>

      {loading && <p>Loading</p>}
      {error && <p style={{ color: "crimson" }}>{error}</p>}

      {!loading && !error && (
        <>
          <div className="chartBox">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={rows} margin={{ left: 8, right: 18, top: 6, bottom: 6 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="label" tickMargin={8} />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="A" name={projectA || "A"} />
                {compare && projectB ? <Bar dataKey="B" name={projectB} /> : null}
              </BarChart>
            </ResponsiveContainer>
          </div>

          <p className="small">Buckets: {rows.length}</p>
        </>
      )}
    </div>
  );
}
