/**
 * DeviceCard — Displays a single scanned device.
 */
export default function DeviceCard({ device }) {
  return (
    <div className="border border-gray-200 rounded p-4 text-sm">
      {/* Header */}
      <div className="flex items-start justify-between mb-2">
        <div>
          <p className="font-bold">
            {device.deviceName || device.device_name || "Unknown Device"}
          </p>
          <p className="text-gray-500 text-xs">
            {device.ipAddress || device.ip_address}
          </p>
        </div>
        <span className="text-xs text-gray-500 border border-gray-200 px-2 py-0.5 rounded">
          {device.deviceType || device.device_type || "Unknown"}
        </span>
      </div>

      {/* MAC */}
      <p className="text-xs text-gray-500 mb-2">
        MAC: {device.macAddress || device.mac_address || "N/A"}
      </p>

      {/* OS Matches */}
      {(device.osMatches || device.os_matches || []).length > 0 && (
        <div className="mb-2">
          <p className="text-xs font-medium mb-1">OS Matches:</p>
          <ul className="text-xs text-gray-600 space-y-0.5">
            {(device.osMatches || device.os_matches)
              .slice(0, 3)
              .map((os, i) => (
                <li key={i}>
                  {os.name} ({os.accuracy}%)
                </li>
              ))}
          </ul>
        </div>
      )}

      {/* Open Ports */}
      {(device.openPorts || device.open_ports || []).length > 0 && (
        <div>
          <p className="text-xs font-medium mb-1">Open Ports:</p>
          <div className="flex flex-wrap gap-1">
            {(device.openPorts || device.open_ports).map((port, i) => (
              <span
                key={i}
                className="text-xs bg-gray-100 px-1.5 py-0.5 rounded font-mono"
              >
                {port.port}/{port.protocol}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
