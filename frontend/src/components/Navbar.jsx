import { NavLink } from "react-router-dom";
import { useScan } from "../context/ScanContext";

export default function Navbar() {
  const { scanResults, scanHistory } = useScan();

  const linkClass = ({ isActive }) =>
    `px-3 py-1 text-sm ${
      isActive
        ? "font-bold underline"
        : "text-gray-600 hover:text-black hover:underline"
    }`;

  return (
    <nav className="border-b border-gray-300 bg-white sticky top-0 z-50">
      <div className="max-w-5xl mx-auto px-4">
        <div className="flex items-center justify-between h-12">
          <NavLink to="/" className="text-base font-bold text-black">
            IoTriage
          </NavLink>

          <div className="flex items-center gap-1">
            <NavLink to="/" className={linkClass}>
              Home
            </NavLink>
            <NavLink to="/upload" className={linkClass}>
              Upload
            </NavLink>
            {scanHistory.length > 0 && (
              <NavLink to="/history" className={linkClass}>
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
                <NavLink to="/results" className={linkClass}>
                  Results
                </NavLink>
                <NavLink to="/chat" className={linkClass}>
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