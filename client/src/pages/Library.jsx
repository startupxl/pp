import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import Layout from "../components/Layout";
import Icon from "../components/Icon";
import { api } from "../api";
import { startFrameworkSession } from "../startTool";

const CATEGORIES = [
  { label: "All Frameworks", icon: "grid_view" },
  { label: "Problem Solving", icon: "neurology" },
  { label: "Strategy", icon: "auto_awesome" },
  { label: "Narrative", icon: "chat_bubble" },
  { label: "Leadership", icon: "groups" },
];

const COMPLEXITIES = ["Beginner", "Intermediate", "Advanced"];

const complexityColor = {
  Beginner: "bg-emerald-500",
  Intermediate: "bg-amber-500",
  Advanced: "bg-red-500",
};

export default function Library() {
  const navigate = useNavigate();
  const [frameworks, setFrameworks] = useState([]);
  const [total, setTotal] = useState(0);
  const [category, setCategory] = useState("All Frameworks");
  const [complexity, setComplexity] = useState(null);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    const params = {};
    if (category !== "All Frameworks") params.category = category;
    if (complexity) params.complexity = complexity;
    if (search) params.q = search;
    api
      .getFrameworks(params)
      .then((res) => {
        setFrameworks(res.frameworks);
        setTotal(res.total);
      })
      .finally(() => setLoading(false));
  }, [category, complexity, search]);

  async function openFramework(framework) {
    await startFrameworkSession(navigate, framework);
  }

  return (
    <Layout>
      <div className="max-w-[1500px] mx-auto px-8 py-10 grid grid-cols-1 md:grid-cols-[220px_1fr] gap-10">
        <aside>
          <div className="text-xs font-semibold tracking-wide text-on-surface-variant mb-3">
            CATEGORIES
          </div>
          <div className="flex flex-col gap-1 mb-8">
            {CATEGORIES.map((c) => (
              <button
                key={c.label}
                onClick={() => setCategory(c.label)}
                className={`flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium text-left ${
                  category === c.label
                    ? "bg-secondary-container text-on-secondary-container"
                    : "text-on-surface-variant hover:bg-surface-container"
                }`}
              >
                <Icon name={c.icon} className="text-[18px]" />
                {c.label}
              </button>
            ))}
          </div>

          <div className="text-xs font-semibold tracking-wide text-on-surface-variant mb-3">
            FILTERS
          </div>
          <div className="text-sm mb-2">Complexity</div>
          <div className="flex flex-wrap gap-2">
            {COMPLEXITIES.map((c) => (
              <button
                key={c}
                onClick={() => setComplexity(complexity === c ? null : c)}
                className={`px-3 py-1.5 rounded-full text-xs font-medium ${
                  complexity === c
                    ? "bg-primary text-white"
                    : "bg-surface-container text-on-surface-variant"
                }`}
              >
                {c}
              </button>
            ))}
          </div>

          <div className="mt-10 bg-primary text-white rounded-lg p-5">
            <div className="font-semibold mb-1">Pro Access</div>
            <p className="text-sm text-white/70 mb-4">
              Unlock 50+ advanced mental models and templates.
            </p>
            <button className="bg-secondary-container text-on-secondary-container w-full rounded-md py-2 text-sm font-semibold">
              Upgrade Now
            </button>
          </div>
        </aside>

        <div>
          <div className="flex items-start justify-between mb-6 gap-6 flex-wrap">
            <div>
              <h1 className="text-3xl font-bold tracking-tight">Framework Library</h1>
              <p className="text-on-surface-variant mt-1 max-w-xl">
                A curated collection of cognitive architectures designed to help you think
                clearer, act faster, and lead better.
              </p>
            </div>
            <div className="text-secondary font-semibold text-sm shrink-0">
              {total} Frameworks Available
            </div>
          </div>

          <div className="flex items-center gap-2 bg-white border border-outline-variant rounded-md px-4 py-2.5 mb-6 max-w-md">
            <Icon name="search" className="text-outline text-[20px]" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search frameworks (e.g. SWOT, First Principles)"
              className="outline-none text-sm w-full bg-transparent"
            />
          </div>

          {loading ? (
            <div className="text-on-surface-variant">Loading frameworks…</div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-5">
              {frameworks.map((f) =>
                f.isNew ? (
                  <div
                    key={f.id}
                    className="sm:col-span-2 rounded-xl overflow-hidden bg-gradient-to-br from-primary-container to-tertiary text-white p-6 flex flex-col justify-between min-h-[260px]"
                  >
                    <div>
                      <span className="inline-block bg-secondary-container text-on-secondary-container text-xs font-semibold px-3 py-1 rounded-full mb-4">
                        NEW FRAMEWORK
                      </span>
                      <h3 className="text-2xl font-bold mb-2">{f.name}</h3>
                      <p className="text-white/80 text-sm max-w-lg">{f.description}</p>
                    </div>
                    <div className="flex items-center justify-between mt-6">
                      <div className="flex items-center gap-4 text-sm text-white/70">
                        <span className="flex items-center gap-1">
                          <span
                            className={`w-2 h-2 rounded-full ${complexityColor[f.complexity]}`}
                          />
                          {f.complexity}
                        </span>
                        <span className="flex items-center gap-1">
                          <Icon name="schedule" className="text-[16px]" />
                          {f.readTime}
                        </span>
                      </div>
                      <button
                        onClick={() => openFramework(f)}
                        className="bg-white text-primary font-semibold px-4 py-2 rounded-md text-sm"
                      >
                        Start Workshop
                      </button>
                    </div>
                  </div>
                ) : (
                  <div
                    key={f.id}
                    className="bg-white border border-outline-variant rounded-xl p-6 flex flex-col"
                  >
                    <div className="flex items-start justify-between mb-4">
                      <div className="w-10 h-10 rounded-md bg-secondary-container flex items-center justify-center">
                        <Icon name="psychology" className="text-secondary text-[20px]" />
                      </div>
                      <span className="text-xs font-semibold uppercase text-secondary bg-secondary-container/40 px-2 py-1 rounded">
                        {f.tag}
                      </span>
                    </div>
                    <div className="font-bold text-lg mb-2">{f.name}</div>
                    <p className="text-sm text-on-surface-variant flex-1 mb-4">
                      {f.description}
                    </p>
                    <div className="flex items-center justify-between">
                      <span className="flex items-center gap-1 text-xs text-on-surface-variant">
                        <span
                          className={`w-2 h-2 rounded-full ${complexityColor[f.complexity]}`}
                        />
                        {f.complexity}
                      </span>
                      <button
                        onClick={() => openFramework(f)}
                        className="text-secondary text-sm font-semibold hover:underline"
                      >
                        {f.workshop ? "Start Workshop" : "View Guide"} →
                      </button>
                    </div>
                  </div>
                )
              )}
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
}
