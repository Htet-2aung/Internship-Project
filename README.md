# AI Assistant Internship Project
## Project Status Report

Date: 16 September 2026

## 1. Project Overview

This project is a private AI assistant application built as a full-stack system. It provides user authentication, private conversation history, a ChatGPT-style interface, basic retrieval-augmented generation, and a standalone Python RAG learning demo.

The current implementation covers the main Week 1, Week 2, and Week 3 internship objectives.

## 2. Current System Status

The following services are implemented and tested:

- PostgreSQL database running through Docker Compose
- NestJS backend API running on port 3000
- React and Vite frontend running on port 5173
- Prisma database schema and generated client
- JWT-based authentication
- Persistent private chat sessions and message history
- Basic RAG retrieval and answer generation
- Standalone Python RAG demonstration

Current URLs:

- Frontend: http://localhost:5173/chat
- Backend: http://localhost:3000

## 3. Week 1 Progress: Backend Foundation

Completed:

- Created the NestJS backend structure
- Configured PostgreSQL with Docker Compose
- Configured Prisma 7.10.0
- Added Prisma PostgreSQL adapter support
- Added environment variable loading with dotenv
- Added a User database model
- Added password hashing with bcrypt
- Added JWT authentication
- Added Passport JWT strategy
- Added registration and login endpoints
- Added authenticated profile endpoint
- Added global frontend handling for expired or invalid JWT tokens

Authentication endpoints:

- POST /auth/register
- POST /auth/login
- GET /auth/me

## 4. Week 2 Progress: Frontend and Full-Stack Integration

Completed:

- Built the React frontend with Vite
- Added React Router route protection
- Added Zustand authentication state management
- Added Axios API client with JWT request interceptor
- Added login page
- Added signup page
- Added private chat route
- Added responsive mobile navigation
- Added conversation creation
- Added conversation rename functionality
- Added conversation deletion
- Added conversation search
- Added keyboard shortcut support for search
- Added persistent message history
- Added profile menu
- Added settings modal
- Added logout functionality
- Removed the admin dashboard and public user directory
- Ensured users cannot view other users' email addresses through the frontend

The authenticated user experience is now focused on a personal ChatGPT-style workspace rather than an administration dashboard.

## 5. Week 3 Progress: AI and RAG Features

Completed:

- Added a knowledge document model
- Added seeded knowledge documents about React, RAG, PostgreSQL, and Prisma
- Added chat session and chat message models
- Added protected chat API endpoints
- Added retrieval over the knowledge base
- Added PostgreSQL pgvector extension and `rag_chunks` vector table
- Added Python ingestion and nearest-neighbor vector search with cosine distance
- Added optional OpenAI embedding retrieval using text-embedding-3-small
- Added optional OpenAI answer generation using gpt-4o-mini
- Added local grounded fallback when OpenAI is unavailable
- Added handling for OpenAI rate-limit and insufficient-quota errors
- Added animated assistant thinking states in the frontend
- Renamed the assistant branding to ChaiGPT in the frontend

Chat endpoints:

- GET /chat/sessions
- POST /chat/sessions
- PATCH /chat/sessions/:id
- DELETE /chat/sessions/:id
- GET /chat/sessions/:id/messages
- POST /chat/sessions/:id/messages

## 6. Python RAG Demonstration

Location:

Week3/python-rag

The Python demo implements the following pipeline:

1. Reads knowledge from knowledge.txt.
2. Splits the text into overlapping chunks.
3. Scores and retrieves relevant chunks.
4. Uses OpenAI embeddings when API access is available.
5. Uses a local lexical retrieval fallback when OpenAI is unavailable.
6. Generates an answer from retrieved context.
7. Returns a safe no-answer response when the knowledge base does not contain relevant information.

The demo has been tested with both a known question and an unrelated question.

Example command:

python rag_demo.py --question "What is RAG?"

The OpenAI account currently has no remaining credits, so the local grounded fallback is being used successfully. The application does not crash when OpenAI returns a 429 insufficient-quota error.

## 7. Design and User Interface Progress

The frontend has been redesigned with a custom visual identity:

- Login and signup use an indigo, cyan, and lime palette
- Chat uses the same product palette for visual consistency
- Chat includes a private workspace layout
- Chat includes a conversation library sidebar
- Chat includes responsive mobile behavior
- Chat includes profile, settings, and logout controls
- Chat includes a phased thinking animation while generating responses
- Chat includes loading, error, empty, and no-search-results states
- The interface is no longer styled as an admin dashboard

## 8. Technology Stack

Frontend:

- React 19
- TypeScript
- Vite
- React Router
- Zustand
- Axios
- Tailwind CSS

Backend:

- NestJS 12
- TypeScript
- Prisma 7.10.0
- PostgreSQL 15
- Passport JWT
- bcrypt
- dotenv

AI and RAG:

- Python 3.9+
- OpenAI Python SDK
- python-dotenv
- text-embedding-3-small
- gpt-4o-mini
- Local lexical retrieval fallback

Infrastructure:

- Docker Compose
- PostgreSQL container

Containerization:

- PostgreSQL, NestJS API, React/Vite frontend, and Python RAG demo have Docker images
- Docker Compose starts the database, API, and frontend together
- The Python RAG demo is available as an optional Compose profile
- PostgreSQL health checks prevent the API from starting before the database is ready
- The backend container uses Node 22 to match current package engine requirements

## 9. Validation Results

Verified successfully:

- Prisma database schema synchronization
- Prisma client generation
- Backend TypeScript build
- Frontend TypeScript and Vite build
- Backend HTTP response on port 3000
- Frontend HTTP response on port 5173
- User registration and login
- Protected chat sessions endpoint
- Chat session creation
- Chat message persistence
- RAG retrieval response
- Python RAG syntax compilation
- Python RAG known-question answer
- Python RAG unrelated-question fallback
- Expired or invalid JWT redirect behavior

## 10. How To Run The Project

### Dockerized Run

From the repository root:

DATABASE_URL and JWT_SECRETKEY should be added as a

```bash
git clone https://github.com/Htet-2aung/Internship-Project.git
cd Internship-Project
cp .env.example .env
# (You should add your own JWT secret and local DB credentials to /backend/.env otherwise the build will crashed due to prisma schema generation failure.)
docker compose build
docker compose up -d db api frontend
```

Open the application at:

http://localhost:5173/chat

Check the running containers:

```bash
docker compose ps
```

Run the Python RAG demo inside Docker:

```bash
docker compose --profile rag run --rm rag
```

To enable OpenAI inside the RAG container, export the variables before running it:

```bash
export OPENAI_API_KEY=your_key_here
export OPENAI_MODEL=gpt-4o-mini
docker compose --profile rag run --rm rag
```

Stop the Dockerized project:

```bash
docker compose down
```

The database volume is preserved by default. To remove containers and database data:

```bash
docker compose down -v
```

Start PostgreSQL:

```bash
docker compose up -d db
```

Start the backend:

```bash
cd Week1and2/backend
npx prisma db push
npm run start
```

Start the frontend in a second terminal:

```bash
cd Week1and2/frontend
npm run dev
```

Open the application:

http://localhost:5173/chat

Run the Python RAG demo:

```bash
cd Week3/python-rag
source .venv/bin/activate
python rag_demo.py --question "What is RAG?"
```

## 11. Current Limitations

- The OpenAI account currently has no remaining credits, so the Python demo and backend RAG service use local fallback behavior when OpenAI is unavailable.
- The Python pgvector path uses deterministic local vectors when OpenAI quota is unavailable; live semantic embeddings require API credits.
- The backend currently uses Prisma db push for development; production should use versioned Prisma migrations.
- Automated end-to-end test coverage should be expanded for chat sessions, authentication expiry, and RAG responses.
- The current knowledge base is seeded sample content and should later support document upload and ingestion.

## 12. Recommended Next Steps

1. Add credits or a valid OpenAI project configuration for live embedding and LLM responses.
2. Enable PostgreSQL pgvector.
3. Store document chunks and embeddings in the database.
4. Add document upload and ingestion APIs.
5. Add automated backend and frontend end-to-end tests.
6. Add streaming assistant responses.
7. Add conversation export and deletion confirmation.
8. Begin Week 4 LangGraph and agent workflow development.

## 13. Mentor Summary

The project currently has a functioning full-stack private AI assistant foundation. Users can create accounts, log in securely, access a private ChatGPT-style workspace, create and manage conversations, persist message history, and receive grounded answers from a knowledge base. The Python RAG demo separately demonstrates document loading, chunking, retrieval, and grounded answer generation. OpenAI quota limitations are handled gracefully through a local fallback path, allowing development and testing to continue without API credits.
