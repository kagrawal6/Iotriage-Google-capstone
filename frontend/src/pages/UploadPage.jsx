import { useState } from "react";
import { useNavigate } from "react-router-dom";
import FileUploader from "../components/FileUploader";
import { useScan } from "../context/ScanContext";
import { uploadScan } from "../services/api";

/**
 * Parses an OS-type CPE string into a readable name.
 * Only handles type "o" (operating system) CPEs.
 * Returns null if the CPE is non-OS or has no useful version.
 *
 * cpe:2.3:o:microsoft:windows_10:1607:* → "Microsoft Windows 10 1607"
 * cpe:2.3:o:linux:linux_kernel:2.6:*   → "Linux 2.6"
 * cpe:2.3:o:linux:linux_kernel:*:*     → null (wildcard, not useful)
 */
function nameFromCpe(cpe) {
  if (!cpe || typeof cpe !== "string") return null;

  const parts = cpe.split(":");
  // cpe:2.3:<type>:<vendor>:<product>:<version>:...
  if (parts.length < 6) return null;
  if (parts[2] !== "o") return null; // only OS CPEs

  const vendor = parts[3].replace(/_/g, " ");
  const product = parts[4].replace(/_/g, " ");
  const version = parts[5];
  const hasVersion = version && version !== "*" && version !== "-";

  // Capitalize each word
  const cap = (s) => s.replace(/\b\w/g, (c) => c.toUpperCase());

  // Avoid redundancy like "Linux Linux Kernel" → "Linux Kernel"
  const vendorCap = cap(vendor);
  const productCap = cap(product);
  const productLabel = productCap.toLowerCase().startsWith(vendor.toLowerCase())
    ? productCap
    : `${vendorCap} ${productCap}`;

  return hasVersion ? `${productLabel} ${version}` : null;
}

/**
 * Derives a human-readable device name from scan data.
 * Priority: device_name → CPE of best OS match → OS name string fallback → device_type + IP tail
 */
function getDeviceName(device) {
  if (device.device_name && device.device_name !== "Unknown") {
    return device.device_name;
  }

  const ip = device.ip_address || device.ipAddress || "";
  const tail = ip.split(".").slice(-1)[0];
  const osMatches = device.os_matches || [];

  if (osMatches.length > 0) {
    const best = osMatches.reduce((a, b) =>
      parseInt(b.accuracy) > parseInt(a.accuracy) ? b : a
    );

    // Try CPEs from best match first (first OS-type CPE that yields a name)
    const cpes = best.cpe || [];
    for (const cpe of cpes) {
      const name = nameFromCpe(cpe);
      if (name) return `${name} (.${tail})`;
    }

    // CPE had no useful version — fall back to the OS name string with broad cleanup
    const name = best.name
      .replace(/\s*\([^)]*\)/g, "")       // all parentheticals
      .replace(/\s+[\d.]+\s*[-–]\s*[\d.]+/g, "") // version ranges
      .replace(/\s+or\s+.+$/i, "")        // "or <alternative>"
      .replace(/\s{2,}/g, " ")
      .trim();

    return `${name} (.${tail})`;
  }

  // Final fallback: device_type + IP tail
  const type = device.device_type
    ? device.device_type.charAt(0).toUpperCase() + device.device_type.slice(1)
    : "Device";
  return `${type} (.${tail})`;
}

function getDeviceSubtitle(device) {
  const ports = device.open_ports || device.openPorts || [];
  const ip = device.ip_address || device.ipAddress || "";

  const services = ports
    .map((p) => p.service)
    .filter(Boolean)
    .filter((s, i, arr) => arr.indexOf(s) === i)
    .slice(0, 4)
    .join(", ");

  const portCount = `${ports.length} open port${ports.length !== 1 ? "s" : ""}`;

  return [ip, services, portCount].filter(Boolean).join(" · ");
}

export default function UploadPage() {
  const navigate = useNavigate();
  const { storeScanResults, isLoading, setIsLoading, error, setError } =
    useScan();
  const [parsedData, setParsedData] = useState(null);
  const [selectedIps, setSelectedIps] = useState(new Set());

  const getIp = (device) => device.ip_address || device.ipAddress || "";

  const handleFileLoaded = (data) => {
    setParsedData(data);
    setError(null);
    setSelectedIps(new Set(data.map(getIp)));
  };

  const toggleDevice = (ip) => {
    setSelectedIps((prev) => {
      const next = new Set(prev);
      next.has(ip) ? next.delete(ip) : next.add(ip);
      return next;
    });
  };

  const toggleAll = () => {
    if (selectedIps.size === parsedData.length) {
      setSelectedIps(new Set());
    } else {
      setSelectedIps(new Set(parsedData.map(getIp)));
    }
  };

  const handleSubmit = async () => {
    if (!parsedData || selectedIps.size === 0) return;

    const devicesToAnalyze = parsedData.filter((d) =>
      selectedIps.has(getIp(d))
    );

    setIsLoading(true);
    setError(null);

    try {
      const results = await uploadScan(devicesToAnalyze);
      storeScanResults(results);
      navigate("/results");
    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const allSelected = parsedData && selectedIps.size === parsedData.length;
  const noneSelected = selectedIps.size === 0;

  return (
    <div className="max-w-2xl mx-auto px-4 py-10">
      <h1 className="text-xl font-bold mb-1">Upload Scan Results</h1>
      <p className="text-sm text-gray-500 mb-6">
        Upload the <code>scan_results.json</code> file generated by the IoTriage
        scanner. Select which devices to analyze, then submit.
      </p>

      <FileUploader onFileLoaded={handleFileLoaded} isLoading={isLoading} />

      {/* Device Selection */}
      {parsedData && (
        <div className="mt-6">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm font-medium">Select Devices to Analyze</p>
            <button
              onClick={toggleAll}
              className="text-xs text-gray-500 underline hover:text-black"
            >
              {allSelected ? "Deselect All" : "Select All"}
            </button>
          </div>

          <div className="border border-gray-200 rounded divide-y divide-gray-100 max-h-72 overflow-y-auto">
            {parsedData.map((device, i) => {
              const ip = getIp(device);
              const name = getDeviceName(device);
              const subtitle = getDeviceSubtitle(device);
              const isSelected = selectedIps.has(ip);

              return (
                <label
                  key={ip + "-" + i}
                  className={`flex items-start gap-3 px-4 py-3 cursor-pointer hover:bg-gray-50 transition-colors ${
                    isSelected ? "bg-white" : "bg-gray-50 opacity-50"
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={() => toggleDevice(ip)}
                    className="mt-0.5 accent-black"
                  />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium truncate">{name}</p>
                    {subtitle && (
                      <p className="text-xs text-gray-400 mt-0.5 truncate">
                        {subtitle}
                      </p>
                    )}
                  </div>
                </label>
              );
            })}
          </div>

          <p className="text-xs text-gray-400 mt-2">
            {selectedIps.size} of {parsedData.length} device
            {parsedData.length !== 1 ? "s" : ""} selected
          </p>
        </div>
      )}

      {/* Error */}
      {error && (
        <div
          className="mt-4 border border-red-300 bg-red-50 rounded p-3 text-sm text-red-700"
          role="alert"
        >
          Error: {error}
        </div>
      )}

      {/* Submit */}
      <div className="mt-6">
        <button
          onClick={handleSubmit}
          disabled={!parsedData || isLoading || noneSelected}
          className="border border-gray-400 hover:border-black disabled:opacity-40 disabled:cursor-not-allowed text-black px-6 py-2 rounded text-sm font-medium"
        >
          {isLoading
            ? "Analyzing..."
            : noneSelected
            ? "Select at least one device"
            : `Analyze ${selectedIps.size} Device${selectedIps.size !== 1 ? "s" : ""}`}
        </button>
      </div>
    </div>
  );
}