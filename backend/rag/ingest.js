/**
 * Document ingestion pipeline
 * Loads regulatory documents from JSON files and indexes them in ChromaDB
 */

const fs = require('fs').promises;
const path = require('path');
const { getCollection, clearCollection } = require('./db');
const { generateEmbeddingsBatch } = require('./embeddings');

const DOCS_DIR = path.join(__dirname, '../docs');

/**
 * Load all document files from the docs directory
 * @returns {Promise<Array>} Array of document objects
 */
async function loadDocuments() {
  try {
    const files = await fs.readdir(DOCS_DIR);
    const jsonFiles = files.filter(f => f.endsWith('.json'));

    const documents = [];
    for (const file of jsonFiles) {
      const filePath = path.join(DOCS_DIR, file);
      const content = await fs.readFile(filePath, 'utf-8');
      const doc = JSON.parse(content);
      documents.push(doc);
    }

    console.log(`Loaded ${documents.length} documents from ${DOCS_DIR}`);
    return documents;
  } catch (error) {
    console.error('Error loading documents:', error);
    throw error;
  }
}

/**
 * Ingest all documents into ChromaDB
 * Creates embeddings and stores documents with metadata
 */
async function ingestDocuments() {
  try {
    console.log('Starting document ingestion...');

    // Load all documents
    const documents = await loadDocuments();

    if (documents.length === 0) {
      console.warn('No documents found to ingest');
      return;
    }

    // Check if collection already has documents
    let collection = await getCollection();

    // For local embeddings switch, we want to ensure we start fresh
    try {
      const peekResult = await collection.peek({ limit: 1 });
      if (peekResult && peekResult.ids && peekResult.ids.length > 0) {
        console.log('Existing collection found. Clearing to ensure embedding dimension compatibility...');
        // Refresh collection reference after recreating it
        collection = await clearCollection();
        console.log('Collection cleared. Proceeding with new ingestion...');
      }
    } catch (error) {
      // If peek fails, collection might be empty, proceed with ingestion
      console.log('Collection appears empty or check failed, proceeding with ingestion...');
    }

    // Prepare documents for ingestion
    const ids = [];
    const texts = [];
    const metadatas = [];

    for (const doc of documents) {
      // Create searchable text from document content
      // Include domain, purpose, sub-purposes, content, and regulations
      const searchableText = [
        `Domain: ${doc.domain}`,
        `Purpose: ${doc.purpose}`,
        `Sub-purposes: ${doc.sub_purposes.join(', ')}`,
        doc.content,
        `Regulations: ${doc.regulations.join(', ')}`
      ].join('\n\n');

      ids.push(doc.id);
      texts.push(searchableText);
      metadatas.push({
        domain: doc.domain,
        purpose: doc.purpose,
        sub_purposes: JSON.stringify(doc.sub_purposes),
        regulations: JSON.stringify(doc.regulations),
        source: doc.metadata?.source || 'Unknown',
        doc_id: doc.id
      });
    }

    console.log(`Generating embeddings for ${texts.length} documents...`);

    // Generate embeddings in batches
    const batchSize = 100;
    const allEmbeddings = [];

    for (let i = 0; i < texts.length; i += batchSize) {
      const batch = texts.slice(i, i + batchSize);
      console.log(`Processing batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(texts.length / batchSize)}...`);
      const embeddings = await generateEmbeddingsBatch(batch);
      allEmbeddings.push(...embeddings);
    }

    console.log('Adding documents to ChromaDB collection...');

    // Add documents to collection in batches
    const chromaBatchSize = 100;
    for (let i = 0; i < ids.length; i += chromaBatchSize) {
      const batchIds = ids.slice(i, i + chromaBatchSize);
      const batchEmbeddings = allEmbeddings.slice(i, i + chromaBatchSize);
      const batchTexts = texts.slice(i, i + chromaBatchSize);
      const batchMetadatas = metadatas.slice(i, i + chromaBatchSize);

      await collection.add({
        ids: batchIds,
        embeddings: batchEmbeddings,
        documents: batchTexts,
        metadatas: batchMetadatas
      });
    }

    console.log(`Successfully ingested ${ids.length} documents into ChromaDB`);
  } catch (error) {
    console.error('Error ingesting documents:', error);
    throw error;
  }
}

/**
 * Clear and re-ingest all documents
 * Useful for updating documents
 */
async function reingestDocuments() {
  try {
    console.log('Clearing existing collection...');
    await clearCollection();
    await ingestDocuments();
  } catch (error) {
    console.error('Error re-ingesting documents:', error);
    throw error;
  }
}

module.exports = {
  loadDocuments,
  ingestDocuments,
  reingestDocuments
};
