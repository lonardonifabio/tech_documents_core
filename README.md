# Tech Documents Core - AI-Powered Document Analysis Platform

A sophisticated document analysis platform that uses AI to automatically process, categorize, and analyze technical documents. Built with Astro, TypeScript, and powered by Ollama for local AI processing.

## 🚀 Features

- **AI-Powered Analysis**: Automatic document processing using Ollama with Gemma3:4b model
- **Smart Categorization**: Documents are automatically categorized (AI, Machine Learning, Data Science, etc.)
- **Knowledge Graph**: Interactive visualization of document relationships
- **Advanced Search**: Multi-faceted search with filters by category, difficulty, and keywords
- **PDF Preview**: Automatic generation of document previews
- **Responsive Design**: Modern, mobile-friendly interface
- **Incremental Processing**: Only processes new or changed documents
- **GitHub Actions Integration**: Automated workflows for document processing

## 🏗️ Architecture

This is a **private repository** that contains the core application code. It works in conjunction with a **public repository** for document storage:

- **Private Repo** (this one): `https://github.com/lonardonifabio/tech_documents_core/`
  - Contains application source code
  - Handles AI processing workflows
  - Deploys to GitHub Pages
  
- **Public Repo**: `https://github.com/lonardonifabio/tech_documents/`
  - Stores PDF documents
  - Contains processed data (documents.json, processed_files.json)
  - Serves as document repository

## 📋 Prerequisites

- Node.js 18+ 
- Python 3.11+
- Git
- Ollama (for local AI processing)

## 🛠️ Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/lonardonifabio/tech_documents_core.git
   cd tech_documents_core
   ```

2. **Install Node.js dependencies**
   ```bash
   npm install
   ```

3. **Install Python dependencies**
   ```bash
   pip install -r scripts/requirements.txt
   ```

4. **Install and setup Ollama**
   ```bash
   # Install Ollama (Linux/macOS)
   curl -fsSL https://ollama.ai/install.sh | sh
   
   # Start Ollama service
   ollama serve &
   
   # Pull the required model
   ollama pull gemma3:4b
   ```

## 🚀 Usage

### Development

```bash
# Start development server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview
```

### Document Processing

The platform automatically processes documents when they are added to the public repository. You can also manually trigger processing:

```bash
# Process all documents
python scripts/incremental_ollama_processor.py

# Force reprocess all documents
python scripts/incremental_ollama_processor.py --force

# Use specific model
OLLAMA_MODEL=gemma3:4b python scripts/incremental_ollama_processor.py
```

### Data Synchronization

Keep your local development environment synchronized with the public repository (source of truth):

```bash
# Sync data from public repository (default behavior)
npm run sync-data

# Force sync data (overwrite local with public repo data)
npm run sync-data-force

# Validate local data files
npm run validate-data

# Show current data status
npm run data-status
```

**Data Flow Architecture:**
- **Public Repository** = Source of Truth for processed data
- **Private Repository** = Application code and processing logic
- **Smart Synchronization** = Timestamp-based protection against data regression
- **Cost Optimization** = Minimal redundant processing and efficient workflows

## 🔄 Automated Workflows

### Document Processing Workflow

Located in `.github/workflows/process-documents.yml`, this workflow:

1. **Triggers on**: 
   - Repository dispatch from public repo when documents are updated
   - Manual dispatch

2. **Smart Data Synchronization**:
   - Always starts with latest data from public repository (source of truth)
   - Validates data integrity before processing
   - Maintains processing history and state

3. **Process**:
   - Fetches documents and data from public repository
   - Sets up Python and Ollama
   - Pulls Gemma3:4b model
   - Processes new/changed documents incrementally
   - Updates `documents.json` and `processed_files.json`
   - Pushes updated data back to public repository

4. **AI Analysis**: Each document is analyzed for:
   - Title and authors extraction
   - Content summarization (600+ characters)
   - Category classification
   - Keyword extraction
   - Technical details identification
   - Business context analysis
   - Q&A generation

### Deployment Workflow (Data-Safe)

Located in `.github/workflows/deploy.yml`, this workflow:

1. **Smart Data Fetching** with timestamp protection:
   - Compares timestamps between public and local data
   - Only overwrites local data if public data is newer
   - Prevents data regression and loss of newer processed data

2. **Data Validation**:
   - Validates JSON integrity before building
   - Creates fallback data if corruption is detected

3. **Build Process**:
   - Generates PDF previews
   - Builds the Astro application with validated data
   - Deploys to GitHub Pages

4. **Cost Optimization**:
   - Efficient data synchronization
   - Minimal redundant processing
   - Smart caching and validation

## 📁 Project Structure

```
tech_documents_core/
├── .github/workflows/          # GitHub Actions workflows
│   ├── process-documents.yml   # Document processing workflow
│   └── deploy.yml             # Deployment workflow
├── scripts/                   # Python processing scripts
│   ├── fixed_ollama_processor.py      # Main document processor
│   ├── incremental_ollama_processor.py # Incremental processor
│   ├── generate_previews.py           # PDF preview generator
│   └── requirements.txt               # Python dependencies
├── src/                       # Astro application source
│   ├── components/           # React/Astro components
│   ├── layouts/             # Page layouts
│   ├── pages/               # Application pages
│   ├── services/            # Business logic
│   └── types/               # TypeScript definitions
├── data/                     # Processed data
│   ├── documents.json       # Document metadata
│   └── processed_files.json # Processing tracking
└── public/                   # Static assets
    └── previews/            # Generated PDF previews
```

## 🤖 AI Processing Details

### Model Configuration

- **Model**: Gemma3:4b (efficient, cost-effective)
- **Host**: Local Ollama instance (127.0.0.1:11434)
- **Processing**: Multi-chunk analysis with overlap
- **Passes**: 4-pass analysis (basic info, keywords, technical, business)

### Document Analysis Pipeline

1. **Text Extraction**: Extract text from PDF (up to 20 pages)
2. **Chunking**: Split into overlapping chunks for better analysis
3. **Multi-pass Analysis**:
   - **Pass 1**: Basic information (title, authors, summary, category)
   - **Pass 2**: Keywords and key concepts
   - **Pass 3**: Technical details (technologies, methodologies, complexity)
   - **Pass 4**: Business context (industry, use cases, stakeholders)
4. **Aggregation**: Combine results from all chunks
5. **Enhancement**: Add compatibility fields and Q&A generation

### Generated Q&A Framework

Each document gets 5 strategic questions:

1. 🔍 **Problem Focus**: What specific problem does this document solve?
2. 💡 **Game Changers**: Which technologies are presented as transformative?
3. 🧭 **Real-world Application**: How can insights be applied practically?
4. 🌍 **Trends & Response**: What shifts are emerging and how to respond?
5. 🔄 **Challenged Assumptions**: What traditional approaches are redefined?

## 🔧 Configuration

### Environment Variables

- `OLLAMA_HOST`: Ollama service host (default: 127.0.0.1:11434)
- `OLLAMA_MODEL`: AI model to use (default: gemma3:4b)
- `FORCE_REPROCESS`: Force reprocess all documents (true/false)

### GitHub Secrets

Required secrets for workflows:

- `GITHUB_TOKEN`: Automatic token for repository access
- `PRIVATE_REPO_PAT`: Personal access token for cross-repo operations

## 📊 Data Structure

### documents.json

Each document entry contains:

```json
{
  "id": "unique_hash",
  "filename": "document.pdf",
  "title": "Document Title",
  "authors": ["Author 1", "Author 2"],
  "summary": "Comprehensive summary...",
  "category": "AI|Machine Learning|Data Science|Analytics|Business|Technology|Research",
  "difficulty": "Basic|Intermediate|Advanced",
  "keywords": ["keyword1", "keyword2"],
  "key_concepts": ["concept1", "concept2"],
  "technologies": ["tech1", "tech2"],
  "methodologies": ["method1", "method2"],
  "use_cases": ["use_case1", "use_case2"],
  "questions_and_answers": ["Q: ... A: ..."],
  "confidence_score": 0.85,
  "upload_date": "2025-01-07T15:30:00",
  "file_size": 1024000
}
```

## 🚀 Deployment

The application is automatically deployed to GitHub Pages at:
`https://lonardonifabio.github.io/tech_documents/`

### Manual Deployment

```bash
# Build and deploy
npm run build
# Files are automatically deployed via GitHub Actions
```

## 🔍 Troubleshooting

### Common Issues

1. **Ollama Connection Failed**
   ```bash
   # Check if Ollama is running
   curl http://localhost:11434/api/tags
   
   # Start Ollama if not running
   ollama serve &
   ```

2. **Model Not Found**
   ```bash
   # Pull the required model
   ollama pull gemma3:4b
   ```

3. **Processing Fails**
   ```bash
   # Check Python dependencies
   pip install -r scripts/requirements.txt
   
   # Run with verbose logging
   python scripts/incremental_ollama_processor.py --force
   ```

4. **Build Issues**
   ```bash
   # Clear cache and reinstall
   rm -rf node_modules package-lock.json
   npm install
   npm run build
   ```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📝 License

This project is private and proprietary. All rights reserved.

## 🆘 Support

For issues and questions:

1. Check the troubleshooting section above
2. Review GitHub Actions logs for workflow issues
3. Ensure all prerequisites are properly installed
4. Verify Ollama service is running and model is available

## 🔄 Workflow Status

- ✅ Document Processing: Automated via GitHub Actions
- ✅ AI Analysis: Ollama + Gemma3:4b integration
- ✅ Deployment: Automatic to GitHub Pages
- ✅ Preview Generation: PDF to image conversion
- ✅ Incremental Updates: Only processes changed files

---

**Built with ❤️ using Astro, TypeScript, and AI**
