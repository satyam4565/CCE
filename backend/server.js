const express = require("express");
const cors = require("cors");
const axios = require("axios");
const path = require("path");
require("dotenv").config({ path: path.join(__dirname, ".env") });

// RAG modules
const { ingestDocuments } = require("./rag/ingest");
const { retrieveDocuments, formatContextForPrompt } = require("./rag/retrieve");

const app = express();
app.use(cors());
app.use(express.json());

/**
 * Parse domain, purpose, sub-purpose, and attributes from user prompt
 * @param {string} userPrompt - User prompt text
 * @returns {Object} Parsed context { domain, purpose, subPurpose, attributes }
 */
function parseContextFromPrompt(userPrompt) {
  const context = {
    domain: null,
    purpose: null,
    subPurpose: null,
    attributes: []
  };

  // Extract domain (handles multi-word domains like "Rural Development")
  const domainMatch = userPrompt.match(/\*\*Domain:\*\*\s*([^\n*]+)/i);
  if (domainMatch) {
    context.domain = domainMatch[1].trim();
  }

  // Extract purpose (handles multi-word purposes)
  const purposeMatch = userPrompt.match(/\*\*Purpose:\*\*\s*([^\n*]+)/i);
  if (purposeMatch) {
    context.purpose = purposeMatch[1].trim();
  }

  // Extract sub-purpose (looking for "Sub-Purpose" or "Sub-Purpose (ONLY analyze...)")
  const subPurposeMatch = userPrompt.match(/\*\*Sub-Purpose[^*]*:\*\*\s*([^\n*]+)/i);
  if (subPurposeMatch) {
    context.subPurpose = subPurposeMatch[1].trim();
  }

  // Extract attributes from "Available Attributes:" or "Given attributes:"
  // Also try to extract from "**Available Attributes:**" or just "Attributes:"
  const attributesMatch = userPrompt.match(/\*\*Available Attributes:\*\*\s*([^\n*]+)/i) ||
    userPrompt.match(/\*\*Given attributes:\*\*\s*([^\n*]+)/i) ||
    userPrompt.match(/Available Attributes:\s*([^\n*]+)/i) ||
    userPrompt.match(/Attributes[:\s]+\s*([^\n*]+)/i);
  if (attributesMatch) {
    const attributesText = attributesMatch[1].trim();
    // Handle comma-separated and newline-separated attributes
    context.attributes = attributesText
      .split(/[,;\n]/)
      .map(a => a.trim())
      .filter(a => a.length > 0 && !a.match(/^\d+$/)); // Filter out line numbers
  }

  return context;
}

/**
 * Build RAG-enhanced system prompt that enforces context-only responses
 * @param {string} originalSystemPrompt - Original system prompt from request
 * @param {string} retrievedContext - Retrieved regulatory documents context
 * @returns {string} Enhanced system prompt
 */
function buildRAGSystemPrompt(originalSystemPrompt, retrievedContext) {
  return `You are an expert in data privacy, consent management, and regulatory compliance (GDPR, HIPAA, CCPA, FERPA, etc.). Your role is to analyze data collection scenarios and determine which attributes are truly necessary based on data minimization principles.

CRITICAL INSTRUCTIONS - YOU MUST FOLLOW THESE STRICTLY:

1. FORBIDDEN: You are FORBIDDEN from using any prior knowledge, training data, or general knowledge about regulations. You MUST base your analysis ONLY on the retrieved regulatory documents provided below.

2. CONTEXT-ONLY ANALYSIS: Your analysis must be grounded EXCLUSIVELY in the retrieved regulatory documents. If the retrieved context does not explicitly justify an attribute for the specific sub-purpose, you MUST classify it as UNNECESSARY.

3. NO ASSUMPTIONS: Do NOT make assumptions about what attributes might be needed. If the retrieved context does not mention a specific attribute as required for the given sub-purpose, it must be classified as UNNECESSARY.

4. DATA MINIMIZATION: Strictly apply data minimization principles. An attribute is only REQUIRED if:
   - The retrieved context explicitly states it is legally mandated for this sub-purpose, OR
   - The retrieved context explicitly states it is absolutely essential for core functionality of this sub-purpose

5. IF CONTEXT IS INSUFFICIENT: If the retrieved context does not provide sufficient information about a specific attribute for the given sub-purpose, classify it as UNNECESSARY (default to privacy protection when uncertain).

RETRIEVED REGULATORY CONTEXT:
${retrievedContext}

---
END OF RETRIEVED CONTEXT

REMEMBER: Base your analysis ONLY on the retrieved context above. Do not use any prior knowledge or training data.`;
}

/**
 * Build RAG-enhanced user prompt that emphasizes context-only analysis
 * @param {string} originalUserPrompt - Original user prompt from request
 * @param {string} retrievedContext - Retrieved regulatory documents context
 * @returns {string} Enhanced user prompt
 */
function buildRAGUserPrompt(originalUserPrompt, retrievedContext) {
  return `${originalUserPrompt}

---
IMPORTANT: The retrieved regulatory context above contains the ONLY information you should use for your analysis. 

For each attribute:
- If the retrieved context explicitly states it is required for the specific sub-purpose: classify as REQUIRED
- If the retrieved context suggests it is useful but not mandatory: classify as OPTIONAL
- If the retrieved context does not mention it or states it is unnecessary: classify as UNNECESSARY

Do NOT use any information outside of the retrieved context. If you are unsure whether an attribute is necessary based on the retrieved context alone, classify it as UNNECESSARY to follow data minimization principles.

Respond ONLY with valid JSON in the exact format specified in the original prompt (no markdown, no extra text).`;
}

app.post("/analyze", async (req, res) => {
  try {
    const { system, messages, max_tokens, temperature } = req.body;

    // Extract the user message (first user message contains the analysis request)
    const userMessage = messages.find(m => m.role === "user");
    if (!userMessage) {
      throw new Error("No user message found in request");
    }

    const userPrompt = userMessage.content;

    // Parse context from user prompt for RAG retrieval
    const context = parseContextFromPrompt(userPrompt);

    console.log("Parsed context:", {
      domain: context.domain,
      purpose: context.purpose,
      subPurpose: context.subPurpose,
      attributeCount: context.attributes.length
    });

    // Retrieve relevant documents using RAG
    let retrievedDocs = [];
    let retrievedContext = "No relevant regulatory documents were found.";

    if (context.domain && context.purpose && context.subPurpose && context.attributes.length > 0) {
      try {
        retrievedDocs = await retrieveDocuments(
          context.domain,
          context.purpose,
          context.subPurpose,
          context.attributes,
          5 // top-k retrieval
        );

        if (retrievedDocs && retrievedDocs.length > 0) {
          retrievedContext = formatContextForPrompt(retrievedDocs);
          console.log(`Retrieved ${retrievedDocs.length} relevant documents for RAG`);
        } else {
          console.warn("No documents retrieved for context");
        }
      } catch (ragError) {
        console.error("RAG retrieval error:", ragError);
        // Continue with empty context rather than failing the request
        retrievedContext = "Error retrieving regulatory documents. Proceeding with limited context.";
      }
    } else {
      console.warn("Insufficient context parsed from prompt, skipping RAG retrieval");
    }

    // Build RAG-enhanced prompts
    const ragSystemPrompt = buildRAGSystemPrompt(system, retrievedContext);
    const ragUserPrompt = buildRAGUserPrompt(userPrompt, retrievedContext);

    // Prepare LLM request with RAG-enhanced prompts
    const payload = {
      model: "llama-3.3-70b-versatile",
      temperature: temperature ?? 0,
      max_tokens: max_tokens ?? 4000,
      messages: [
        { role: "system", content: ragSystemPrompt },
        { role: "user", content: ragUserPrompt }
      ]
    };

    const response = await axios.post(
      "https://api.groq.com/openai/v1/chat/completions",
      payload,
      {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${process.env.GROQ_API_KEY}`
        }
      }
    );

    res.json(response.data);
  } catch (err) {
    console.error("Error in /analyze endpoint:", err.response?.data || err.message);
    res.status(500).json({ error: err.response?.data || err.message });
  }
});

// Initialize ChromaDB and ingest documents on startup
async function initializeRAG() {
  try {
    console.log("Initializing RAG system...");
    console.log("Loading and ingesting regulatory documents...");
    await ingestDocuments();
    console.log("RAG system initialized successfully");
  } catch (error) {
    console.error("Error initializing RAG system:", error);
    console.error("Server will start but RAG functionality may be limited");
  }
}

// Start server after RAG initialization
const PORT = 4000;
initializeRAG().then(() => {
  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
    console.log("RAG-enabled consent analysis system ready");
  });
}).catch((error) => {
  console.error("Failed to initialize server:", error);
  process.exit(1);
});
