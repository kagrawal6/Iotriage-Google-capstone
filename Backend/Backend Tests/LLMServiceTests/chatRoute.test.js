const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");
const Module = require("node:module");
const express = require("express");

const chatRoutePath = path.join(__dirname, "../../Routes/chatRoutes.js");
const chatControllerPath = path.join(__dirname, "../../Controllers/chatController.js");

function loadChatAppWithMockedService(sendChatToLLMImpl) {
  const originalLoad = Module._load;

  delete require.cache[chatRoutePath];
  delete require.cache[chatControllerPath];

  Module._load = function patchedLoader(request, parent, isMain) {
    if (request === "../Services/llmService") {
      return {
        sendChatToLLM: sendChatToLLMImpl,
      };
    }
    return originalLoad(request, parent, isMain);
  };

  const chatRoutes = require(chatRoutePath);
  const app = express();
  app.use(express.json());
  app.use("/api", chatRoutes);

  function cleanup() {
    Module._load = originalLoad;
    delete require.cache[chatRoutePath];
    delete require.cache[chatControllerPath];
  }

  return { app, cleanup };
}

async function postJson(url, body) {
  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  const data = await response.json();
  return { status: response.status, data };
}

test("POST /api/chat returns LLM reply and passes scanContext", async () => {
  const captured = [];
  const { app, cleanup } = loadChatAppWithMockedService(async (...args) => {
    captured.push(args);
    return "Patch the router firmware";
  });

  const server = app.listen(0);

  try {
    const port = server.address().port;
    const payload = {
      chatHistory: [{ role: "user", content: "hi" }],
      message: "what should I fix first?",
      scanContext: {
        devices: [{ ipAddress: "192.168.1.7" }],
        vulnerabilities: [{ cveId: "CVE-2025-0001" }],
      },
    };

    const result = await postJson(`http://127.0.0.1:${port}/api/chat`, payload);

    assert.equal(result.status, 200);
    assert.equal(result.data.reply, "Patch the router firmware");
    assert.equal(captured.length, 1);
    assert.deepEqual(captured[0], [
      payload.chatHistory,
      payload.message,
      payload.scanContext,
    ]);
  } finally {
    await new Promise((resolve) => server.close(resolve));
    cleanup();
  }
});

test("POST /api/chat returns 500 when llm service throws", async () => {
  const { app, cleanup } = loadChatAppWithMockedService(async () => {
    throw new Error("llm down");
  });

  const server = app.listen(0);

  try {
    const port = server.address().port;
    const result = await postJson(`http://127.0.0.1:${port}/api/chat`, {
      chatHistory: [],
      message: "hello",
      scanContext: null,
    });

    assert.equal(result.status, 500);
    assert.equal(result.data.error, "LLM request failed");
  } finally {
    await new Promise((resolve) => server.close(resolve));
    cleanup();
  }
});
