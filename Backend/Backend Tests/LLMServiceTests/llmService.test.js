const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");
const Module = require("node:module");

const servicePath = path.join(__dirname, "../../Services/llmService.js");

function loadServiceWithMocks({ axiosGetImpl, modelText = "", chatReply = "ok" } = {}) {
  delete require.cache[servicePath];

  const originalLoad = Module._load;
  const generated = {
    mitigationPrompts: [],
    chatSystemInstructions: [],
    chatHistory: [],
    chatMessages: [],
  };

  Module._load = function patchedLoader(request, parent, isMain) {
    if (request === "axios") {
      return {
        get: axiosGetImpl || (async () => ({ data: { vulnerabilities: [] } })),
      };
    }

    if (request === "@google/generative-ai") {
      return {
        GoogleGenerativeAI: class FakeGoogleGenerativeAI {
          getGenerativeModel(config) {
            if (config.systemInstruction) {
              generated.chatSystemInstructions.push(config.systemInstruction);
              return {
                startChat: ({ history }) => {
                  generated.chatHistory.push(history);
                  return {
                    sendMessage: async (message) => {
                      generated.chatMessages.push(message);
                      return {
                        response: {
                          text: () => chatReply,
                        },
                      };
                    },
                  };
                },
              };
            }

            return {
              generateContent: async (prompt) => {
                generated.mitigationPrompts.push(prompt);
                return {
                  response: {
                    text: () => modelText,
                  },
                };
              },
            };
          }
        },
      };
    }

    return originalLoad(request, parent, isMain);
  };

  const service = require(servicePath);

  function cleanup() {
    Module._load = originalLoad;
    delete require.cache[servicePath];
  }

  return { service, generated, cleanup };
}

test("createMitigationSteps returns empty array for empty input", async () => {
  const { service, cleanup } = loadServiceWithMocks();
  try {
    const result = await service.createMitigationSteps([]);
    assert.deepEqual(result, []);
  } finally {
    cleanup();
  }
});

test("createMitigationSteps parses markdown-fenced JSON and maps fields", async () => {
  const modelJson = {
    mitigations: [
      {
        cveId: "CVE-2025-0001",
        deviceIp: "192.168.1.10",
        riskSummary: "Remote code execution risk",
        priority: "CRITICAL",
        steps: ["Update firmware", "Restart device"],
        verification: "Check firmware version",
        ransomwareWarning: "Act now",
      },
    ],
  };

  const { service, cleanup } = loadServiceWithMocks({
    modelText: `\`\`\`json\n${JSON.stringify(modelJson)}\n\`\`\``,
  });

  try {
    const result = await service.createMitigationSteps([
      {
        cveId: "CVE-2025-0001",
        description: "desc",
        severity: "HIGH",
        deviceIp: "192.168.1.10",
      },
    ]);

    assert.equal(result.length, 1);
    assert.equal(result[0].cveId, "CVE-2025-0001");
    assert.equal(result[0].mitigation, "Update firmware\nRestart device");
    assert.equal(result[0].priority, "CRITICAL");
  } finally {
    cleanup();
  }
});

test("createMitigationSteps falls back when model returns invalid JSON", async () => {
  const { service, cleanup } = loadServiceWithMocks({ modelText: "not-json" });

  try {
    const result = await service.createMitigationSteps([
      {
        cveId: "CVE-2024-1234",
        description: "Example vuln",
        severity: "MEDIUM",
        deviceIp: "10.0.0.12",
      },
    ]);

    assert.equal(result.length, 1);
    assert.equal(result[0].cveId, "CVE-2024-1234");
    assert.match(result[0].mitigation, /could not generate specific steps/i);
  } finally {
    cleanup();
  }
});

test("sendChatToLLM normalizes chat history and sends message", async () => {
  const { service, generated, cleanup } = loadServiceWithMocks({ chatReply: "Use patch KB-001" });

  try {
    const reply = await service.sendChatToLLM(
      [
        { role: "user", content: "What is critical?" },
        { role: "assistant", content: "CVE-2025-0001" },
      ],
      "How do I fix it?",
      {
        devices: [{ ipAddress: "192.168.1.10" }],
        vulnerabilities: [{ cveId: "CVE-2025-0001" }],
      }
    );

    assert.equal(reply, "Use patch KB-001");
    assert.equal(generated.chatHistory.length, 1);
    assert.deepEqual(generated.chatHistory[0], [
      { role: "user", parts: [{ text: "What is critical?" }] },
      { role: "model", parts: [{ text: "CVE-2025-0001" }] },
    ]);
    assert.equal(generated.chatMessages[0], "How do I fix it?");
    assert.match(generated.chatSystemInstructions[0], /network scan found/i);
    assert.match(generated.chatSystemInstructions[0], /CVE-2025-0001/);
  } finally {
    cleanup();
  }
});
