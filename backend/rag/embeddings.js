/**
 * Embeddings generation using Local LLM (Xenova/transformers)
 * Generates vector embeddings for documents and queries locally
 * This avoids OpenAI rate limits and costs
 */

const { pipeline, env } = require('@xenova/transformers');

// Disable multi-threading to avoid ERR_WORKER_PATH issues in some Node.js environments
env.backends.onnx.wasm.numThreads = 1;

// Configuration
const EMBEDDING_MODEL = 'Xenova/all-MiniLM-L6-v2';

// Singleton instance of the pipeline
let extractor = null;

/**
 * Get or initialize the embedding pipeline
 */
async function getPipeline() {
  if (!extractor) {
    console.log(`Loading local embedding model: ${EMBEDDING_MODEL}...`);
    extractor = await pipeline('feature-extraction', EMBEDDING_MODEL);
    console.log('Local embedding model loaded successfully');
  }
  return extractor;
}

/**
 * Generate embeddings for a text string
 * @param {string} text - Text to embed
 * @returns {Promise<number[]>} Vector embedding
 */
async function generateEmbedding(text) {
  try {
    const pipe = await getPipeline();

    // Generate embedding with mean pooling and normalization
    const output = await pipe(text, { pooling: 'mean', normalize: true });

    // Convert Float32Array to regular array
    return Array.from(output.data);
  } catch (error) {
    console.error('Error generating embedding:', error);
    throw error;
  }
}

/**
 * Generate embeddings for multiple texts in batch
 * @param {string[]} texts - Array of texts to embed
 * @returns {Promise<number[][]>} Array of vector embeddings
 */
async function generateEmbeddingsBatch(texts) {
  try {
    const pipe = await getPipeline();
    const embeddings = [];

    // Process sequentially to manage memory for local inference
    for (const text of texts) {
      const output = await pipe(text, { pooling: 'mean', normalize: true });
      embeddings.push(Array.from(output.data));
    }

    return embeddings;
  } catch (error) {
    console.error('Error generating embeddings batch:', error);
    throw error;
  }
}

module.exports = {
  generateEmbedding,
  generateEmbeddingsBatch,
  EMBEDDING_MODEL
};

