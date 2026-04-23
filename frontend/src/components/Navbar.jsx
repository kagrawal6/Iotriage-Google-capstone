import { NavLink } from "react-router-dom";
import { useScan } from "../context/ScanContext";

export default function Navbar() {
  const { scanResults, scanHistory } = useScan();

  const linkClass = (tone) => ({ isActive }) => {
    const tones = {
      blue: isActive
        ? "text-[#1a73e8] bg-blue-50 font-semibold"
        : "text-slate-600 hover:text-[#1a73e8] hover:bg-blue-50/70",
      green: isActive
        ? "text-[#188038] bg-emerald-50 font-semibold"
        : "text-slate-600 hover:text-[#188038] hover:bg-emerald-50/80",
      yellow: isActive
        ? "text-[#f9ab00] bg-amber-50 font-semibold"
        : "text-slate-600 hover:text-[#f9ab00] hover:bg-amber-50",
      red: isActive
        ? "text-[#d93025] bg-red-50 font-semibold"
        : "text-slate-600 hover:text-[#d93025] hover:bg-red-50/80",
    };
    return `px-3 py-1.5 text-sm rounded-md transition-colors ${tones[tone]}`;
  };

  return (
    <nav className="border-b border-gray-300 bg-white sticky top-0 z-50">
      <div className="max-w-5xl mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center gap-2">
            <NavLink to="/" className="inline-flex items-center gap-0 text-base font-bold text-[#1a73e8] leading-none">
              <svg
                className="w-16 h-16 shrink-0"
                viewBox="0 0 24 24"
                aria-hidden="true"
                focusable="false"
              >
                <path d="M12 2l7 4v5c0 5.1-3.1 8.4-7 9-3.9-.6-7-3.9-7-9V6z" fill="white" />
                <path d="M12 4.1l5.6 3.2v3.8c0 3.9-2.3 6.5-5.6 7.2z" fill="#4285F4" />
                <path d="M12 4.1L6.4 7.3v3.8c0 3.9 2.3 6.5 5.6 7.2z" fill="#0F9D58" />
                <path d="M9 9.2h6L12 14z" fill="#FBBC05" />
              </svg>
              IoTriage
            </NavLink>
            <span className="hidden sm:inline-flex items-center gap-1 text-[11px] text-slate-900 leading-none translate-y-[1px]">
              <span>By</span>
              <span className="font-semibold tracking-[0.01em]">
                <span className="text-[#4285F4]">G</span>
                <span className="text-[#DB4437]">o</span>
                <span className="text-[#F4B400]">o</span>
                <span className="text-[#4285F4]">g</span>
                <span className="text-[#0F9D58]">l</span>
                <span className="text-[#DB4437]">e</span>
              </span>
              <span>Capstone Group '26</span>
            </span>
          </div>

          <div className="flex items-center gap-1">
            <NavLink to="/" className={linkClass("blue")}>
              Home
            </NavLink>
            <NavLink to="/upload" className={linkClass("green")}>
              Upload
            </NavLink>
            {scanHistory.length > 0 && (
              <NavLink to="/history" className={linkClass("yellow")}>
                History
                {scanHistory.length > 0 && (
                  <span className="ml-1 text-xs text-gray-400">
                    ({scanHistory.length})
                  </span>
                )}
              </NavLink>
            )}
            {scanResults && (
              <>
                <NavLink to="/results" className={linkClass("red")}>
                  Results
                </NavLink>
                <NavLink to="/chat" className={linkClass("blue")}>
                  Chat
                </NavLink>
              </>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}