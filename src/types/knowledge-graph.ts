export interface DocumentNode {
  id: string;
  filename: string;
  title: string;
  summary: string;
  authors: string[];
  keywords: string[];
  key_concepts?: string[];
  category: string;
  difficulty: string;
  filepath: string;
  file_size: number;
  upload_date: string;
  content_preview?: string;
  embedding?: number[];
  topic?: string;
  // D3 simulation properties
  x?: number;
  y?: number;
  fx?: number | null;
  fy?: number | null;
  vx?: number;
  vy?: number;
  index?: number;
}

export interface GraphNode extends DocumentNode {
  x?: number;
  y?: number;
  fx?: number | null;
  fy?: number | null;
  vx?: number;
  vy?: number;
}

export interface DocumentLink {
  source: string | DocumentNode;
  target: string | DocumentNode;
  similarity: number;
  weight: number;
}

export interface GraphLink {
  source: string | GraphNode;
  target: string | GraphNode;
  value: number;
}

export interface GraphData {
  nodes: DocumentNode[];
  links: DocumentLink[];
}

export interface EmbeddingData {
  [documentId: string]: {
    embedding: number[];
    topic: string;
    topicConfidence: number;
  };
}

export interface OllamaEmbeddingResponse {
  embedding: number[];
}

export interface TopicCluster {
  topic: string;
  color: string;
  documents: string[];
  centroid: number[];
}

export interface KnowledgeGraphProps {
  documents: DocumentNode[];
  width?: number;
  height?: number;
  onNodeClick?: (node: DocumentNode) => void;
  onNodeHover?: (node: DocumentNode | null) => void;
}
