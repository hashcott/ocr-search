# RAG Document Search System

A powerful document search system using RAG (Retrieval Augmented Generation) with support for multiple file formats, vector search, and AI-powered answers.

## Features

- 📄 **Multi-format Support**: PDF, DOCX, DOC, XML, TXT with OCR capabilities
- 🔍 **Vector Search**: Powered by Qdrant for semantic search
- 🤖 **AI Integration**: Support for Ollama and OpenAI models
- 💾 **Flexible Storage**: S3, MinIO, or local file storage
- 🔐 **Authentication**: Secure user authentication with role-based access
- 🎨 **Modern UI**: Built with Next.js and shadcn/ui
- 🚀 **Easy Setup**: One-time setup wizard for configuration
- 📦 **Extensible**: Easy to add new file processors and storage adapters

## Tech Stack

- **Frontend**: Next.js 14, shadcn/ui, TailwindCSS
- **Backend**: Node.js, tRPC, LangChain.js
- **Database**: MongoDB (metadata), Qdrant (vector storage)
- **Authentication**: NextAuth.js v5
- **File Storage**: S3/MinIO/Local
- **AI/ML**: Ollama or OpenAI for embeddings and chat

## Getting Started

### Prerequisites

- Node.js >= 18.0.0
- npm >= 9.0.0
- MongoDB
- Qdrant (or use Docker)
- Ollama (optional, for local LLM)

### Installation

1. Clone the repository:
```bash
git clone <repo-url>
cd search-pdf
```

2. Install dependencies:
```bash
npm install
```

3. Set up environment variables:
```bash
# Copy example env files
cp apps/server/.env.example apps/server/.env
cp apps/web/.env.example apps/web/.env
```

4. Start development services (MongoDB, Qdrant):
```bash
docker-compose up -d
```

5. Run the development server:
```bash
npm run dev
```

6. Open [http://localhost:3000](http://localhost:3000) and complete the setup wizard.

## Project Structure

```
search-pdf/
├── apps/
│   ├── web/          # Next.js frontend
│   └── server/       # tRPC backend
├── packages/
│   ├── shared/       # Shared types and schemas
│   └── config/       # Shared configurations
├── docker-compose.yml
└── turbo.json
```

## Configuration

The system can be configured through:
1. Setup wizard (first-time setup)
2. Environment variables
3. Admin settings page

### Storage Options

- **Local**: Store files on the local filesystem
- **S3**: Use Amazon S3 or compatible services
- **MinIO**: Self-hosted S3-compatible storage

### LLM Options

- **Ollama**: Run models locally (llama3, mistral, etc.)
- **OpenAI**: Use GPT-4, GPT-3.5, or other OpenAI models

## Usage

### Uploading Documents

1. Navigate to the upload page
2. Drag and drop files or click to select
3. Wait for processing to complete
4. Documents are automatically indexed for search

### Searching Documents

1. Enter your query in the search box
2. Get AI-powered answers with source citations
3. View relevant document chunks
4. Access original documents

## Development

```bash
# Run all apps in development mode
npm run dev

# Build all apps
npm run build

# Run linting
npm run lint

# Type checking
npm run type-check
```

## Docker Deployment

```bash
# Build and start all services
docker-compose up -d

# View logs
docker-compose logs -f

# Stop services
docker-compose down
```

## Extending the System

### Adding New File Processors

1. Implement the `FileProcessor` interface
2. Register in the processor factory
3. Add MIME type to constants

### Adding New Storage Adapters

1. Implement the `StorageAdapter` interface
2. Register in the storage factory
3. Add configuration options

### Adding New Vector Stores

1. Implement the `VectorStoreAdapter` interface
2. Update vector service factory
3. Add configuration in setup wizard

## License

MIT

## Support

For issues and questions, please open an issue on GitHub.

