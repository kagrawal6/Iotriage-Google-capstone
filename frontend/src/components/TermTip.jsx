import { useId } from "react";

/**
 * Plain-language glossary for security terms shown in the UI.
 * Used with hover/focus tooltips so non-technical users can learn without clutter.
 */
export const TERM_HELP = {
  CVE: "A public ID for one specific security flaw (for example CVE-2021-12345). It lets everyone refer to the same issue when reading advisories and patches.",
  CPE: "The standard way to name a product and version from your scan. IoTriage uses these names (CPEs) to look up which flaws might apply.",
  NVD: "The National Vulnerability Database: a U.S. government catalog of CVE records, including descriptions and severity scores used in this app.",
};

/**
 * Inline term with a compact tooltip on hover or keyboard focus.
 * @param {"default"|"onDark"} variant - Use onDark on dark backgrounds (e.g. hero).
 */
export default function TermTip({ term, children, variant = "default" }) {
  const tipId = useId();
  const text = TERM_HELP[term];
  if (!text) return children;

  const btnStyles =
    variant === "onDark"
      ? "border-white/45 text-slate-200 hover:border-white/80 hover:text-white focus-visible:ring-white/35 focus-visible:ring-offset-slate-900"
      : "border-slate-400 text-inherit hover:border-slate-600 hover:text-slate-800 focus-visible:ring-blue-500/40";

  return (
    <span className="group relative inline align-baseline">
      <button
        type="button"
        className={`mx-px cursor-help border-b border-dotted bg-transparent p-0 underline-offset-2 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-1 rounded-sm ${btnStyles}`}
        aria-describedby={tipId}
      >
        {children}
      </button>
      <span
        id={tipId}
        role="tooltip"
        className="pointer-events-none invisible absolute bottom-full left-1/2 z-50 mb-1.5 w-[min(16rem,calc(100vw-2rem))] -translate-x-1/2 rounded-md border border-slate-700 bg-slate-900 px-2.5 py-2 text-left text-[11px] leading-snug text-slate-100 opacity-0 shadow-lg transition-opacity duration-150 group-hover:visible group-hover:opacity-100 group-focus-within:visible group-focus-within:opacity-100"
      >
        {text}
      </span>
    </span>
  );
}
