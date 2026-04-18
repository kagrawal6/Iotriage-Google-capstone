import { Routes, Route } from "react-router-dom";
import Navbar from "./components/Navbar";
import HomePage from "./pages/HomePage";
import UploadPage from "./pages/UploadPage";
import ResultsPage from "./pages/ResultsPage";
import ChatPage from "./pages/ChatPage";
import ScanHistoryPage from "./pages/ScanHistoryPage";
import DeviceDetailPage from "./pages/DeviceDetailPage";

export default function App() {
  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <main className="flex-1">
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/upload" element={<UploadPage />} />
          <Route path="/results" element={<ResultsPage />} />
          <Route path="/results/device/:ip" element={<DeviceDetailPage />} />
          <Route path="/chat" element={<ChatPage />} />
          <Route path="/history" element={<ScanHistoryPage />} />
        </Routes>
      </main>
    </div>
  );
}
