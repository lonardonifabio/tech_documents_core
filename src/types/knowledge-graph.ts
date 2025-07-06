export interface DocumentNode {
  id: string;
  filename: string;
  title: string;
  summary: string;
  authors: string[];
  keywords: string[];
  category: string;
  difficulty: string;
  filepath: string;
  file_size: number;
  upload_date: string;
  content_preview: string;
}

export interface GraphNode extends DocumentNode {
  x?: number;
  y?: number;
  fx?: number | null;
  fy?: number | null;
  vx?: number;
  vy?: number;
}

export interface GraphLink {
  source: string | GraphNode;
  target: string | GraphNode;
  value: number;
}

export interface GraphData {
  nodes: GraphNode[];
  links: GraphLink[];
}

export interface KnowledgeGraphProps {
  documents: DocumentNode[];
  width: number;
  height: number;
  onNodeClick?: (node: DocumentNode) => void;
  onNodeHover?: (node: DocumentNode | null) => void;
}
