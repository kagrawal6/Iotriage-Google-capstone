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
        <div className="flex items-center justify-between h-12">
          <NavLink to="/" className="text-base font-bold text-[#1a73e8]">
            IoTriage
          </NavLink>

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