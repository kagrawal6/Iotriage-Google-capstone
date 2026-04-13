import { useState, useRef } from "react";

/**
 * FileUploader — Drag-and-drop + click-to-browse JSON file uploader.
 */
export default function FileUploader({ onFileLoaded, isLoading }) {
  const [isDragging, setIsDragging] = useState(false);
  const [fileName, setFileName] = useState(null);
  const [fileError, setFileError] = useState(null);
  const inputRef = useRef(null);

  const processFile = (file) => {
    setFileError(null);

    if (!file.name.endsWith(".json")) {
      setFileError("Please upload a .json file");
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      setFileError("File too large (max 10 MB)");
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const parsed = JSON.parse(e.target.result);

        if (!Array.isArray(parsed)) {
          setFileError(
            "Invalid format: expected a JSON array of device objects"
          );
          return;
        }

        setFileName(file.name);
        onFileLoaded(parsed);
      } catch {
        setFileError("Invalid JSON file — could not parse");
      }
    };
    reader.readAsText(file);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) processFile(file);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => setIsDragging(false);
  const handleClick = () => inputRef.current?.click();

  const handleInputChange = (e) => {
    const file = e.target.files[0];
    if (file) processFile(file);
  };

  return (
    <div>
      <div
        onClick={handleClick}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        data-testid="file-dropzone"
        className={`border-2 border-dashed rounded-xl p-10 text-center cursor-pointer transition-all ${
          isDragging ? "border-blue-500 bg-blue-50" : "border-slate-300 hover:border-slate-400 hover:bg-slate-50"
        } ${isLoading ? "opacity-50 pointer-events-none" : ""}`}
      >
        <input
          ref={inputRef}
          type="file"
          accept=".json"
          onChange={handleInputChange}
          className="hidden"
          data-testid="file-input"
        />

        {fileName ? (
          <div>
            <div className="w-12 h-12 rounded-full bg-green-100 text-green-600 flex items-center justify-center mx-auto mb-3">
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <p className="text-sm font-semibold text-green-700">
              {fileName}
            </p>
            <p className="text-xs text-slate-400 mt-1">
              Click or drop to replace
            </p>
          </div>
        ) : (
          <div>
            <div className="w-12 h-12 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center mx-auto mb-3">
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
              </svg>
            </div>
            <p className="text-sm font-semibold text-slate-700 mb-1">
              Drop scan_results.json here or click to browse
            </p>
            <p className="text-xs text-slate-400">JSON files only — max 10 MB</p>
          </div>
        )}
      </div>

      {fileError && (
        <div className="mt-3 flex items-center gap-2 text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg p-3" role="alert">
          <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          {fileError}
        </div>
      )}
    </div>
  );
}
