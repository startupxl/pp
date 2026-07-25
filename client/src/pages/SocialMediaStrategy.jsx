import { useEffect, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import Layout from "../components/Layout";
import Icon from "../components/Icon";
import { api } from "../api";

function defaultData() {
  return {
    channels: [
      { id: "ch1", name: "X (Twitter)", purpose: "Real-time thought leadership & industry debate.", audience: "Founders, Tech-Twitter", mapped: true },
      { id: "ch2", name: "LinkedIn", purpose: "B2B networking, case studies, corporate branding.", audience: "Enterprise Clients", mapped: true },
      { id: "ch3", name: "YouTube / TikTok", purpose: "Educational deep-dives and personality-driven content.", audience: "Unmapped", mapped: false },
    ],
    voiceBalance: 65,
    pillars: [
      { id: "p1", name: "Cognitive Flow", description: "Deep work techniques and AI as a co-pilot." },
      { id: "p2", name: "The Builder's Log", description: "Transparent updates on product development." },
      { id: "p3", name: "Market Insights", description: "Trends in solopreneurship and high-growth SaaS." },
    ],
    postingFrequency: 3,
    videoRatio: 40,
    communityReplies: "high",
  };
}

// Deterministic heuristic — no external LLM call.
function analyzeSocial(data) {
  const channels = data.channels || [];
  const mappedCount = channels.filter((c) => c.mapped).length;
  const mappedPct = channels.length ? (mappedCount / channels.length) * 100 : 0;
  const freq = Number(data.postingFrequency) || 0;
  const videoRatio = Number(data.videoRatio) || 0;
  // Deterministic projection formula
  const projectedReach = Math.round((80 + freq * 12 + videoRatio * 0.6) * 1000);
  const engagementRate = Math.round((2 + freq * 0.3 + videoRatio * 0.02) * 10) / 10;
  const pillarCount = (data.pillars || []).length;
  let readiness = "Early Stage";
  if (mappedPct >= 80 && pillarCount >= 3) readiness = "Launch Ready";
  else if (mappedPct >= 50) readiness = "Building Momentum";
  return { mappedCount, mappedPct, projectedReach, engagementRate, pillarCount, readiness };
}

export default function SocialMediaStrategy() {
  const { id } = useParams();
  const [doc, setDoc] = useState(null);
  const [title, setTitle] = useState("");
  const [saveState, setSaveState] = useState("Saved");
  const [draftPillar, setDraftPillar] = useState({ name: "", description: "" });
  const saveTimer = useRef(null);

  useEffect(() => {
    api.getDocument(id).then((d) => {
      setDoc({ ...d, data: { ...defaultData(), ...(d.data || {}) } });
      setTitle(d.title);
    });
  }, [id]);

  function scheduleSave(patch) {
    setSaveState("Saving...");
    clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(async () => {
      await api.updateDocument(id, patch);
      setSaveState("Saved");
    }, 500);
  }

  function updateData(patch) {
    setDoc((d) => {
      const data = { ...d.data, ...patch };
      scheduleSave({ data });
      return { ...d, data };
    });
  }

  function onTitleBlur() {
    if (doc && title !== doc.title) scheduleSave({ title });
  }

  if (!doc) {
    return (
      <Layout>
        <div className="p-10 text-on-surface-variant">Loading social media strategy…</div>
      </Layout>
    );
  }

  const data = doc.data;
  const analysis = analyzeSocial(data);

  function toggleMapped(cid) {
    updateData({ channels: data.channels.map((c) => (c.id === cid ? { ...c, mapped: !c.mapped } : c)) });
  }

  function addPillar() {
    if (!draftPillar.name.trim()) return;
    updateData({ pillars: [...data.pillars, { id: `p${Date.now()}`, ...draftPillar }] });
    setDraftPillar({ name: "", description: "" });
  }

  function removePillar(pid) {
    updateData({ pillars: data.pillars.filter((p) => p.id !== pid) });
  }

  return (
    <Layout>
      <div className="max-w-[1500px] mx-auto px-8 py-8">
        <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
          <div>
            <div className="text-xs font-semibold uppercase text-secondary mb-1">Social Media Strategy Lab</div>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              onBlur={onTitleBlur}
              className="text-2xl font-bold tracking-tight bg-transparent outline-none border-b border-transparent focus:border-outline-variant"
            />
          </div>
          <span className="text-sm text-on-surface-variant">{saveState}</span>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 mb-6">
          <div className="lg:col-span-8 bg-white rounded-2xl p-6 border border-outline-variant shadow-sm">
            <div className="flex justify-between items-center mb-6">
              <h3 className="font-bold text-primary flex items-center gap-2"><Icon name="hub" className="text-secondary" /> Channel Selection</h3>
              <span className="text-xs text-on-surface-variant">{analysis.mappedCount}/{data.channels.length} mapped</span>
            </div>
            <div className="space-y-3">
              {data.channels.map((c) => (
                <div
                  key={c.id}
                  onClick={() => toggleMapped(c.id)}
                  className={`flex items-center gap-4 p-4 rounded-xl cursor-pointer transition-colors ${c.mapped ? "bg-surface-container-low" : "hover:bg-surface-container-low"}`}
                >
                  <div className="w-12 h-12 rounded-full bg-primary/5 flex items-center justify-center text-primary shrink-0">
                    <Icon name="podcasts" />
                  </div>
                  <div className="flex-1">
                    <p className="font-medium text-primary text-sm">{c.name}</p>
                    <p className="text-xs text-on-surface-variant">{c.purpose}</p>
                  </div>
                  <span className="text-xs text-on-surface-variant font-medium">{c.audience}</span>
                  <Icon name={c.mapped ? "check_circle" : "add_circle"} className={c.mapped ? "text-secondary" : "text-outline-variant"} filled={c.mapped} />
                </div>
              ))}
            </div>
          </div>

          <div className="lg:col-span-4 bg-white rounded-2xl p-6 border border-outline-variant shadow-sm">
            <h3 className="font-bold text-primary mb-6">Voice & Tone</h3>
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm font-medium">Professional vs. Personal</label>
              <span className="text-xs text-secondary font-bold">{data.voiceBalance}%</span>
            </div>
            <input
              type="range"
              min={0}
              max={100}
              value={data.voiceBalance}
              onChange={(e) => updateData({ voiceBalance: Number(e.target.value) })}
              className="w-full accent-secondary mb-6"
            />
            <div className="p-3 rounded-xl bg-surface-container-low border-l-4 border-secondary">
              <p className="text-xs text-on-surface-variant italic">
                {data.voiceBalance >= 60
                  ? "Personal, story-driven tone — good for founder-led brands."
                  : "Polished, professional tone — good for enterprise trust-building."}
              </p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-7 bg-white rounded-2xl p-6 border border-outline-variant shadow-sm">
            <h3 className="font-bold text-primary mb-6 flex items-center gap-2"><Icon name="dashboard_customize" className="text-secondary" /> Content Pillars</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
              {data.pillars.map((p) => (
                <div key={p.id} className="group relative p-4 rounded-xl border border-outline-variant hover:border-secondary transition-all">
                  <button onClick={() => removePillar(p.id)} className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 text-on-surface-variant hover:text-error">
                    <Icon name="close" className="text-[16px]" />
                  </button>
                  <h4 className="font-semibold text-primary mb-1 text-sm">{p.name}</h4>
                  <p className="text-xs text-on-surface-variant">{p.description}</p>
                </div>
              ))}
            </div>
            <div className="flex gap-2 pt-4 border-t border-outline-variant/30">
              <input value={draftPillar.name} onChange={(e) => setDraftPillar((v) => ({ ...v, name: e.target.value }))} placeholder="Pillar name" className="flex-1 text-sm border border-outline-variant rounded-md px-2 py-1.5 outline-none focus:border-secondary" />
              <input value={draftPillar.description} onChange={(e) => setDraftPillar((v) => ({ ...v, description: e.target.value }))} placeholder="Description" className="flex-1 text-sm border border-outline-variant rounded-md px-2 py-1.5 outline-none focus:border-secondary" />
              <button onClick={addPillar} className="px-3 bg-primary text-white rounded-md"><Icon name="add" className="text-[16px]" /></button>
            </div>
          </div>

          <div className="lg:col-span-5 bg-white rounded-2xl p-6 border border-outline-variant shadow-sm">
            <h3 className="font-bold text-primary mb-6 flex items-center gap-2"><Icon name="query_stats" className="text-secondary" /> Engagement Forecast</h3>
            <div className="flex items-center gap-6 mb-6">
              <div className="text-center flex-1">
                <p className="text-[10px] font-bold text-on-surface-variant uppercase">Projected Reach</p>
                <p className="text-xl font-bold text-primary">{(analysis.projectedReach / 1000).toFixed(1)}k</p>
              </div>
              <div className="text-center flex-1">
                <p className="text-[10px] font-bold text-on-surface-variant uppercase">Avg. Engagement</p>
                <p className="text-xl font-bold text-primary">{analysis.engagementRate}%</p>
              </div>
            </div>
            <div className="space-y-5">
              <div>
                <div className="flex justify-between mb-2 text-xs font-bold text-on-surface-variant">
                  <span>POSTING FREQUENCY</span>
                  <span className="text-primary">{data.postingFrequency}/day</span>
                </div>
                <input type="range" min={1} max={10} value={data.postingFrequency} onChange={(e) => updateData({ postingFrequency: Number(e.target.value) })} className="w-full accent-secondary" />
              </div>
              <div>
                <div className="flex justify-between mb-2 text-xs font-bold text-on-surface-variant">
                  <span>VIDEO RATIO</span>
                  <span className="text-primary">{data.videoRatio}%</span>
                </div>
                <input type="range" min={0} max={100} value={data.videoRatio} onChange={(e) => updateData({ videoRatio: Number(e.target.value) })} className="w-full accent-secondary" />
              </div>
              <div>
                <div className="flex justify-between mb-2 text-xs font-bold text-on-surface-variant">
                  <span>COMMUNITY REPLIES</span>
                </div>
                <div className="flex gap-2">
                  {["low", "high"].map((v) => (
                    <button
                      key={v}
                      onClick={() => updateData({ communityReplies: v })}
                      className={`flex-1 py-2 text-xs font-bold border rounded ${data.communityReplies === v ? "bg-secondary text-white border-secondary" : "bg-white hover:border-secondary"}`}
                    >
                      {v === "low" ? "Low" : "High"}
                    </button>
                  ))}
                </div>
              </div>
            </div>
            <div className="mt-6 pt-4 border-t border-outline-variant/30 text-xs text-on-surface-variant">
              Readiness: <strong className="text-primary">{analysis.readiness}</strong>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}
