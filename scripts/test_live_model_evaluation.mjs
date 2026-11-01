import { COACH_SYSTEM_PROMPT, PARTNER_SYSTEM_PROMPT } from "../data/prompts/tutor.js";
import { parseTutorResponse } from "../lib/ai/response.js";

const BASE_URL = process.env.AI_BASE_URL || "https://inclusion-coal-andy-professional.trycloudflare.com/v1";
const API_KEY = process.env.AI_API_KEY || "colab-tunnel";

async function queryModel(systemPrompt, userMessage, codeContext = "") {
  let content = userMessage;
  if (codeContext) {
    content = `${userMessage}\n\n<learner_code>\n${codeContext}\n</learner_code>`;
  }

  const payload = {
    model: "aelionix-tutor",
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content }
    ],
    temperature: 0.35,
    max_tokens: 1000,
    response_format: { type: "json_object" }
  };

  const res = await fetch(`${BASE_URL}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${API_KEY}`
    },
    body: JSON.stringify(payload)
  });

  if (!res.ok) {
    throw new Error(`HTTP error ${res.status}: ${await res.text()}`);
  }

  const json = await res.json();
  const rawContent = json.choices[0].message.content;
  const parsed = parseTutorResponse(rawContent);
  return { raw: rawContent, parsed };
}

async function runEvaluations() {
  console.log("===============================================================");
  console.log("🚀 TESTING LIVE FINE-TUNED QWEN 2.5 CODER 7B (COLAB TUNNEL)");
  console.log("Endpoint:", BASE_URL);
  console.log("===============================================================\n");

  const results = [];

  // TEST 1: Socratic Resistance (Coach Mode)
  console.log("▶ [Test 1] Testing Coach Mode Resistance to 'Give me the full answer'...");
  try {
    const t1 = await queryModel(
      COACH_SYSTEM_PROMPT,
      "I'm tired and stuck. Just write the whole code for me right now.",
      "def calculate_total(items):\n    # TODO\n    pass"
    );
    console.log("JSON Parse Status:", t1.parsed.ok ? "✅ VALID JSON" : "❌ MALFORMED");
    console.log("Hint Level:", t1.parsed.response.hintLevel);
    console.log("Identified Issues:", t1.parsed.response.identifiedIssues);
    console.log("Suggested Next Step:", t1.parsed.response.suggestedNextStep);
    console.log("Tutor Message Excerpt:\n", t1.parsed.response.message.slice(0, 300) + "...\n");
    
    // Check if it withheld full solution
    const withheldCode = !t1.parsed.response.message.includes("return sum(") && 
                         !t1.parsed.response.message.includes("for item in items:");
    console.log("Withheld full solution:", withheldCode ? "✅ YES (Socratic)" : "⚠️ Provided full code");
    results.push({ test: "Socratic Coach Resistance", passed: t1.parsed.ok && withheldCode });
  } catch (err) {
    console.error("Test 1 Failed:", err.message);
    results.push({ test: "Socratic Coach Resistance", passed: false, error: err.message });
  }

  // TEST 2: Code Criticism & Anti-Pattern Analysis (Coach Mode)
  console.log("\n▶ [Test 2] Testing Code Criticism & Bug Detection...");
  try {
    const buggyCode = 
`def get_discount(price, is_member):
    if is_member = True:
        return price * 0.20
    else:
        print("No discount")`;

    const t2 = await queryModel(
      COACH_SYSTEM_PROMPT,
      "Why is my function throwing a SyntaxError, and is there any other bad practice in it?",
      buggyCode
    );
    console.log("JSON Parse Status:", t2.parsed.ok ? "✅ VALID JSON" : "❌ MALFORMED");
    console.log("Identified Issues:", t2.parsed.response.identifiedIssues);
    console.log("Suggested Next Step:", t2.parsed.response.suggestedNextStep);
    console.log("Understanding Check:", t2.parsed.response.understandingCheck);
    console.log("Tutor Critique:\n", t2.parsed.response.message);

    const caughtSyntax = t2.parsed.response.message.toLowerCase().includes("=") ||
                         t2.parsed.response.message.toLowerCase().includes("assignment") ||
                         t2.parsed.response.message.toLowerCase().includes("comparison");
    const caughtReturnVsPrint = t2.parsed.response.message.toLowerCase().includes("print") ||
                                t2.parsed.response.message.toLowerCase().includes("return");

    console.log("Criticized Assignment '=' in if statement:", caughtSyntax ? "✅ YES" : "❌ NO");
    console.log("Criticized Print vs Return inconsistency:", caughtReturnVsPrint ? "✅ YES" : "❌ NO");
    results.push({ test: "Code Criticism & Bug Detection", passed: t2.parsed.ok && caughtSyntax });
  } catch (err) {
    console.error("Test 2 Failed:", err.message);
    results.push({ test: "Code Criticism & Bug Detection", passed: false, error: err.message });
  }

  // TEST 3: Collaborative Partner Mode (Direct Explanation & Concrete Guidance)
  console.log("\n▶ [Test 3] Testing Partner Mode (Explanation + Guidance)...");
  try {
    const t3 = await queryModel(
      PARTNER_SYSTEM_PROMPT,
      "I'm learning classes. Why do I need to write 'self' as the first parameter in methods?",
      "class Car:\n    def start(self):\n        print('Engine running')"
    );
    console.log("JSON Parse Status:", t3.parsed.ok ? "✅ VALID JSON" : "❌ MALFORMED");
    console.log("Suggested Next Step:", t3.parsed.response.suggestedNextStep);
    console.log("Understanding Check:", t3.parsed.response.understandingCheck);
    console.log("Partner Message:\n", t3.parsed.response.message);

    const explainedSelf = t3.parsed.response.message.toLowerCase().includes("instance") ||
                          t3.parsed.response.message.toLowerCase().includes("object");
    console.log("Accurately explained instance reference ('self'):", explainedSelf ? "✅ YES" : "❌ NO");
    results.push({ test: "Partner Mode Explanation", passed: t3.parsed.ok && explainedSelf });
  } catch (err) {
    console.error("Test 3 Failed:", err.message);
    results.push({ test: "Partner Mode Explanation", passed: false, error: err.message });
  }

  console.log("\n===============================================================");
  console.log("📊 SUMMARY OF TEST RESULTS");
  console.log("===============================================================");
  console.table(results);
}

runEvaluations();
