import { NavLink } from "react-router-dom";
import { useScan } from "../context/ScanContext";

export default function Navbar() {
  const { scanResults } = useScan();

  const linkClass = ({ isActive }) =>
    `px-3 py-1 text-sm rounded-full ${
      isActive
        ? "font-medium text-[#1a73e8] bg-[#e8f0fe]"
        : "text-gray-700 hover:text-[#1a73e8] hover:bg-[#e8f0fe]"
    }`;

  return (
    <nav className="border-b border-gray-200 bg-white/95 backdrop-blur sticky top-0 z-50 shadow-sm">
      <div className="max-w-5xl mx-auto px-4">
        <div className="flex items-center justify-between h-14">
          <NavLink
            to="/"
            className="text-base font-bold text-[#202124]"
          >
            IoTriage
          </NavLink>

          <div className="flex items-center gap-1">
            <NavLink to="/" className={linkClass}>
              Home
            </NavLink>
            <NavLink to="/upload" className={linkClass}>
              Upload
            </NavLink>
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
