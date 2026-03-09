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
        className={`border-2 border-dashed rounded p-10 text-center cursor-pointer ${
          isDragging ? "border-black bg-gray-50" : "border-gray-300 hover:border-gray-500"
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
            <p className="text-sm font-medium text-green-700">
              Selected: {fileName}
            </p>
            <p className="text-xs text-gray-400 mt-1">
              Click or drop to replace
            </p>
          </div>
        ) : (
          <div>
            <p className="text-sm font-medium mb-1">
              Drop scan_results.json here or click to browse
            </p>
            <p className="text-xs text-gray-400">JSON files only — max 10 MB</p>
          </div>
        )}
      </div>

      {fileError && (
        <p className="mt-2 text-sm text-red-600" role="alert">
          {fileError}
        </p>
      )}
    </div>
  );
}
