/**
 * Document retrieval using semantic similarity search
 * Retrieves relevant regulatory documents based on query context
 */

const { getCollection } = require('./db');
const { generateEmbedding } = require('./embeddings');

/**
 * Build a search query from the analysis context
 * @param {string} domain - Domain (e.g., "Health", "Transport")
 * @param {string} purpose - Purpose (e.g., "Patient Management")
 * @param {string} subPurpose - Sub-purpose (e.g., "Patient Registration")
 * @param {string[]} attributes - List of attributes being analyzed
 * @returns {string} Search query string
 */
function buildQuery(domain, purpose, subPurpose, attributes) {
  const queryParts = [
    `Domain: ${domain}`,
    `Purpose: ${purpose}`,
    `Sub-purpose: ${subPurpose}`,
    `Attributes: ${attributes.join(', ')}`
  ];

  // Add focused query for specific sub-purpose
  queryParts.push(
    `What attributes are required, optional, or unnecessary for ${subPurpose} in the ${domain} domain under ${purpose}?`,
    `What are the regulatory requirements for data collection in ${subPurpose}?`,
    `What attributes violate data minimization principles for ${subPurpose}?`
  );

  return queryParts.join('\n\n');
}

/**
 * Retrieve relevant documents based on analysis context
 * Uses semantic similarity search with metadata filtering
 * @param {string} domain - Domain
 * @param {string} purpose - Purpose
 * @param {string} subPurpose - Sub-purpose
 * @param {string[]} attributes - Attributes being analyzed
 * @param {number} topK - Number of documents to retrieve (default: 5)
 * @returns {Promise<Array>} Array of retrieved documents with relevance scores
 */
async function retrieveDocuments(domain, purpose, subPurpose, attributes, topK = 5) {
  try {
    const collection = await getCollection();

    // Build search query
    const query = buildQuery(domain, purpose, subPurpose, attributes);
    console.log(`Retrieving documents for query: ${domain} > ${purpose} > ${subPurpose}`);

    // Generate embedding for query
    const queryEmbedding = await generateEmbedding(query);

    // Perform similarity search
    // Retrieve more results initially to allow for filtering and re-ranking
    const maxResults = Math.max(topK * 3, 15);
    const results = await collection.query({
      queryEmbeddings: [queryEmbedding],
      nResults: maxResults
    });

    // Check if results are valid
    if (!results || !results.ids || !results.ids[0] || results.ids[0].length === 0) {
      console.warn('No documents found in similarity search');
      return [];
    }

    // Filter and rank results
    // Prioritize documents that match domain and purpose
    const scoredResults = results.ids[0].map((id, index) => {
      const metadata = results.metadatas[0][index] || {};
      const document = results.documents[0][index] || '';
      const distance = results.distances && results.distances[0] ? results.distances[0][index] : 1.0;

      // Calculate relevance score (lower distance = higher relevance)
      // Boost score for domain/purpose match
      let score = Math.max(0, 1 - distance); // Convert distance to similarity (0-1 range)

      // Filter: prioritize documents matching domain or general documents
      const docDomain = metadata.domain || '';
      if (docDomain === domain) {
        score += 0.2; // Boost for domain match
      } else if (docDomain === 'General') {
        score += 0.1; // Small boost for general documents (e.g., GDPR)
      } else {
        score -= 0.3; // Penalize non-matching domains
      }

      // Boost for purpose match
      const docPurpose = metadata.purpose || '';
      if (docPurpose === purpose) {
        score += 0.3; // Boost for purpose match
      }

      // Check if sub-purpose is in the document's sub_purposes
      try {
        const subPurposesStr = metadata.sub_purposes || '[]';
        const docSubPurposes = JSON.parse(subPurposesStr);
        if (Array.isArray(docSubPurposes) && docSubPurposes.includes(subPurpose)) {
          score += 0.4; // Strong boost for sub-purpose match
        }
      } catch (e) {
        // Ignore parse errors
      }

      return {
        id,
        document,
        metadata,
        score: Math.min(Math.max(score, 0), 1.0), // Cap between 0 and 1.0
        distance
      };
    });

    scoredResults.sort((a, b) => b.score - a.score);

    // Filter out results with very low scores (likely irrelevant)
    // But keep at least topK results if they exist, even if scores are low
    const filteredResults = scoredResults.filter(result => result.score > 0.1);
    const topResults = filteredResults.length >= topK
      ? filteredResults.slice(0, topK)
      : scoredResults.slice(0, Math.min(topK, scoredResults.length));

    console.log(`Retrieved ${topResults.length} relevant documents (top scores: ${topResults.map(r => r.score.toFixed(3)).join(', ')})`);

    return topResults;
  } catch (error) {
    console.error('Error retrieving documents:', error);
    throw error;
  }
}

/**
 * Format retrieved documents for injection into LLM prompt
 * @param {Array} retrievedDocs - Array of retrieved document objects
 * @returns {string} Formatted context string for prompt
 */
function formatContextForPrompt(retrievedDocs) {
  if (!retrievedDocs || retrievedDocs.length === 0) {
    return 'No relevant regulatory documents were found.';
  }

  const contextParts = retrievedDocs.map((doc, index) => {
    return `[Document ${index + 1}]
Domain: ${doc.metadata.domain}
Purpose: ${doc.metadata.purpose}
Regulations: ${JSON.parse(doc.metadata.regulations || '[]').join(', ')}
Source: ${doc.metadata.source || 'Unknown'}

${doc.document}

---`;
  });

  return contextParts.join('\n\n');
}

module.exports = {
  retrieveDocuments,
  formatContextForPrompt,
  buildQuery
};
