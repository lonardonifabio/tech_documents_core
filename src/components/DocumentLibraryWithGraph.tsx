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
      <header className="bg-white shadow-sm border-b relative overflow-hidden">
        {/* Decorative background elements */}
        <div className="absolute left-8 top-4 w-48 h-48 border-4 border-blue-600 rounded-full opacity-10 transform -rotate-12"></div>
        <div className="absolute right-8 top-4 w-48 h-48 border-4 border-blue-600 rounded-full opacity-10 transform rotate-12"></div>
        
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="flex justify-between items-center py-6">
            {/* English Podcast Section */}
            <div className="flex items-center gap-2">
              <img src="https://flagcdn.com/w20/gb.png" alt="English" className="w-5 h-3" />
              <span className="text-sm font-medium">English Podcast</span>
              <div className="flex gap-1">
                <a href="https://open.spotify.com/show/36U5N1SOzaK2RWEfpXP2yb" target="_blank" 
                   className="w-8 h-8 bg-green-500 hover:bg-green-600 rounded flex items-center justify-center">
                  <svg className="w-4 h-4 text-white" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.42 1.56-.299.421-1.02.599-1.559.3z"/>
                  </svg>
                </a>
                <a href="https://podcasts.apple.com/us/podcast/ai-and-data-science-podcast/id1834758150" target="_blank"
                   className="w-8 h-8 bg-black hover:bg-gray-800 rounded flex items-center justify-center">
                  <svg className="w-4 h-4 text-white" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z"/>
                  </svg>
                </a>
                <a href="https://music.amazon.co.uk/podcasts/c08b42e8-a102-43e4-9ab5-c830512bd295/ai-and-data-science-podcast" target="_blank"
                   className="w-8 h-8 bg-orange-500 hover:bg-orange-600 rounded flex items-center justify-center">
                  <svg className="w-4 h-4 text-white" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M.045 18.02c.072-.116.187-.124.348-.022 3.636 2.11 8.206 3.166 13.044 2.725 2.32-.213 4.499-.935 6.374-2.124.075-.048.185-.037.237.021.055.064.047.174-.021.236-3.708 2.729-8.582 3.518-13.655 2.596-2.588-.47-5.008-1.536-7.142-3.18-.22-.169-.235-.234-.185-.252zm-.678-3.007c.088-.137.238-.142.399-.026 4.298 2.494 9.615 3.74 15.188 3.119 2.657-.296 5.188-1.113 7.421-2.393.096-.055.215-.042.277.024.068.075.061.201-.024.277-4.304 3.179-9.792 4.07-15.493 3.396-2.989-.354-5.833-1.454-8.398-3.226-.257-.178-.277-.263-.37-.171zm-.527-2.963c.104-.162.289-.169.477-.031 5.149 2.97 11.799 4.448 18.334 3.702 3.186-.364 6.24-1.328 8.934-2.841.115-.065.259-.049.332.029.081.089.072.24-.029.332-5.153 3.8-11.748 4.835-18.792 4.009-3.543-.416-6.98-1.74-10.15-3.863-.306-.205-.331-.313-.106-.337z"/>
                  </svg>
                </a>
              </div>
            </div>

            {/* Center Content */}
            <div className="text-center">
              <div className="flex items-center justify-center mb-2">
                <div className="w-10 h-10 rounded-full mr-3">
                  <img src="https://github.com/lonardonifabio.png" alt="Profile" className="w-10 h-10 rounded-full" />
                </div>
                <h1 className="text-2xl font-bold text-gray-900">AI & Data Science Library</h1>
                <div className="w-10 h-10 ml-3 flex items-center justify-center">
                  <span className="text-2xl">🤖</span>
                </div>
              </div>
              <p className="text-sm text-gray-600">Automated collection of Artificial Intelligence and Data Science documents</p>
              <p className="text-xs text-gray-500 mt-1">{documents.length} documents • Click any document to preview</p>
              <p className="text-xs text-gray-500">Developed by <a href="#" className="text-blue-600">Fabio Lonardoni</a></p>
            </div>

            {/* Italian Podcast Section */}
            <div className="flex items-center gap-2">
              <img src="https://flagcdn.com/w20/it.png" alt="Italian" className="w-5 h-3" />
              <span className="text-sm font-medium">Podcast Italiano</span>
              <div className="flex gap-1">
                <a href="https://open.spotify.com/show/1UjrbCJaGGXpsMxEVYhoar" target="_blank"
                   className="w-8 h-8 bg-green-500 hover:bg-green-600 rounded flex items-center justify-center">
                  <svg className="w-4 h-4 text-white" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.42 1.56-.299.421-1.02.599-1.559.3z"/>
                  </svg>
                </a>
                <a href="https://podcasts.apple.com/it/podcast/techboy/id1834487895" target="_blank"
                   className="w-8 h-8 bg-black hover:bg-gray-800 rounded flex items-center justify-center">
                  <svg className="w-4 h-4 text-white" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z"/>
                  </svg>
                </a>
                <a href="https://music.amazon.it/podcasts/5b639857-338c-4832-a1c4-7cadf87acbc3/techboy" target="_blank"
                   className="w-8 h-8 bg-orange-500 hover:bg-orange-600 rounded flex items-center justify-center">
                  <svg className="w-4 h-4 text-white" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M.045 18.02c.072-.116.187-.124.348-.022 3.636 2.11 8.206 3.166 13.044 2.725 2.32-.213 4.499-.935 6.374-2.124.075-.048.185-.037.237.021.055.064.047.174-.021.236-3.708 2.729-8.582 3.518-13.655 2.596-2.588-.47-5.008-1.536-7.142-3.18-.22-.169-.235-.234-.185-.252zm-.678-3.007c.088-.137.238-.142.399-.026 4.298 2.494 9.615 3.74 15.188 3.119 2.657-.296 5.188-1.113 7.421-2.393.096-.055.215-.042.277.024.068.075.061.201-.024.277-4.304 3.179-9.792 4.07-15.493 3.396-2.989-.354-5.833-1.454-8.398-3.226-.257-.178-.277-.263-.37-.171zm-.527-2.963c.104-.162.289-.169.477-.031 5.149 2.97 11.799 4.448 18.334 3.702 3.186-.364 6.24-1.328 8.934-2.841.115-.065.259-.049.332.029.081.089.072.24-.029.332-5.153 3.8-11.748 4.835-18.792 4.009-3.543-.416-6.98-1.74-10.15-3.863-.306-.205-.331-.313-.106-.337z"/>
                  </svg>
                </a>
              </div>
            </div>
          </div>
          
          {/* View Toggle */}
          <div className="flex justify-center pb-4">
            <div className="flex items-center space-x-1 bg-gray-100 rounded-lg p-1">
              <button
                onClick={() => setCurrentView('library')}
                className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                  currentView === 'library'
                    ? 'bg-white text-gray-900 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                📚 Library View
              </button>
              <button
                onClick={() => setCurrentView('graph')}
                disabled={!isKnowledgeGraphActive}
                className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
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
                🕸️ Knowledge Graph
                {!isKnowledgeGraphActive && (
                  <span className="ml-1 text-xs">
                    ({filteredDocuments.length > 0 ? filteredDocuments.length : documents.length}/50)
                  </span>
                )}
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
