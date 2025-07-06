import React, { useState, useEffect } from 'react';
import DocumentLibrary from './DocumentLibrary';
import KnowledgeGraph from './KnowledgeGraph';
import ErrorBoundary from './ErrorBoundary';
import PDFModal from './PDFModal';
import type { DocumentNode } from '../types/knowledge-graph';

interface Document {
  id: string;
  filename: string;
  title?: string;
  summary: string;
  authors?: string[];
  keywords: string[];
  category: string;
  difficulty: string;
  filepath: string;
  file_size: number;
  upload_date: string;
  content_preview?: string;
}

interface DocumentLibraryWithGraphProps {
  initialView?: 'library' | 'graph';
}

const DocumentLibraryWithGraph: React.FC<DocumentLibraryWithGraphProps> = ({ 
  initialView = 'library' 
}) => {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [filteredDocuments, setFilteredDocuments] = useState<Document[]>([]);
  const [currentView, setCurrentView] = useState<'library' | 'graph'>(initialView);
  const [selectedDocument, setSelectedDocument] = useState<DocumentNode | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalDocument, setModalDocument] = useState<Document | null>(null);

  // Determine if Knowledge Graph button should be active
  const isKnowledgeGraphActive = filteredDocuments.length > 0 ? filteredDocuments.length <= 50 : documents.length <= 50;

  // Load documents
  useEffect(() => {
    const loadDocuments = async () => {
      try {
        // Try different paths for documents.json based on environment
        const isDev = import.meta.env.DEV;
        const basePath = isDev ? '' : '/tech_documents';
        const possiblePaths = [
          `${basePath}/data/documents.json`,
          '/data/documents.json',
          './data/documents.json'
        ];

        let data = null;
        for (const path of possiblePaths) {
          try {
            const response = await fetch(path);
            if (response.ok) {
              data = await response.json();
              break;
            }
          } catch (error) {
            console.warn(`Failed to load from ${path}:`, error);
          }
        }

        if (data) {
          setDocuments(data);
        } else {
          console.error('Could not load documents from any path');
          setDocuments([]);
        }
      } catch (error) {
        console.error('Error loading documents:', error);
        setDocuments([]);
      } finally {
        setIsLoading(false);
      }
    };

    loadDocuments();
  }, []);

  // Register service worker
  useEffect(() => {
    if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
      const isDev = import.meta.env.DEV;
      const swPath = isDev ? '/sw.js' : '/tech_documents/sw.js';
      navigator.serviceWorker.register(swPath)
        .then((registration) => {
          console.log('Service Worker registered:', registration);
        })
        .catch((error) => {
          console.warn('Service Worker registration failed:', error);
        });
    }
  }, []);

  // Convert Document to DocumentNode for knowledge graph
  const convertToDocumentNodes = (docs: Document[]): DocumentNode[] => {
    return docs.map(doc => ({
      ...doc,
      title: doc.title || doc.filename,
      authors: doc.authors || [],
      content_preview: doc.content_preview || doc.summary.substring(0, 200) + '...'
    }));
  };

  const handleNodeClick = (node: DocumentNode) => {
    setSelectedDocument(node);
    // Find the full document data from the documents array
    const fullDocument = documents.find(doc => doc.id === node.id);
    if (fullDocument) {
      setModalDocument(fullDocument);
      setIsModalOpen(true);
    }
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setModalDocument(null);
  };

  const handleNodeHover = (_node: DocumentNode | null) => {
    // Could be used for additional hover effects
  };

  const handleKnowledgeGraphClick = () => {
    setCurrentView('graph');
  };

  const getDocumentPreviewUrl = (filepath: string) => {
    const githubRawUrl = `https://raw.githubusercontent.com/lonardonifabio/tech_documents/main/${filepath}`;
    return `https://mozilla.github.io/pdf.js/web/viewer.html?file=${encodeURIComponent(githubRawUrl)}`;
  };

  const getGitHubPreviewUrl = (filepath: string) => {
    return `https://github.com/lonardonifabio/tech_documents/blob/main/${filepath}`;
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <div className="text-lg text-gray-600">Loading document library...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center py-4 gap-4">
            <div className="flex-1">
              <h1 className="text-xl sm:text-2xl font-bold text-gray-900">
                AI & Data Science Document Library
              </h1>
              <p className="text-xs sm:text-sm text-gray-600 mt-1">
                {documents.length} documents • Interactive knowledge graph powered by AI
              </p>
            </div>
            
            {/* View Toggle */}
            <div className="flex items-center space-x-1 bg-gray-100 rounded-lg p-1 w-full sm:w-auto">
              <button
                onClick={() => setCurrentView('library')}
                className={`flex-1 sm:flex-none px-3 sm:px-4 py-2 text-xs sm:text-sm font-medium rounded-md transition-colors ${
                  currentView === 'library'
                    ? 'bg-white text-gray-900 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                <span className="hidden sm:inline">📚 Library View</span>
                <span className="sm:hidden">📚 Library</span>
              </button>
              <button
                onClick={() => setCurrentView('graph')}
                disabled={!isKnowledgeGraphActive}
                className={`flex-1 sm:flex-none px-3 sm:px-4 py-2 text-xs sm:text-sm font-medium rounded-md transition-colors ${
                  currentView === 'graph'
                    ? 'bg-white text-gray-900 shadow-sm'
                    : isKnowledgeGraphActive
                    ? 'text-gray-600 hover:text-gray-900'
                    : 'text-gray-400 cursor-not-allowed'
                }`}
                title={
                  isKnowledgeGraphActive
                    ? 'Open Knowledge Graph'
                    : `Knowledge Graph unavailable (${filteredDocuments.length > 0 ? filteredDocuments.length : documents.length} results > 50 limit)`
                }
              >
                <span className="hidden sm:inline">
                  🕸️ Knowledge Graph
                  {!isKnowledgeGraphActive && (
                    <span className="ml-1 text-xs">
                      ({filteredDocuments.length > 0 ? filteredDocuments.length : documents.length}/50)
                    </span>
                  )}
                </span>
                <span className="sm:hidden">
                  🕸️ Graph
                  {!isKnowledgeGraphActive && (
                    <span className="ml-1 text-xs">
                      ({filteredDocuments.length > 0 ? filteredDocuments.length : documents.length}/50)
                    </span>
                  )}
                </span>
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {currentView === 'library' ? (
          <div className="bg-white rounded-lg shadow-sm">
            <DocumentLibrary 
              onKnowledgeGraphClick={handleKnowledgeGraphClick}
              onFilteredDocumentsChange={setFilteredDocuments}
            />
          </div>
        ) : (
          <div className="space-y-6">
            {/* Back to Library Button */}
            <div className="flex items-center justify-between">
              <button
                onClick={() => setCurrentView('library')}
                className="flex items-center gap-2 px-4 py-2 text-blue-600 hover:text-blue-800 transition-colors"
              >
                ← Back to Library
              </button>
              <div className="text-sm text-gray-600">
                Showing knowledge graph for {filteredDocuments.length > 0 ? filteredDocuments.length : documents.length} documents
                {filteredDocuments.length > 0 && filteredDocuments.length !== documents.length && (
                  <span className="text-gray-400"> (filtered from {documents.length} total)</span>
                )}
              </div>
            </div>

            {/* Knowledge Graph Info */}
            <div className="bg-white rounded-lg shadow-sm p-6">
              <div className="flex items-start justify-between">
                <div>
                  <h2 className="text-xl font-semibold text-gray-900 mb-2">
                    Interactive Knowledge Graph
                  </h2>
                  <p className="text-gray-600 text-sm mb-4">
                    Explore document relationships based on AI-generated embeddings. 
                    Documents are clustered by topic and connected by semantic similarity.
                    <span className="block mt-2 text-blue-600 font-medium">
                      📊 Input: {documents.length} documents from search results
                    </span>
                  </p>
                  <div className="flex flex-wrap gap-4 text-xs text-gray-500">
                    <div className="flex items-center gap-1">
                      <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                      <span>Node size = File size</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                      <span>Colors = AI-detected topics</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <div className="w-8 h-0.5 bg-gray-400"></div>
                      <span>Links = Semantic similarity</span>
                    </div>
                  </div>
                </div>
                
                {selectedDocument && (
                  <div className="ml-6 p-4 bg-gray-50 rounded-lg max-w-sm">
                    <h3 className="font-medium text-sm mb-2">Selected Document:</h3>
                    <p className="text-sm font-semibold mb-1">{selectedDocument.title}</p>
                    <p className="text-xs text-gray-600 mb-3">
                      {selectedDocument.summary.substring(0, 100)}...
                    </p>
                    <div className="flex gap-2">
                      <a
                        href={getDocumentPreviewUrl(selectedDocument.filepath)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs bg-blue-600 text-white px-2 py-1 rounded hover:bg-blue-700"
                      >
                        View PDF
                      </a>
                      <a
                        href={getGitHubPreviewUrl(selectedDocument.filepath)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs border border-gray-300 text-gray-700 px-2 py-1 rounded hover:bg-gray-50"
                      >
                        GitHub
                      </a>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Knowledge Graph */}
            <div className="bg-white rounded-lg shadow-sm p-3 sm:p-6">
              <ErrorBoundary
                fallback={
                  <div className="p-6 bg-red-50 border border-red-200 rounded-lg">
                    <div className="flex items-center gap-2 text-red-800 mb-3">
                      <span className="text-lg">⚠️</span>
                      <h3 className="font-semibold">Knowledge Graph Error</h3>
                    </div>
                    <p className="text-red-700 text-sm mb-4">
                      The knowledge graph failed to load. This might be due to:
                    </p>
                    <ul className="text-red-700 text-sm mb-4 list-disc list-inside">
                      <li>Ollama not running locally (required for AI embeddings)</li>
                      <li>CORS configuration issues</li>
                      <li>Large dataset processing errors</li>
                      <li>Browser compatibility issues</li>
                    </ul>
                    <div className="flex gap-3">
                      <button
                        onClick={() => typeof window !== 'undefined' ? window.location.reload() : undefined}
                        className="px-4 py-2 bg-red-600 text-white text-sm rounded hover:bg-red-700 transition-colors"
                      >
                        Reload Page
                      </button>
                      <button
                        onClick={() => setCurrentView('library')}
                        className="px-4 py-2 border border-red-300 text-red-700 text-sm rounded hover:bg-red-50 transition-colors"
                      >
                        Back to Library
                      </button>
                    </div>
                  </div>
                }
              >
                <KnowledgeGraph
                  documents={convertToDocumentNodes(filteredDocuments.length > 0 ? filteredDocuments : documents)}
                  width={typeof window !== 'undefined' ? Math.min(window.innerWidth - 100, 1000) : 1000}
                  height={typeof window !== 'undefined' ? Math.min(window.innerHeight - 300, 700) : 700}
                  onNodeClick={handleNodeClick}
                  onNodeHover={handleNodeHover}
                />
              </ErrorBoundary>
            </div>

            {/* Instructions */}
            <div className="bg-blue-50 rounded-lg p-6">
              <h3 className="text-lg font-semibold text-blue-900 mb-3">
                How to Use the Knowledge Graph
              </h3>
              <div className="grid md:grid-cols-2 gap-4 text-sm text-blue-800">
                <div>
                  <h4 className="font-medium mb-2">🖱️ Interactions:</h4>
                  <ul className="space-y-1 text-blue-700">
                    <li>• <strong>Click</strong> nodes to open document preview popup</li>
                    <li>• <strong>Hover</strong> to see document previews</li>
                    <li>• <strong>Drag</strong> nodes to reposition them</li>
                    <li>• <strong>Scroll</strong> to zoom in/out</li>
                  </ul>
                </div>
                <div>
                  <h4 className="font-medium mb-2">🎯 Features:</h4>
                  <ul className="space-y-1 text-blue-700">
                    <li>• <strong>Category filtering</strong> to focus on specific areas</li>
                    <li>• <strong>Tag filtering</strong> based on available keywords</li>
                    <li>• <strong>Topic filtering</strong> by AI-detected themes</li>
                    <li>• <strong>Semantic connections</strong> show related documents</li>
                    <li>• <strong>Offline support</strong> via service worker caching</li>
                    <li>• <strong>AI-powered</strong> topic detection and clustering</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="bg-white border-t mt-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex flex-col md:flex-row justify-between items-center text-sm text-gray-600">
            <div>
              <p>
                Powered by{' '}
                <a href="https://d3js.org/" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                  D3.js
                </a>
                {' '}and{' '}
                <a href="https://ollama.ai/" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                  Ollama
                </a>
                {' '}• Built with{' '}
                <a href="https://astro.build/" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                  Astro
                </a>
                {' '}and{' '}
                <a href="https://reactjs.org/" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                  React
                </a>
              </p>
            </div>
            <div className="mt-2 md:mt-0">
              <p>
                Interactive Knowledge Graph • Bundle size optimized • Works offline
              </p>
            </div>
          </div>
        </div>
      </footer>

      {/* PDF Modal */}
      {modalDocument && (
        <PDFModal
          doc={modalDocument}
          isOpen={isModalOpen}
          onClose={handleCloseModal}
        />
      )}
    </div>
  );
};

export default DocumentLibraryWithGraph;
