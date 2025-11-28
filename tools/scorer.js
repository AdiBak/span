// scorer.js
import OpenAI from "openai";
import { createClient } from "@supabase/supabase-js";
import path from "path";
import { fileURLToPath } from "url";
import { config } from "dotenv";
import { existsSync } from "fs";

// Load .env.local if it exists, otherwise load .env
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, "..");

if (existsSync(path.join(rootDir, ".env.local"))) {
  config({ path: path.join(rootDir, ".env.local") });
} else {
  config(); // defaults to .env
}

// -----------------------------
//  Setup clients
// -----------------------------

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

// Support both VITE_ prefixed and non-prefixed env vars
const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const supabaseServiceRole = process.env.SUPABASE_SERVICE_ROLE;

const supabase = createClient(
  supabaseUrl,
  supabaseServiceRole
);

// -----------------------------
//  Main scoring function
// -----------------------------

export async function scoreProposal(proposalText, userId = null) {
  try {
    // -----------------------------
    // 1. Create prompt
    // -----------------------------
    const prompt = `
You are a policy evaluator. Score the following legislative proposal using these criteria:
- Clarity (0–25)
- Feasibility (0–25)
- Impact (0–25)
- Cost-effectiveness (0–25)

Return ONLY valid JSON in this format:

{
  "score": <0-100>,
  "reasons": ["...","..."],
  "improvements": ["...","..."]
}

Proposal:
${proposalText}
`;

    // -----------------------------
    // 2. Call OpenAI
    // -----------------------------
    const response = await openai.responses.create({
      model: "gpt-4.1-mini",
      input: prompt
    });

    const textOutput = response.output_text;
    const parsed = JSON.parse(textOutput); // turn into JS object

    // Confirm required fields exist
    if (
      !parsed ||
      typeof parsed.score !== "number" ||
      !Array.isArray(parsed.reasons) ||
      !Array.isArray(parsed.improvements)
    ) {
      throw new Error("LLM returned invalid JSON format.");
    }

    // -----------------------------
    // 3. Upload success to Supabase
    // -----------------------------
    await supabase.from("agent_proposal_reviews").insert({
      user_id: userId,
      proposal_text: proposalText,
      ai_score: parsed.score,
      reasons: parsed.reasons,
      improvements: parsed.improvements,
      raw_ai_response: response, // logs whole model output
      success: true
    });

    return parsed;
  } catch (err) {
    console.error("❌ Error scoring proposal:", err.message);

    // -----------------------------
    // 4. Upload failure to Supabase
    // -----------------------------
    await supabase.from("agent_proposal_reviews").insert({
      user_id: userId,
      proposal_text: proposalText,
      success: false,
      error_message: err.message
    });

    throw err;
  }
}

// -----------------------------
// 5. Run from CLI if needed
// -----------------------------
if (process.argv[1].includes("scorer.js")) {
  const sampleText = process.argv.slice(2).join(" ");

  if (!sampleText) {
    console.log("\nUsage: node scorer.js \"your proposal text here\"\n");
    process.exit(0);
  }

  scoreProposal(sampleText)
    .then((result) => {
      console.log("\n=== Score Generated ===\n");
      console.log(result);
      console.log("\nSaved to Supabase.\n");
    })
    .catch(() => {});
}