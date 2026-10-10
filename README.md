# DocuMind RAG — Production PDF Question Answering Web Application

DocuMind RAG is a production-oriented, Retrieval-Augmented Generation (RAG) platform built with Next.js, Supabase PostgreSQL with `pgvector`, Tesseract OCR, and configurable OpenAI & Gemini AI providers.

It enables users to upload normal or scanned PDF documents, automatically extracts and cleans text, converts pages into semantic vector chunks, indexes them in a pgvector similarity database, and provides grounded AI answers backed by exact page-level citations and an integrated PDF viewer.

---

## 🌟 Key Features

- **📄 Drag-and-Drop Multi-PDF Upload**: Upload multiple PDFs up to 25MB each with progress tracking, file validation, and duplicate prevention.
- **🧠 Automatic Scanned PDF & OCR Pipeline**: Automatically detects low-quality / scanned PDF pages and triggers Tesseract OCR supporting English & Hindi (`eng+hin`).
- **✂️ Intelligent Semantic Chunking**: Splits extracted document text into ~800–1200 token chunks with ~100–200 token overlap preserving headings and paragraphs.
- **⚡ pgvector Cosine Similarity Search**: Indexes 1536-dimensional embeddings in PostgreSQL with HNSW cosine index, enforcing Row Level Security (RLS) and user isolation.
- **🤖 Multi-Model LLM Provider Abstraction**: Switch seamlessly between OpenAI (`gpt-4o-mini`, `text-embedding-3-small`) and Google Gemini (`gemini-1.5-flash`, `text-embedding-004`) via environment variables.
- **🛡️ Anti-Prompt-Injection Protection**: Treats PDF document content strictly as untrusted data using strict XML data boundaries to prevent instruction overriding.
- **📑 Clickable Source Page Citations**: Every answer includes page-level citations. Clicking a citation opens the PDF directly to the referenced page.
- **🔍 Integrated PDF Viewer**: Canvas PDF viewer with zoom in/out, text search, page jump, full screen, and page text download.
- **📊 Document Dashboard & Admin Panel**: Comprehensive overview of documents, page counts, chunk counts, processing statuses, and storage metrics.

---

## 🛠️ Architecture & Tech Stack

### Frontend & App Framework
- **Next.js 16 (App Router)** with TypeScript
- **React 19**
- **Tailwind CSS v4** & custom Glassmorphism aesthetic tokens
- **Lucide Icons**
- **React Markdown** & **Remark GFM** for chat rendering

### Backend & API
- Next.js API Routes & Server Actions
- Zod schema validation
- Sliding-window rate limiting

### Database & Vector Search
- **PostgreSQL** hosted on **Supabase**
- **`pgvector`** extension with HNSW cosine similarity index
- **Row Level Security (RLS)** policies for user data isolation

### AI & Embeddings Pipeline
- **OpenAI API**: `gpt-4o-mini` & `text-embedding-3-small`
- **Google Gemini API**: `gemini-1.5-flash` & `text-embedding-004`
- Unified embedding & chat provider abstraction (`lib/ai/provider.ts`)

### PDF Parsing & OCR
- **`pdf-parse`**: Native PDF text extraction
- **`tesseract.js`**: Multi-language OCR engine (`eng+hin`)

---

## 📁 Directory Structure

```
d:\RAG_PDF_READER/
├── src/
│   ├── app/
│   │   ├── page.tsx                  # Landing Page (Hero, Features, Demo)
│   │   ├── layout.tsx                # Root layout & global metadata
│   │   ├── dashboard/page.tsx        # Document Dashboard & Stats
│   │   ├── chat/page.tsx             # Interactive RAG Chat UI
│   │   ├── documents/[id]/page.tsx   # PDF detail page & Chunk Inspector
│   │   ├── admin/page.tsx            # Admin Platform Oversight
│   │   ├── auth/
│   │   │   ├── login/page.tsx        # Supabase Email & OAuth Login
│   │   │   └── signup/page.tsx       # Account Signup
│   │   └── api/
│   │       ├── documents/            # PDF upload & list endpoints
│   │       ├── chat/                 # Streaming RAG answer endpoint
│   │       ├── conversations/        # Chat session management
│   │       └── ocr/                  # Standalone OCR runner
│   ├── components/
│   │   ├── navbar.tsx                # Global top navigation
│   │   ├── upload-modal.tsx          # Drag & drop uploader
│   │   ├── pdf-viewer.tsx            # Integrated PDF canvas viewer
│   │   ├── citation-badge.tsx        # Citation link component
│   │    font-status-badge.tsx          # Status indicator badge
│   └── lib/
│       ├── ai/                       # OpenAI, Gemini & Embedding abstractions
│       ├── rag/                      # Chunking, Retrieval, Reranking & Answer builder
│       ├── pdf/                      # Native parser, OCR & pipeline orchestrator
│       ├── db/                       # Supabase server/browser/admin clients & queries
│       └── security/                 # Prompt injection guard & input validation
├── supabase/
│   └── migrations/
│       └── 20261005000000_init_rag.sql # Complete database SQL schema & RPC function
├── scripts/
│   └── test-rag.ts                   # Automated test suite
├── .env.example                      # Environment variables template
└── README.md
```

---

## ⚡ Quick Start & Local Setup

### 1. Prerequisites
- **Node.js**: v18.0.0 or higher (v24+ recommended)
- **NPM**: v9+
- **Supabase Account** (or local Supabase instance)
- **OpenAI** or **Gemini API Key**

### 2. Clone & Install Dependencies
```bash
cd d:\RAG_PDF_READER
npm install
```

### 3. Environment Variables
Copy `.env.example` to `.env.local`:
```bash
cp .env.example .env.local
```

Configure the following variables inside `.env.local`:
```ini
NEXT_PUBLIC_SUPABASE_URL=https://your-supabase-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-supabase-service-role-key

LLM_PROVIDER=openai
OPENAI_API_KEY=sk-proj-your-openai-key
GEMINI_API_KEY=AIzaSy-your-gemini-key

EMBEDDING_PROVIDER=openai
MAX_FILE_SIZE_MB=25
TOP_K_RESULTS=5
SIMILARITY_THRESHOLD=0.60
DEFAULT_CHUNK_SIZE=1000
DEFAULT_CHUNK_OVERLAP=150
```

---

## 🗄️ Supabase & `pgvector` Setup

1. Open your [Supabase Dashboard](https://app.supabase.com) and create a new project.
2. Go to the **SQL Editor** tab.
3. Copy the contents of `supabase/migrations/20261005000000_init_rag.sql` and run the script.
   - This automatically enables `vector` and `uuid-ossp` extensions.
   - Creates `documents`, `document_pages`, `document_chunks`, `conversations`, and `messages` tables.
   - Configures `hnsw` vector index on `document_chunks(embedding vector_cosine_ops)`.
   - Defines Row Level Security (RLS) policies.
   - Creates the `match_document_chunks` RPC similarity search function.

---

## 🧪 Running Automated Tests

Run the test suite verifying file validation, semantic chunking, prompt injection protection, and reranking:

```bash
npm run test
```

Expected Output:
```
==================================================
🧪 RUNNING PDF RAG SUITE & SECURITY TEST VERIFICATION
==================================================

--- Test Suite 1: PDF Input Validation ---
✅ [PASS] Accepts valid PDF document file
✅ [PASS] Rejects invalid non-PDF file extension/mime-type

--- Test Suite 2: Semantic Token/Character Chunking ---
✅ [PASS] Splits page text into multiple semantic chunks
✅ [PASS] Preserves page number metadata in chunk
✅ [PASS] Preserves document name in chunk metadata

--- Test Suite 3: Anti-Prompt-Injection Protection ---
✅ [PASS] Neutralizes malicious prompt injection triggers inside PDFs
✅ [PASS] Wraps context inside untrusted data tags
✅ [PASS] Includes explicit security boundaries

--- Test Suite 4: Snippet Reranking ---
✅ [PASS] Boosts relevance rank for query term matches

==================================================
SUMMARY: 9 Passed, 0 Failed
==================================================
```

---

## 🚀 Running Local Development Server

Start the local Next.js dev server:
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## 🌐 Production Build & Vercel Deployment

### Build Locally
```bash
npm run build
npm run start
```

### Deploy to Vercel
1. Push your code repository to GitHub.
2. Import the repository in [Vercel](https://vercel.com).
3. Add Environment Variables (`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `OPENAI_API_KEY`, etc.) in Vercel Project Settings.
4. Click **Deploy**.

---

## ❓ Troubleshooting

| Issue | Cause | Solution |
|---|---|---|
| **Vector Match RPC Error** | `match_document_chunks` function missing in DB | Re-run `supabase/migrations/20261005000000_init_rag.sql` in Supabase SQL editor. |
| **OCR Fails on Scanned PDFs** | Missing language pack or memory limit | Tesseract automatically downloads `eng.traineddata` and `hin.traineddata` on first run. Ensure server has outbound HTTP connectivity. |
| **Fallback Vector Search Warning** | Missing API Keys | Add valid `OPENAI_API_KEY` or `GEMINI_API_KEY` to `.env.local`. |

---

## 📜 License

MIT License © 2026 DocuMind RAG SaaS.
