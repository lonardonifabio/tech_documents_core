import React, { useState, useEffect } from 'react';
import DocumentCard from './DocumentCard';
import SearchFilters from './SearchFilters';
import LoadingSpinner from './LoadingSpinner';
import ErrorMessage from './ErrorMessage';

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

interface DocumentLibraryProps {
  onKnowledgeGraphClick?: () => void;
  onFilteredDocumentsChange?: (documents: Document[]) => void;
}

const DocumentLibrary: React.FC<DocumentLibraryProps> = ({ 
  onKnowledgeGraphClick, 
  onFilteredDocumentsChange 
}) => {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [filteredDocs, setFilteredDocs] = useState<Document[]>([]);
  const [displayedDocs, setDisplayedDocs] = useState<Document[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [selectedDifficulty, setSelectedDifficulty] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [autoOpenDocId, setAutoOpenDocId] = useState<string | null>(null);
  
  const ITEMS_PER_PAGE = 20;

  useEffect(() => {
    const loadDocuments = async () => {
      // Try multiple possible paths for the documents.json file
      const isDev = import.meta.env.DEV;
      const basePath = isDev ? '' : '/tech_documents';
      const possiblePaths = [
        `${basePath}/data/documents.json`,
        '/data/documents.json',
        './data/documents.json'
      ];

      for (const path of possiblePaths) {
        try {
          console.log(`Trying to fetch from: ${path}`);
          const response = await fetch(path);
          if (response.ok) {
            const data = await response.json();
            console.log('Successfully loaded documents:', data);
            
            // Sort documents by upload_date (most recent first) for pagination
            const sortedData = data.sort((a: Document, b: Document) => 
              new Date(b.upload_date).getTime() - new Date(a.upload_date).getTime()
            );
            
            setDocuments(sortedData);
            setFilteredDocs(sortedData);
            setLoading(false);
            
            // Check for URL parameter to auto-open document
            if (typeof window !== 'undefined') {
              const urlParams = new URLSearchParams(window.location.search);
              const docId = urlParams.get('doc');
              if (docId) {
                setAutoOpenDocId(docId);
              }
            }
            
            return;
          }
        } catch (err) {
          console.log(`Failed to fetch from ${path}:`, err);
        }
      }
      
      // If all paths fail, set error
      setError('Unable to load documents from any path');
      setLoading(false);
    };

    loadDocuments();
  }, []);

  // Enhanced Boolean Search Function
  const performBooleanSearch = (documents: Document[], searchTerm: string): Document[] => {
    if (!searchTerm.trim()) return documents;

    // Parse search term for boolean operators
    const parseSearchTerm = (term: string) => {
      // Split by AND, OR, NOT (case insensitive)
      const tokens = term.split(/\s+(AND|OR|NOT)\s+/i);
      const parsed = [];
      
      for (let i = 0; i < tokens.length; i++) {
        const token = tokens[i].trim();
        if (token && !['AND', 'OR', 'NOT'].includes(token.toUpperCase())) {
          // Handle quoted phrases
          const isQuoted = token.startsWith('"') && token.endsWith('"');
          const cleanToken = isQuoted ? token.slice(1, -1) : token;
          
          parsed.push({
            term: cleanToken.toLowerCase(),
            operator: i > 0 ? tokens[i-1].toUpperCase() : 'AND',
            isQuoted: isQuoted,
            isNegated: i > 0 && tokens[i-1].toUpperCase() === 'NOT'
          });
        }
      }
      
      return parsed.length > 0 ? parsed : [{ term: term.toLowerCase(), operator: 'AND', isQuoted: false, isNegated: false }];
    };

    // Check if document matches a search term
    const documentMatches = (doc: Document, searchToken: any) => {
      const { term, isQuoted } = searchToken;
      
      const searchFields = [
        doc.filename || '',
        doc.title || '',
        doc.summary || '',
        (doc.authors || []).join(' '),
        (doc.keywords || []).join(' ')
      ].map(field => field.toLowerCase());

      if (isQuoted) {
        // Exact phrase search
        return searchFields.some(field => field.includes(term));
      } else {
        // Individual word search
        const words = term.split(/\s+/);
        return words.every((word: string) => 
          searchFields.some(field => field.includes(word))
        );
      }
    };

    // Apply boolean logic
    const searchTokens = parseSearchTerm(searchTerm);
    
    return documents.filter(doc => {
      let result = true;
      let hasPositiveMatch = false;

      for (const token of searchTokens) {
        const matches = documentMatches(doc, token);
        
        if (token.isNegated) {
          if (matches) {
            result = false;
            break;
          }
        } else {
          hasPositiveMatch = hasPositiveMatch || matches;
          
          if (token.operator === 'AND') {
            result = result && matches;
          } else if (token.operator === 'OR') {
            result = result || matches;
          }
        }
      }

      // If we only have negative terms, we need at least one positive match
      const hasOnlyNegativeTerms = searchTokens.every(token => token.isNegated);
      if (hasOnlyNegativeTerms) {
        return result;
      }

      return result && hasPositiveMatch;
    });
  };

  // Filter documents and reset pagination when filters change
  useEffect(() => {
    let filtered = documents;

    // Apply boolean search
    if (searchTerm) {
      filtered = performBooleanSearch(filtered, searchTerm);
    }

    // Apply category filter
    if (selectedCategory) {
      filtered = filtered.filter(doc => doc.category === selectedCategory);
    }

    // Apply difficulty filter
    if (selectedDifficulty) {
      filtered = filtered.filter(doc => doc.difficulty === selectedDifficulty);
    }

    setFilteredDocs(filtered);
    setCurrentPage(1); // Reset to first page when filters change
    
    // Notify parent component of filtered documents change
    if (onFilteredDocumentsChange) {
      onFilteredDocumentsChange(filtered);
    }
  }, [searchTerm, selectedCategory, selectedDifficulty, documents, onFilteredDocumentsChange]);

  // Update displayed documents based on pagination
  useEffect(() => {
    const startIndex = 0;
    const endIndex = currentPage * ITEMS_PER_PAGE;
    let docsToDisplay = filteredDocs.slice(startIndex, endIndex);
    
    // If there's an auto-open document ID, ensure it's included in displayed docs
    if (autoOpenDocId) {
      const autoOpenDoc = documents.find(doc => doc.id === autoOpenDocId);
      if (autoOpenDoc && !docsToDisplay.find(doc => doc.id === autoOpenDocId)) {
        // Add the auto-open document to the beginning of the list
        docsToDisplay = [autoOpenDoc, ...docsToDisplay];
      }
    }
    
    setDisplayedDocs(docsToDisplay);
  }, [filteredDocs, currentPage, autoOpenDocId, documents]);

  // Load more documents
  const handleLoadMore = async () => {
    setIsLoadingMore(true);
    
    // Simulate loading delay for better UX
    await new Promise(resolve => setTimeout(resolve, 500));
    
    setCurrentPage(prev => prev + 1);
    setIsLoadingMore(false);
  };

  // Check if there are more documents to load
  const hasMoreDocuments = displayedDocs.length < filteredDocs.length;

  // Determine if Knowledge Graph button should be active
  const isKnowledgeGraphActive = filteredDocs.length <= 50;

  const categories = [...new Set(documents.map(doc => doc.category))];
  const difficulties = [...new Set(documents.map(doc => doc.difficulty))];

  if (loading) {
    return <LoadingSpinner />;
  }

  if (error) {
    return <ErrorMessage error={error} onRetry={() => typeof window !== 'undefined' ? window.location.reload() : undefined} />;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 py-8">
        <header className="text-center mb-12 relative">
          <div className="flex items-center justify-center mb-4">
            <img 
              src="https://www.fabiolonardoni.it/io_ds.png" 
              alt="Profile" 
              className="w-16 h-16 rounded-full mr-4 border-2 border-gray-300"
            />
            <h1 className="text-4xl font-bold text-gray-800">
              AI & Data Science Library
            </h1>
            <div className="text-4xl ml-4">🤖</div>
          </div>
          <p className="text-xl text-gray-600 mb-2">
            Automated collection of Artificial Intelligence and Data Science documents
          </p>
          <p className="text-sm text-gray-500">
            {documents.length} documents • Click any document to preview
          </p>
          <p className="text-sm text-gray-500">
            Developed by <a href="https://www.fabiolonardoni.it" className="text-blue-500 hover:underline">Fabio Lonardoni</a>
          </p>
          
        </header>

        <SearchFilters
          searchTerm={searchTerm}
          setSearchTerm={setSearchTerm}
          selectedCategory={selectedCategory}
          setSelectedCategory={setSelectedCategory}
          selectedDifficulty={selectedDifficulty}
          setSelectedDifficulty={setSelectedDifficulty}
          categories={categories}
          difficulties={difficulties}
        />

        {filteredDocs.length > 0 ? (
          <>
            <div className="mb-6 flex items-center justify-between">
              <div className="text-sm text-gray-600 bg-white px-4 py-2 rounded-lg">
                📊 Showing {displayedDocs.length} of {filteredDocs.length} documents
                {filteredDocs.length !== documents.length && (
                  <span className="text-gray-400"> (filtered from {documents.length} total)</span>
                )}
              </div>
              
              {/* Knowledge Graph Status Indicator */}
              <div className={`text-xs px-3 py-1 rounded-full ${
                isKnowledgeGraphActive 
                  ? 'bg-green-100 text-green-800' 
                  : 'bg-orange-100 text-orange-800'
              }`}>
                Knowledge Graph: {isKnowledgeGraphActive ? 'Available' : 'Unavailable'}
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {displayedDocs.map(doc => (
                <DocumentCard 
                  key={doc.id} 
                  doc={doc} 
                  autoOpen={autoOpenDocId === doc.id}
                />
              ))}
            </div>
            
            {/* Load More Button */}
            {hasMoreDocuments && (
              <div className="mt-8 text-center">
                <button
                  onClick={handleLoadMore}
                  disabled={isLoadingMore}
                  className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 font-medium"
                >
                  {isLoadingMore ? (
                    <span className="flex items-center gap-2">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      Loading...
                    </span>
                  ) : (
                    `Load More (${filteredDocs.length - displayedDocs.length} remaining)`
                  )}
                </button>
              </div>
            )}
          </>
        ) : (
          <div className="text-center py-16 bg-white rounded-lg">
            <div className="text-6xl mb-4">📭</div>
            <h3 className="text-xl font-semibold text-gray-700 mb-2">
              No documents found
            </h3>
            <p className="text-gray-500">
              Try modifying your search criteria
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default DocumentLibrary;
