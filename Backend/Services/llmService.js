/**
 * llmService.js
 * -------------
 * Handles all LLM interactions via Google Gemini.
 *
 * Two main responsibilities:
 *  1. createMitigationSteps — Takes vulnerabilities from the NVD scan pipeline,
 *     fetches known mitigation data from the CISA KEV catalog, then asks Gemini
 *     to produce clear, actionable remediation steps for a non-technical user.
 *  2. sendChatToLLM — Powers the follow-up chat interface so users can ask
 *     questions about their scan results and get contextual AI answers.
 */

require("dotenv").config();
const { GoogleGenerativeAI } = require("@google/generative-ai");
const axios = require("axios");
const constants = require("../config/constants");

// ── Gemini client setup ─────────────────────────────────────────────────────
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

const model = genAI.getGenerativeModel({
  model: constants.GEMINI_MODEL,
  generationConfig: {
    maxOutputTokens: constants.GEMINI_MAX_OUTPUT_TOKENS,
    temperature: constants.GEMINI_TEMPERATURE,
  },
});

// ── CISA KEV cache ──────────────────────────────────────────────────────────
let cisaKevCache = null;
let cisaKevLastFetch = 0;
const CISA_CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

/**
 * Fetches (and caches) the CISA Known Exploited Vulnerabilities catalog.
 * Returns a Map keyed by CVE ID for O(1) lookups.
 * @returns {Promise<Map<string, Object>>}
 */
async function getCisaKevMap() {
  const now = Date.now();
  if (cisaKevCache && now - cisaKevLastFetch < CISA_CACHE_TTL_MS) {
    return cisaKevCache;
  }

  try {
    console.log("[LLM] Fetching CISA KEV catalog...");
    const response = await axios.get(constants.CISA_KEV_URL, { timeout: 15000 });
    const vulnerabilities = response.data.vulnerabilities || [];

    cisaKevCache = new Map();
    for (const vuln of vulnerabilities) {
      cisaKevCache.set(vuln.cveID, {
        vendorProject: vuln.vendorProject,
        product: vuln.product,
        shortDescription: vuln.shortDescription,
        requiredAction: vuln.requiredAction,
        knownRansomwareCampaignUse: vuln.knownRansomwareCampaignUse,
      });
    }

    cisaKevLastFetch = now;
    console.log(`[LLM] Cached ${cisaKevCache.size} CISA KEV entries.`);
    return cisaKevCache;
  } catch (err) {
    console.error("[LLM] Failed to fetch CISA KEV catalog:", err.message);
    // Return whatever we had cached (or empty map)
    return cisaKevCache || new Map();
  }
}

// ── Prompt builders ─────────────────────────────────────────────────────────

/**
 * Builds the Gemini prompt for vulnerability mitigation.
 * Incorporates CISA data when available to ground the response.
 * @param {Array<Object>} vulnerabilities - Vulnerability objects with cveId, description, severity, cvssScore, deviceIp
 * @param {Map<string, Object>} kevMap - CISA KEV lookup map
 * @returns {string} Formatted prompt
 */
function buildMitigationPrompt(vulnerabilities, kevMap) {
  const vulnSections = vulnerabilities.map((v, i) => {
    const kevData = kevMap.get(v.cveId);
    let section = `
### Vulnerability ${i + 1}
- **CVE ID:** ${v.cveId}
- **Severity:** ${v.severity}${v.cvssScore ? ` (CVSS ${v.cvssScore})` : ""}
- **Affected Device:** ${v.deviceIp}
- **Description:** ${v.description}`;

    if (kevData) {
      section += `
- **CISA Known Exploited:** YES
- **Vendor/Product:** ${kevData.vendorProject} / ${kevData.product}
- **CISA Required Action:** ${kevData.requiredAction}
- **Used in Ransomware:** ${kevData.knownRansomwareCampaignUse}`;
    }

    return section;
  });

  return `You are IoTriage, a cybersecurity assistant that helps home and small-business users secure their networks. You must explain things clearly for people who are NOT IT professionals.

A network scan found the following vulnerabilities on the user's devices. For each vulnerability, provide **clear, step-by-step mitigation instructions** that a non-technical person can follow.

**Rules:**
1. Use simple, jargon-free language. If you must use a technical term, briefly define it.
2. Prioritize the most critical vulnerabilities first.
3. For each vulnerability, provide:
   a. A one-sentence plain-English summary of the risk.
   b. Numbered step-by-step remediation instructions.
   c. How to verify the fix was applied.
4. If CISA has a required action listed, incorporate it into your steps.
5. Group vulnerabilities by device IP when possible.
6. If a vulnerability has known ransomware usage, add a prominent warning.

**Vulnerabilities found:**
${vulnSections.join("\n")}

Respond in valid JSON with the following structure (no markdown code fences):
{
  "mitigations": [
    {
      "cveId": "CVE-XXXX-XXXX",
      "deviceIp": "x.x.x.x",
      "riskSummary": "One sentence plain-English risk summary",
      "priority": "CRITICAL|HIGH|MEDIUM|LOW",
      "steps": ["Step 1...", "Step 2...", "Step 3..."],
      "verification": "How to verify the fix",
      "ransomwareWarning": "Warning text or null"
    }
  ]
}`;
}

/**
 * Builds the system instruction for the follow-up chat.
 * @param {Object|null} scanContext - Optional scan data to ground the chat
 * @returns {string}
 */
function buildChatSystemInstruction(scanContext) {
  let instruction = `You are IoTriage, a friendly cybersecurity assistant that helps home and small-business users understand and fix network vulnerabilities. 

**Rules:**
1. Always use simple, non-technical language. Define any technical terms you use.
2. Be concise but thorough.
3. If the user asks about a specific CVE or device, reference the scan data provided.
4. If you don't know something, say so honestly rather than guessing.
5. Never recommend disabling security features as a fix.
6. When suggesting actions, give step-by-step instructions.
7. Respond in clean plain text only (no markdown symbols like #, *, or backticks).`;

  if (scanContext) {
    instruction += `\n\n**The user's network scan found the following data — use it to answer their questions:**\n${JSON.stringify(scanContext, null, 2)}`;
  }

  return instruction;
}

/**
 * Normalizes chat history into Gemini's expected format:
 * [{ role: "user"|"model", parts: [{ text: "..." }] }]
 * Accepts frontend format ({ role, content }) for backward compatibility.
 * @param {Array<Object>} chatHistory
 * @returns {Array<Object>}
 */
function normalizeChatHistory(chatHistory) {
  if (!Array.isArray(chatHistory)) return [];

  return chatHistory
    .map((msg) => {
      const normalizedRole = msg.role === "assistant" ? "model" : msg.role;

      if (!["user", "model"].includes(normalizedRole)) {
        return null;
      }

      if (Array.isArray(msg.parts)) {
        return { role: normalizedRole, parts: msg.parts };
      }

      if (typeof msg.content === "string") {
        return { role: normalizedRole, parts: [{ text: msg.content }] };
      }

      return null;
    })
    .filter(Boolean);
}

// ── Exported functions ──────────────────────────────────────────────────────

/**
 * Takes a list of vulnerabilities (from the NVD pipeline), looks up CISA KEV
 * mitigation data, then sends everything to Gemini to produce user-friendly
 * remediation steps.
 *
 * @param {Array<Object>} vulnerabilities - Array of Vulnerability-like objects
 *   Each must have: { cveId, description, severity, deviceIp }
 *   Optional: { cvssScore }
 * @returns {Promise<Array<Object>>} Mitigation objects keyed by CVE ID
 */
exports.createMitigationSteps = async (vulnerabilities) => {
  if (!vulnerabilities || vulnerabilities.length === 0) {
    return [];
  }

  console.log(`[LLM] Generating mitigations for ${vulnerabilities.length} vulnerabilities...`);

  try {
    // 1. Fetch CISA KEV data for grounding
    const kevMap = await getCisaKevMap();

    // 2. Build prompt with all vulnerabilities
    const prompt = buildMitigationPrompt(vulnerabilities, kevMap);

    // 3. Call Gemini
    const result = await model.generateContent(prompt);
    const responseText = result.response.text();

    // 4. Parse JSON response — strip markdown code fences if Gemini adds them
    const cleanJson = responseText
      .replace(/```json\s*/gi, "")
      .replace(/```\s*/gi, "")
      .trim();

    const parsed = JSON.parse(cleanJson);

    console.log(`[LLM] Successfully generated ${parsed.mitigations.length} mitigation plans.`);

    // 5. Map to expected format
    return parsed.mitigations.map((m) => ({
      cveId: m.cveId,
      deviceIp: m.deviceIp,
      riskSummary: m.riskSummary,
      priority: m.priority,
      steps: m.steps,
      verification: m.verification,
      ransomwareWarning: m.ransomwareWarning || null,
      mitigation: m.steps.join("\n"), // Flattened string for backward compat
    }));
  } catch (err) {
    console.error("[LLM] Mitigation generation failed:", err.message);

    // Fallback: return generic advice so the pipeline doesn't break
    return vulnerabilities.map((v) => ({
      cveId: v.cveId,
      deviceIp: v.deviceIp,
      mitigation: `We could not generate specific steps for ${v.cveId}. ` +
        `General advice: check for software updates on the affected device (${v.deviceIp}), ` +
        `and visit https://nvd.nist.gov/vuln/detail/${v.cveId} for details.`,
      steps: [
        `Visit https://nvd.nist.gov/vuln/detail/${v.cveId} for official details.`,
        "Check the device manufacturer's website for firmware or software updates.",
        "Apply any available patches or updates.",
      ],
      riskSummary: v.description || "No description available.",
      priority: v.severity || "UNKNOWN",
      verification: "Verify that the software version on the device has been updated.",
      ransomwareWarning: null,
    }));
  }
};

/**
 * Sends a chat message (with history) to Gemini for the follow-up chat feature.
 * Optionally receives scan context so the LLM can reference the user's actual
 * devices and vulnerabilities.
 *
 * @param {Array<Object>} chatHistory - Previous messages [{ role: "user"|"model", parts: [{ text }] }]
 * @param {string} userMessage - The new message from the user
 * @param {Response} res - Write LLM response to this and end when response is done
 * @param {Object|null} scanContext - Optional: { devices, vulnerabilities } from the scan
 */
exports.sendChatToLLM = async (chatHistory, userMessage, res, scanContext = null) => {
  console.log("[LLM] Processing chat message...");

  try {
    // Build system instruction with optional scan context
    const systemInstruction = buildChatSystemInstruction(scanContext);
    const normalizedHistory = normalizeChatHistory(chatHistory);

    // Create a chat-tuned model instance with the system instruction
    const chatModel = genAI.getGenerativeModel({
      model: constants.GEMINI_MODEL,
      systemInstruction,
      generationConfig: {
        maxOutputTokens: constants.GEMINI_MAX_OUTPUT_TOKENS,
        temperature: constants.GEMINI_TEMPERATURE,
      },
    });

    // Start a chat session with existing history
    const chat = chatModel.startChat({
      history: normalizedHistory,
    });

    const result = await chat.sendMessageStream(userMessage);

    for await (const chunk of result.stream) {
      const text = chunk.text();
      res.write(`data: ${JSON.stringify({ text })}\n\n`);
    }

    res.write("data: [DONE]\n\n");
    res.end()
  } catch (err) {
    console.error("[LLM] Chat request failed:", err.message);
    res.write(`data: ${JSON.stringify({ error: "Failed to get a response from the AI." })}\n\n`);
    res.end();
  }
};

/**
 * Generates mitigation for one vulnerability so frontend can request details
 * on click instead of generating mitigations for the entire scan at upload time.
 *
 * @param {Object} vulnerability - { cveId, description, severity, cvssScore, deviceIp }
 * @returns {Promise<Object>} One mitigation object
 */
exports.createMitigationForVulnerability = async (vulnerability) => {
  if (!vulnerability || typeof vulnerability !== "object") {
    throw new Error("Invalid vulnerability payload");
  }

  const [mitigation] = await exports.createMitigationSteps([vulnerability]);
  return mitigation || null;
};