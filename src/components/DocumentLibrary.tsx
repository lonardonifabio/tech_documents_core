import React, { useState, useEffect } from 'react';

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
  onKnowledgeGraphClick: () => void;
  onFilteredDocumentsChange: (documents: Document[]) => void;
}

const DocumentLibrary: React.FC<DocumentLibraryProps> = ({ 
  onKnowledgeGraphClick, 
  onFilteredDocumentsChange 
}) => {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [filteredDocuments, setFilteredDocuments] = useState<Document[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedDifficulty, setSelectedDifficulty] = useState('all');
  const [sortBy, setSortBy] = useState<'title' | 'date' | 'size'>('title');

  // Load documents
  useEffect(() => {
    const loadDocuments = async () => {
      try {
        setIsLoading(true);
        setError(null);
        
        // Try different paths for documents.json based on environment
        const isDev = import.meta.env.DEV;
        const basePath = isDev ? '' : '/tech_documents';
        const possiblePaths = [
          `${basePath}/data/documents.json`,
          '/data/documents.json',
          './data/documents.json'
        ];

        let data = null;
        let loadedFrom = '';
        
        for (const path of possiblePaths) {
          try {
            console.log(`Trying to load documents from: ${path}`);
            const response = await fetch(path);
            if (response.ok) {
              data = await response.json();
              loadedFrom = path;
              console.log(`Successfully loaded ${data.length} documents from: ${path}`);
              break;
            }
          } catch (error) {
            console.warn(`Failed to load from ${path}:`, error);
          }
        }

        if (data && Array.isArray(data)) {
          setDocuments(data);
          setFilteredDocuments(data);
          onFilteredDocumentsChange(data);
        } else {
          console.error('Could not load documents from any path or data is not an array');
          setError('Could not load documents. Please check if the documents.json file exists and is properly formatted.');
          setDocuments([]);
          setFilteredDocuments([]);
          onFilteredDocumentsChange([]);
        }
      } catch (error) {
        console.error('Error loading documents:', error);
        setError('Failed to load documents. Please try refreshing the page.');
        setDocuments([]);
        setFilteredDocuments([]);
        onFilteredDocumentsChange([]);
      } finally {
        setIsLoading(false);
      }
    };

    loadDocuments();
  }, [onFilteredDocumentsChange]);

  // Filter and sort documents
  useEffect(() => {
    let filtered = documents.filter(doc => {
      const matchesSearch = searchTerm === '' || 
        doc.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        doc.filename.toLowerCase().includes(searchTerm.toLowerCase()) ||
        doc.summary.toLowerCase().includes(searchTerm.toLowerCase()) ||
        doc.keywords.some(keyword => keyword.toLowerCase().includes(searchTerm.toLowerCase()));
      
      const matchesCategory = selectedCategory === 'all' || doc.category === selectedCategory;
      const matchesDifficulty = selectedDifficulty === 'all' || doc.difficulty === selectedDifficulty;
      
      return matchesSearch && matchesCategory && matchesDifficulty;
    });

    // Sort documents
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'title':
          return (a.title || a.filename).localeCompare(b.title || b.filename);
        case 'date':
          return new Date(b.upload_date).getTime() - new Date(a.upload_date).getTime();
        case 'size':
          return b.file_size - a.file_size;
        default:
          return 0;
      }
    });

    setFilteredDocuments(filtered);
    onFilteredDocumentsChange(filtered);
  }, [documents, searchTerm, selectedCategory, selectedDifficulty, sortBy, onFilteredDocumentsChange]);

  // Get unique categories and difficulties
  const categories = ['all', ...Array.from(new Set(documents.map(doc => doc.category)))];
  const difficulties = ['all', ...Array.from(new Set(documents.map(doc => doc.difficulty)))];

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
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
      <div className="p-6">
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <div className="text-gray-600">Loading documents...</div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <div className="bg-red-50 border border-red-200 rounded-lg p-6">
          <div className="flex items-center gap-2 text-red-800 mb-3">
            <span className="text-lg">⚠️</span>
            <h3 className="font-semibold">Error Loading Documents</h3>
          </div>
          <p className="text-red-700 text-sm mb-4">{error}</p>
          <div className="flex gap-3">
            <button
              onClick={() => window.location.reload()}
              className="px-4 py-2 bg-red-600 text-white text-sm rounded hover:bg-red-700 transition-colors"
            >
              Reload Page
            </button>
            <button
              onClick={onKnowledgeGraphClick}
              className="px-4 py-2 border border-red-300 text-red-700 text-sm rounded hover:bg-red-50 transition-colors"
            >
              Try Knowledge Graph
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Document Library</h2>
          <p className="text-gray-600 mt-1">
            {filteredDocuments.length} of {documents.length} documents
            {filteredDocuments.length !== documents.length && ' (filtered)'}
          </p>
        </div>
        <button 
          onClick={onKnowledgeGraphClick}
          disabled={filteredDocuments.length > 50}
          className={`mt-4 sm:mt-0 px-4 py-2 rounded transition-colors ${
            filteredDocuments.length > 50
              ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
              : 'bg-blue-600 text-white hover:bg-blue-700'
          }`}
          title={filteredDocuments.length > 50 ? `Knowledge Graph unavailable (${filteredDocuments.length} results > 50 limit)` : 'Open Knowledge Graph'}
        >
          🕸️ Knowledge Graph
          {filteredDocuments.length > 50 && (
            <span className="ml-1 text-xs">({filteredDocuments.length}/50)</span>
          )}
        </button>
      </div>

      {/* Filters */}
      <div className="bg-gray-50 rounded-lg p-4 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Search */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Search</label>
            <input
              type="text"
              placeholder="Search documents..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          {/* Category Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              {categories.map(category => (
                <option key={category} value={category}>
                  {category === 'all' ? 'All Categories' : category}
                </option>
              ))}
            </select>
          </div>

          {/* Difficulty Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Difficulty</label>
            <select
              value={selectedDifficulty}
              onChange={(e) => setSelectedDifficulty(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              {difficulties.map(difficulty => (
                <option key={difficulty} value={difficulty}>
                  {difficulty === 'all' ? 'All Difficulties' : difficulty}
                </option>
              ))}
            </select>
          </div>

          {/* Sort */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Sort by</label>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as 'title' | 'date' | 'size')}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="title">Title</option>
              <option value="date">Upload Date</option>
              <option value="size">File Size</option>
            </select>
          </div>
        </div>
      </div>

      {/* Documents Grid */}
      {filteredDocuments.length === 0 ? (
        <div className="text-center py-12">
          <div className="text-gray-400 text-6xl mb-4">📄</div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">No documents found</h3>
          <p className="text-gray-600">
            {documents.length === 0 
              ? 'No documents are available in the library.' 
              : 'Try adjusting your search or filter criteria.'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredDocuments.map((doc) => (
            <div key={doc.id} className="bg-white rounded-lg shadow-sm border border-gray-200 hover:shadow-md transition-shadow">
              <div className="p-6">
                {/* Header */}
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1">
                    <h3 className="font-semibold text-gray-900 mb-1 line-clamp-2">
                      {doc.title || doc.filename}
                    </h3>
                    <div className="flex items-center gap-2 text-xs text-gray-500">
                      <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded">
                        {doc.category}
                      </span>
                      <span className="bg-green-100 text-green-800 px-2 py-1 rounded">
                        {doc.difficulty}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Summary */}
                <p className="text-gray-600 text-sm mb-4 line-clamp-3">
                  {doc.summary}
                </p>

                {/* Keywords */}
                {doc.keywords.length > 0 && (
                  <div className="mb-4">
                    <div className="flex flex-wrap gap-1">
                      {doc.keywords.slice(0, 3).map((keyword, index) => (
                        <span key={index} className="text-xs bg-gray-100 text-gray-700 px-2 py-1 rounded">
                          {keyword}
                        </span>
                      ))}
                      {doc.keywords.length > 3 && (
                        <span className="text-xs text-gray-500">
                          +{doc.keywords.length - 3} more
                        </span>
                      )}
                    </div>
                  </div>
                )}

                {/* Metadata */}
                <div className="text-xs text-gray-500 mb-4 space-y-1">
                  <div>Size: {formatFileSize(doc.file_size)}</div>
                  <div>Uploaded: {new Date(doc.upload_date).toLocaleDateString()}</div>
                  {doc.authors && doc.authors.length > 0 && (
                    <div>Authors: {doc.authors.join(', ')}</div>
                  )}
                </div>

                {/* Actions */}
                <div className="flex gap-2">
                  <a
                    href={getDocumentPreviewUrl(doc.filepath)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex-1 text-center bg-blue-600 text-white px-3 py-2 rounded text-sm hover:bg-blue-700 transition-colors"
                  >
                    📄 View PDF
                  </a>
                  <a
                    href={getGitHubPreviewUrl(doc.filepath)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex-1 text-center border border-gray-300 text-gray-700 px-3 py-2 rounded text-sm hover:bg-gray-50 transition-colors"
                  >
                    📂 GitHub
                  </a>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default DocumentLibrary;
