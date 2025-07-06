import React from 'react';
import type { KnowledgeGraphProps } from '../types/knowledge-graph';

const KnowledgeGraph: React.FC<KnowledgeGraphProps> = ({ 
  documents, 
  width, 
  height, 
  onNodeClick, 
  onNodeHover 
}) => {
  return (
    <div className="p-6" style={{ width, height }}>
      <h2 className="text-xl font-semibold mb-4">Knowledge Graph</h2>
      <p className="text-gray-600">Knowledge graph component will be implemented here.</p>
      <p className="text-sm text-gray-500 mt-2">
        Documents: {documents.length} | Size: {width}x{height}
      </p>
    </div>
  );
};

export default KnowledgeGraph;
