import { createContext, useContext, useState } from "react";
import useStorage from "../storage/useStorage";

/**
 * ScanContext
 * -----------
 * Shared state for scan results across pages.
 * After upload, devices + vulnerabilities are stored here
 * so the Results and Chat pages can consume them.
 */
const ScanContext = createContext(null);

export function ScanProvider({ children }) {
  const [scanResults, setScanResults] = useStorage("scanResults", null); // { devices, vulnerabilities }
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [chatHistory, setChatHistory] = useStorage("chatHistory", []);

  /** Store results after a successful upload */
  const storeScanResults = (results) => {
    setScanResults(results);
    setError(null);
    // Reset chat when new scan is uploaded
    setChatHistory([]);
  };

  /** Add a message to chat history */
  const addChatMessage = (role, content) => {
    setChatHistory((prev) => [...prev, { role, content }]);
  };

  /** Update the content of the last message in chat history (for streaming) */
  const updateLastChatMessage = (content) => {
    setChatHistory((prev) => {
      const updated = [...prev];
      updated[updated.length - 1] = { ...updated[updated.length - 1], content };
      return updated;
    });
  };

  /** Clear everything */
  const resetAll = () => {
    setScanResults(null);
    setError(null);
    setChatHistory([]);
    setIsLoading(false);
  };

  return (
    <ScanContext.Provider
      value={{
        scanResults,
        isLoading,
        error,
        chatHistory,
        setIsLoading,
        setError,
        storeScanResults,
        addChatMessage,
        updateLastChatMessage,
        resetAll,
      }}
    >
      {children}
    </ScanContext.Provider>
  );
}

export function useScan() {
  const ctx = useContext(ScanContext);
  if (!ctx) throw new Error("useScan must be used within <ScanProvider>");
  return ctx;
}
