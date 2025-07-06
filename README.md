# AI & Data Science Document Library - Private Repository

This is the private repository containing the source code for the AI & Data Science Document Library. The application fetches documents and data from the public repository and builds a static site deployed to GitHub Pages.

## Architecture

- **Private Repository** (this repo): Contains all source code, components, and build configuration
- **Public Repository**: Contains only documents and data files
- **Deployment**: GitHub Actions workflow that fetches documents from public repo and deploys the application

## Setup

1. Install dependencies:
```bash
npm install
```

2. Create data and documents directories (these will be populated from the public repo):
```bash
mkdir -p data documents
echo "[]" > data/documents.json
```

3. Start development server:
```bash
npm run dev
```

## Deployment

The application is automatically deployed when:
1. Code is pushed to the main branch of this private repository
2. Documents are updated in the public repository (triggers this repo via repository_dispatch)

## GitHub Actions Setup

The deployment requires:
- `PRIVATE_REPO_PAT` secret in the public repository
- `PUBLIC_REPO_PAT` secret in this private repository (optional)
- GitHub Pages enabled for deployment

## Development

- Source code is in `src/`
- Components are in `src/components/`
- Types are in `src/types/`
- Layouts are in `src/layouts/`
- Pages are in `src/pages/`

## Migration Notes

This repository was created as part of migrating from a public repository to a private code + public documents architecture for better code protection while maintaining document accessibility.
