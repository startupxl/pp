import { useState } from "react";
import Icon from "./Icon";
import { getFrameworkGuide } from "../frameworkGuides";

/**
 * Compact, collapsible "what / when / how" guidance block for a framework.
 * Looks up content from frameworkGuides.js by tool key — no AI call, just
 * static authored copy so every framework has an answer to "how do I use this".
 */
export default function FrameworkGuide({ toolKey, defaultOpen = false, className = "" }) {
  const [open, setOpen] = useState(defaultOpen);
  const guide = getFrameworkGuide(toolKey);
  if (!guide) return null;

  return (
    <div className={`border border-outline-variant rounded-lg bg-surface-container-low/40 ${className}`}>
      <button
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center gap-2 px-4 py-2.5 text-left"
        type="button"
      >
        <Icon name="help" className="text-secondary text-[18px]" />
        <span className="text-sm font-semibold text-primary flex-1">How to use this framework</span>
        <Icon name={open ? "expand_less" : "expand_more"} className="text-on-surface-variant text-[20px]" />
      </button>
      {open && (
        <div className="px-4 pb-4 space-y-3 text-sm">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-wider text-on-surface-variant mb-1">What it is</p>
            <p className="text-on-surface-variant">{guide.whatItIs}</p>
          </div>
          <div>
            <p className="text-[11px] font-bold uppercase tracking-wider text-on-surface-variant mb-1">When to use it</p>
            <p className="text-on-surface-variant">{guide.whenToUse}</p>
          </div>
          <div>
            <p className="text-[11px] font-bold uppercase tracking-wider text-on-surface-variant mb-1">How to fill it out</p>
            <p className="text-on-surface-variant">{guide.howTo}</p>
          </div>
        </div>
      )}
    </div>
  );
}
