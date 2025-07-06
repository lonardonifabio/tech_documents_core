import React from 'react';

interface DocumentLibraryProps {
  onKnowledgeGraphClick: () => void;
  onFilteredDocumentsChange: (documents: any[]) => void;
}

const DocumentLibrary: React.FC<DocumentLibraryProps> = ({ 
  onKnowledgeGraphClick, 
  onFilteredDocumentsChange 
}) => {
  return (
    <div className="p-6">
      <h2 className="text-xl font-semibold mb-4">Document Library</h2>
      <p className="text-gray-600">Document library component will be implemented here.</p>
      <button 
        onClick={onKnowledgeGraphClick}
        className="mt-4 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
      >
        Open Knowledge Graph
      </button>
    </div>
  );
};

export default DocumentLibrary;
