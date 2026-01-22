# Consent Craft Engine
<video src="DemoVideo_Trimmed.mov" controls autoplay loop muted style="max-width: 100%; border-radius: 10px; box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1);"></video>

### AI-Powered Regulatory Compliance & Data Minimization Platform

---

## 🚀 Getting Started

Follow these instructions to set up and run the Consent Craft Engine locally on your machine.

### Prerequisites

- **Node.js**: v18 or higher is recommended.
- **npm**: Typically installed with Node.js.
- **Git**: For version control.
- **ChromaDB**: The system requires a vector database running locally on port 8000.

### Installation

1.  **Navigate to the project directory**:
    ```bash
    cd cce
    ```

2.  **Install Frontend Dependencies**:
    ```bash
    npm install
    ```

3.  **Install Backend Dependencies**:
    Go to the backend folder and install its dependencies.
    ```bash
    cd backend
    npm install
    ```

### Configuration

 The backend requires API keys to function (specifically for the Groq LLM).

1.  **Create a `.env` file** in the `backend` directory (`cce/backend/.env`).
2.  Add your API keys. You can use the following template:

    ```env
    # Required for inference
    GROQ_API_KEY=your_groq_api_key

    # Optional / Backup configurations depending on code path
    ANTHROPIC_KEY=your_anthropic_key
    OPENAI_API_KEY=your_openai_key
    ```
    
    *Note: The current configuration in `server.js` primarily uses `GROQ_API_KEY` for the LLM and local embeddings via `@xenova/transformers`, reducing the need for OpenAI embeddings.*

### Running the System

To run the full application, you need to start the Vector Database, Backend, and Frontend.

#### 1. Start ChromaDB
Ensure you have a ChromaDB instance running on **http://localhost:8000**.
If you have Docker installed:
```bash
docker run -p 8000:8000 chromadb/chroma
```
or you can run it via the python CLI if installed locally:
```bash
chroma run --host localhost --port 800
```


#### 2. Start the Backend Server
Open a terminal, navigate to the backend folder, and start the server:
```bash
cd backend
npm start
```
- The server will run on **http://localhost:4000**.
- It will initialize the RAG system and ingest documents from `backend/docs/` on startup.

#### 3. Start the Frontend Application
Open a **new terminal tab/window**, navigate to the project root (`cce`), and run:
```bash
npm run dev
```
- The application will start (usually on **http://localhost:5173**).
- Open the provided URL in your browser to start using the Consent Craft Engine.

---

## Overview

Consent Craft Engine is an AI-powered compliance platform that determines **which personal data attributes are legally allowed to be collected** for a given government or enterprise service.

Unlike generic AI tools, this system does not guess compliance rules.  
It uses **real regulatory documents** and a **Retrieval-Augmented Generation (RAG)** pipeline to ensure that every decision is grounded in law.

---

## Problem Statement

Government and enterprise platforms routinely collect large volumes of personal data.  
However, data protection laws such as **DPDP Act, IT Act and HIPPA** strictly regulate what can be collected for a specific purpose.

Manual compliance checking is:
- Slow
- Error-prone
- Difficult to scale

Generic AI models cannot be trusted for this task because they **hallucinate laws** and do not have access to verified legal sources.

---

## Core Idea

> AI should not guess the law — it must read the law.

Consent Craft Engine enforces this by:
- Storing regulations as structured documents
- Retrieving only relevant laws for each use-case
- Forcing the AI to reason only from those laws

---

## System Architecture

```
Frontend (Governance Layer)
        ↓
Backend API (/analyze)
        ↓
RAG Engine
        ↓
ChromaDB (Regulatory Documents)
        ↓
LLM (Legal Reasoning)
        ↓
JSON Compliance Output
```

---

## Frontend Governance Layer

The UI restricts users to selecting:
- Domain
- Purpose
- Sub-purpose

These values come from a **master policy dictionary** and cannot be freely edited.  
This prevents:
- Illegal use-cases
- Prompt injection
- Ambiguous legal contexts

Only approved government and enterprise services can be analyzed.

---

## Regulatory Knowledge Base

All laws and compliance rules are stored as structured JSON documents inside:

```
backend/docs/
```

Each document defines:
- Domain  
- Purpose  
- Sub-purposes  
- Required attributes  
- Unnecessary attributes  
- Regulatory references  

These files are the **single source of legal truth** for the system.

---

## RAG Engine & ChromaDB

The regulatory documents are converted into vector embeddings and stored in **ChromaDB**.

When a request is made:
1. A semantic query is built from the domain, purpose, sub-purpose, and attributes  
2. ChromaDB retrieves the most relevant laws  
3. Only those laws are passed to the AI model  

This ensures **precision, traceability, and legal grounding**.

---

## Role of the LLM

The Large Language Model (LLM) is used **only as a reasoning engine**.

It does NOT:
- Invent regulations  
- Use training data as law  

It MUST:
- Read the retrieved regulatory documents  
- Justify every decision based on them  

If a rule is not found in the retrieved context, the attribute is treated as unnecessary.

---

## Compliance Output

The system produces structured JSON output containing:
- Required attributes  
- Optional attributes  
- Unnecessary attributes  
- Legal justification  
- Privacy risk level  

This output is:
- Machine-readable  
- Audit-ready  
- Suitable for governance workflows  

---

## Security & Privacy

- API keys are stored in environment variables  
- No user data is stored  
- AI access is restricted to the backend  
- The system follows privacy-by-design principles  

---

## Limitations

- Regulatory documents must be updated manually  
- Coverage depends on the available laws  
- Some complex legal interpretations may still require human review  

---

## Future Scope

- Add more government domains and schemes  
- Enable real-time regulation updates  
- Integrate with e-governance portals  
- Auto-generate legally compliant data collection forms  

---

## Conclusion

Consent Craft Engine demonstrates how **AI can be safely used in government systems** by grounding every decision in verified laws.  
It enables **privacy-first, regulation-aware, and auditable data collection** at scale.

---

## References

- Digital Personal Data Protection (DPDP) Act, India  
- HIPAA  
- IT Act
