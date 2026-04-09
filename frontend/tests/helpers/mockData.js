/**
 * Mock data that matches the format produced by the Nmap scan script
 * and expected by the backend API.
 */

/** Raw scan data (what the frontend sends to POST /api/upload) */
export const mockScanInput = [
  {
    ip_address: "192.168.1.1",
    mac_address: "AA:BB:CC:DD:EE:01",
    device_name: "router.local",
    device_type: "router",
    os_matches: [
      {
        name: "Linux 4.15",
        accuracy: "95",
        cpe: ["cpe:2.3:o:linux:linux_kernel:4.15:*:*:*:*:*:*:*"],
      },
    ],
    open_ports: [
      {
        port: 80,
        protocol: "tcp",
        service: "http",
        product: "nginx",
        version: "1.18.0",
        cpe: "cpe:2.3:a:nginx:nginx:1.18.0:*:*:*:*:*:*:*",
      },
      {
        port: 443,
        protocol: "tcp",
        service: "https",
        product: "nginx",
        version: "1.18.0",
        cpe: "cpe:2.3:a:nginx:nginx:1.18.0:*:*:*:*:*:*:*",
      },
    ],
  },
  {
    ip_address: "192.168.1.50",
    mac_address: "AA:BB:CC:DD:EE:02",
    device_name: "smart-camera",
    device_type: "webcam",
    os_matches: [],
    open_ports: [
      {
        port: 554,
        protocol: "tcp",
        service: "rtsp",
        product: "Unknown",
        version: "Unknown",
        cpe: "",
      },
    ],
  },
];

/** Mock backend response from POST /api/upload */
export const mockScanResponse = {
  devices: [
    {
      ipAddress: "192.168.1.1",
      macAddress: "AA:BB:CC:DD:EE:01",
      deviceName: "router.local",
      deviceType: "router",
      osMatches: [
        {
          name: "Linux 4.15",
          accuracy: "95",
          cpe: ["cpe:2.3:o:linux:linux_kernel:4.15:*:*:*:*:*:*:*"],
        },
      ],
      openPorts: [
        {
          port: 80,
          protocol: "tcp",
          service: "http",
          product: "nginx",
          version: "1.18.0",
          cpe: "cpe:2.3:a:nginx:nginx:1.18.0:*:*:*:*:*:*:*",
        },
        {
          port: 443,
          protocol: "tcp",
          service: "https",
          product: "nginx",
          version: "1.18.0",
          cpe: "cpe:2.3:a:nginx:nginx:1.18.0:*:*:*:*:*:*:*",
        },
      ],
    },
    {
      ipAddress: "192.168.1.50",
      macAddress: "AA:BB:CC:DD:EE:02",
      deviceName: "smart-camera",
      deviceType: "webcam",
      osMatches: [],
      openPorts: [
        {
          port: 554,
          protocol: "tcp",
          service: "rtsp",
          product: "Unknown",
          version: "Unknown",
          cpe: "",
        },
      ],
    },
  ],
  vulnerabilities: [
    {
      cveId: "CVE-2021-23017",
      description:
        "A security issue in nginx resolver could allow an attacker to cause a worker process crash.",
      severity: "HIGH",
      deviceIp: "192.168.1.1",
    },
    {
      cveId: "CVE-2019-9516",
      description: "HTTP/2 implementation in nginx is vulnerable to header leaks.",
      severity: "MEDIUM",
      deviceIp: "192.168.1.1",
    },
  ],
};

export const mockMitigationResponse = {
  mitigation: {
    cveId: "CVE-2021-23017",
    deviceIp: "192.168.1.1",
    riskSummary: "Attackers may crash nginx worker processes remotely.",
    priority: "HIGH",
    steps: [
      "Update nginx to the latest stable version from the vendor.",
      "Restart nginx after the update.",
    ],
    verification: "Check nginx version and confirm service health.",
    ransomwareWarning: null,
    mitigation: "Update nginx and restart the service.",
  },
};

/** Mock chat response from POST /api/chat */
export const mockChatResponse = {
  reply: "CVE-2021-23017 is a high-severity vulnerability in nginx. You should update nginx to version 1.21.0 or later to fix this issue.",
};
