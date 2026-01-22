/**
 * ChromaDB initialization and connection management
 * Manages the vector database instance for document storage and retrieval
 */

const { ChromaClient } = require('chromadb');

// Initialize ChromaDB client with local persistence
// ChromaDB stores data in a local directory (default is ./chroma_db)
// For local persistence, ChromaDB uses default local storage
const chromaClient = new ChromaClient({
  path: "http://localhost:8000"
});

// Collection name for regulatory documents
const COLLECTION_NAME = 'regulatory_documents';

/**
 * Get or create the collection for regulatory documents
 * @returns {Promise<Collection>} ChromaDB collection instance
 */
async function getCollection() {
  try {
    // Check if collection exists, if not create it
    const collections = await chromaClient.listCollections();
    const collectionExists = collections.some(c => c.name === COLLECTION_NAME);

    if (collectionExists) {
      return await chromaClient.getCollection({ name: COLLECTION_NAME });
    } else {
      // Create new collection with embedding function
      return await chromaClient.createCollection({
        name: COLLECTION_NAME,
        metadata: { description: 'Regulatory and policy documents for consent analysis' }
      });
    }
  } catch (error) {
    console.error('Error getting/creating collection:', error);
    throw error;
  }
}

/**
 * Clear all documents from the collection (for re-ingestion)
 */
async function clearCollection() {
  try {
    // Check if collection exists before trying to delete
    const collections = await chromaClient.listCollections();
    const collectionExists = collections.some(c => c.name === COLLECTION_NAME);

    if (collectionExists) {
      // Delete the collection
      await chromaClient.deleteCollection({ name: COLLECTION_NAME });
    }

    // Recreate empty collection
    return await chromaClient.createCollection({
      name: COLLECTION_NAME,
      metadata: { description: 'Regulatory and policy documents for consent analysis' }
    });
  } catch (error) {
    console.error('Error clearing collection:', error);
    throw error;
  }
}

module.exports = {
  chromaClient,
  getCollection,
  clearCollection,
  COLLECTION_NAME
};
