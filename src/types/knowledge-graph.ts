export interface DocumentNode {
  id: string;
  filename: string;
  title: string;
  authors: string[];
  filepath: string;
  upload_date: string;
  file_size: number;
  summary: string;
  keywords: string[];
  category: string;
  difficulty: string;
  content_preview: string;
  embedding?: number[];
  topic?: string;
  x?: number;
  y?: number;
  fx?: number | null;
  fy?: number | null;
}

export interface DocumentLink {
  source: string | DocumentNode;
  target: string | DocumentNode;
  similarity: number;
  weight: number;
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

export interface OllamaEmbeddingResponse {
  embedding: number[];
}

export interface OllamaResponse {
  model: string;
  created_at: string;
  response: string;
  done: boolean;
}
