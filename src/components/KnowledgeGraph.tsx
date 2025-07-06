import React, { useEffect, useRef, useState, useCallback } from 'react';
import * as d3 from 'd3';
import type { 
  DocumentNode, 
  DocumentLink, 
  GraphData, 
  EmbeddingData, 
  TopicCluster, 
  KnowledgeGraphProps 
} from '../types/knowledge-graph';
import { EmbeddingService } from '../services/embedding-service';

const KnowledgeGraph: React.FC<KnowledgeGraphProps> = ({
  documents,
  width = 800,
  height = 600,
  onNodeClick,
  onNodeHover
}) => {
  const svgRef = useRef<SVGSVGElement>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [embeddings, setEmbeddings] = useState<EmbeddingData | null>(null);
  const [topicClusters, setTopicClusters] = useState<TopicCluster[]>([]);
  const [selectedTopic, setSelectedTopic] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [hoveredNode, setHoveredNode] = useState<DocumentNode | null>(null);
  const [ollamaConnected, setOllamaConnected] = useState(false);
  const [filteredDocuments, setFilteredDocuments] = useState<DocumentNode[]>([]);
  const embeddingService = EmbeddingService.getInstance();

  // Check Ollama connection on mount
  useEffect(() => {
    const checkConnection = async () => {
      const connected = await embeddingService.checkOllamaConnection();
      setOllamaConnected(connected);
    };
    checkConnection();
  }, [embeddingService]);

  // Filter documents for performance with large datasets
  useEffect(() => {
    let filtered = documents;

    // Performance optimization: limit documents for large datasets
    if (documents.length > 100) {
      // Filter by category first if selected
      if (selectedCategory) {
        filtered = filtered.filter(doc => doc.category === selectedCategory);
      }

      // Filter by tags if selected (max 10 tags)
      if (selectedTags.length > 0) {
        filtered = filtered.filter(doc => 
          selectedTags.some(tag => 
            doc.keywords.some(keyword => 
              keyword.toLowerCase().includes(tag.toLowerCase())
            )
          )
        );
      }

      // Limit to top 50 documents by file size for performance
      if (filtered.length > 50) {
        filtered = filtered
          .sort((a, b) => b.file_size - a.file_size)
          .slice(0, 50);
      }
    }

    setFilteredDocuments(filtered);
  }, [documents, selectedCategory, selectedTags]);

  // Get available categories and top tags
  const availableCategories = [...new Set(documents.map(doc => doc.category))];
  const allTags = documents.flatMap(doc => doc.keywords);
  const tagCounts = allTags.reduce((acc, tag) => {
    acc[tag] = (acc[tag] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);
  const allAvailableTags = Object.entries(tagCounts)
    .sort(([,a], [,b]) => b - a)
    .map(([tag]) => tag);

  // Load cached embeddings or generate new ones
  useEffect(() => {
    const loadEmbeddings = async () => {
      if (documents.length === 0) return;

      setIsLoading(true);
      
      // Try to load cached embeddings first
      const cached = embeddingService.loadCachedEmbeddings();
      if (cached && Object.keys(cached).length > 0) {
        setEmbeddings(cached);
        const clusters = embeddingService.generateTopicClusters(cached);
        setTopicClusters(clusters);
        setIsLoading(false);
        return;
      }

      // Generate new embeddings
      try {
        const newEmbeddings = await embeddingService.processDocuments(documents);
        setEmbeddings(newEmbeddings);
        
        const clusters = embeddingService.generateTopicClusters(newEmbeddings);
        setTopicClusters(clusters);
        
        // Save embeddings for future use
        await embeddingService.saveEmbeddings(newEmbeddings);
      } catch (error) {
        console.error('Failed to generate embeddings:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadEmbeddings();
  }, [documents]);

  // Generate graph data from embeddings
  const generateGraphData = useCallback((): GraphData => {
    if (!embeddings) return { nodes: [], links: [] };

    // Use filtered documents for performance
    const docsToProcess = filteredDocuments.length > 0 ? filteredDocuments : documents;
    
    const nodes: DocumentNode[] = docsToProcess.map(doc => {
      const embeddingData = embeddings[doc.id];
      
      return {
        ...doc,
        embedding: embeddingData?.embedding,
        topic: embeddingData?.topic || 'Other'
      };
    });

    const links: DocumentLink[] = [];
    const similarityThreshold = 0.3;

    // Generate links based on similarity
    for (let i = 0; i < nodes.length; i++) {
      for (let j = i + 1; j < nodes.length; j++) {
        const node1 = nodes[i];
        const node2 = nodes[j];
        
        if (node1.embedding && node2.embedding) {
          const similarity = embeddingService.calculateSimilarity(
            node1.embedding,
            node2.embedding
          );
          
          if (similarity > similarityThreshold) {
            links.push({
              source: node1.id,
              target: node2.id,
              similarity,
              weight: similarity
            });
          }
        }
      }
    }

    return { nodes, links };
  }, [documents, embeddings, topicClusters, filteredDocuments, embeddingService]);

  // D3 visualization
  useEffect(() => {
    if (!svgRef.current || !embeddings) return;

    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove();

    const graphData = generateGraphData();
    if (graphData.nodes.length === 0) return;

    // Set up dimensions and margins
    const margin = { top: 20, right: 20, bottom: 20, left: 20 };
    const innerWidth = width - margin.left - margin.right;
    const innerHeight = height - margin.top - margin.bottom;

    // Create main group
    const g = svg
      .attr('width', width)
      .attr('height', height)
      .append('g')
      .attr('transform', `translate(${margin.left},${margin.top})`);

    // Set up zoom behavior
    const zoom = d3.zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.1, 4])
      .on('zoom', (event) => {
        g.attr('transform', event.transform);
      });

    svg.call(zoom);

    // Create force simulation with optimized parameters for performance
    const simulation = d3.forceSimulation<DocumentNode>(graphData.nodes)
      .force('link', d3.forceLink<DocumentNode, DocumentLink>(graphData.links)
        .id(d => d.id)
        .distance(d => 80 / (d.weight + 0.1))
        .strength(d => d.weight * 0.5)
      )
      .force('charge', d3.forceManyBody().strength(-200))
      .force('center', d3.forceCenter(innerWidth / 2, innerHeight / 2))
      .force('collision', d3.forceCollide().radius(20))
      .alphaDecay(0.05) // Faster convergence
      .velocityDecay(0.8); // More damping for stability

    // Color scale for topics
    const colorScale = d3.scaleOrdinal<string>()
      .domain(topicClusters.map(c => c.topic))
      .range(topicClusters.map(c => c.color));

    // Create links
    const link = g.append('g')
      .attr('class', 'links')
      .selectAll('line')
      .data(graphData.links)
      .enter()
      .append('line')
      .attr('stroke', '#999')
      .attr('stroke-opacity', 0.6)
      .attr('stroke-width', d => Math.sqrt(d.weight * 5));

    // Create nodes
    const node = g.append('g')
      .attr('class', 'nodes')
      .selectAll('circle')
      .data(graphData.nodes)
      .enter()
      .append('circle')
      .attr('r', d => Math.sqrt(d.file_size / 100000) + 8)
      .attr('fill', d => colorScale(d.topic || 'Other'))
      .attr('stroke', '#fff')
      .attr('stroke-width', 2)
      .style('cursor', 'pointer')
      .style('opacity', d => selectedTopic ? (d.topic === selectedTopic ? 1 : 0.3) : 1);

    // Add labels
    const labels = g.append('g')
      .attr('class', 'labels')
      .selectAll('text')
      .data(graphData.nodes)
      .enter()
      .append('text')
      .text(d => d.title.length > 20 ? d.title.substring(0, 20) + '...' : d.title)
      .attr('font-size', '10px')
      .attr('font-family', 'Arial, sans-serif')
      .attr('text-anchor', 'middle')
      .attr('dy', '0.35em')
      .attr('pointer-events', 'none')
      .style('opacity', d => selectedTopic ? (d.topic === selectedTopic ? 1 : 0.3) : 0.8);

    // Add drag behavior
    const drag = d3.drag<SVGCircleElement, DocumentNode>()
      .on('start', (event, d) => {
        if (!event.active) simulation.alphaTarget(0.3).restart();
        d.fx = d.x;
        d.fy = d.y;
      })
      .on('drag', (event, d) => {
        d.fx = event.x;
        d.fy = event.y;
      })
      .on('end', (event, d) => {
        if (!event.active) simulation.alphaTarget(0);
        d.fx = null;
        d.fy = null;
      });

    node.call(drag);

    // Add event handlers
    node
      .on('mouseover', (_event, d) => {
        setHoveredNode(d);
        onNodeHover?.(d);
        
        // Highlight connected nodes
        const connectedNodeIds = new Set<string>();
        graphData.links.forEach(link => {
          if (link.source === d.id || (typeof link.source === 'object' && link.source.id === d.id)) {
            connectedNodeIds.add(typeof link.target === 'string' ? link.target : link.target.id);
          }
          if (link.target === d.id || (typeof link.target === 'object' && link.target.id === d.id)) {
            connectedNodeIds.add(typeof link.source === 'string' ? link.source : link.source.id);
          }
        });

        node.style('opacity', n => n.id === d.id || connectedNodeIds.has(n.id) ? 1 : 0.3);
        link.style('opacity', l => {
          const sourceId = typeof l.source === 'string' ? l.source : l.source.id;
          const targetId = typeof l.target === 'string' ? l.target : l.target.id;
          return sourceId === d.id || targetId === d.id ? 1 : 0.1;
        });
      })
      .on('mouseout', () => {
        setHoveredNode(null);
        onNodeHover?.(null);
        
        node.style('opacity', d => selectedTopic ? (d.topic === selectedTopic ? 1 : 0.3) : 1);
        link.style('opacity', 0.6);
      })
      .on('click', (event, d) => {
        event.stopPropagation();
        onNodeClick?.(d);
      });

    // Update positions on simulation tick
    simulation.on('tick', () => {
      link
        .attr('x1', d => (d.source as DocumentNode).x!)
        .attr('y1', d => (d.source as DocumentNode).y!)
        .attr('x2', d => (d.target as DocumentNode).x!)
        .attr('y2', d => (d.target as DocumentNode).y!);

      node
        .attr('cx', d => d.x!)
        .attr('cy', d => d.y!);

      labels
        .attr('x', d => d.x!)
        .attr('y', d => d.y! + 30);
    });

    // Cleanup
    return () => {
      simulation.stop();
    };
  }, [embeddings, generateGraphData, width, height, selectedTopic, onNodeClick, onNodeHover, topicClusters]);

  const handleTopicFilter = (topic: string | null) => {
    setSelectedTopic(selectedTopic === topic ? null : topic);
  };

  const handleRegenerateEmbeddings = async () => {
    setIsLoading(true);
    try {
      // Clear cache
      localStorage.removeItem('document-embeddings');
      
      // Generate new embeddings
      const newEmbeddings = await embeddingService.processDocuments(documents);
      setEmbeddings(newEmbeddings);
      
      const clusters = embeddingService.generateTopicClusters(newEmbeddings);
      setTopicClusters(clusters);
      
      await embeddingService.saveEmbeddings(newEmbeddings);
    } catch (error) {
      console.error('Failed to regenerate embeddings:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="knowledge-graph-container w-full">
      {/* Performance Warning for Large Datasets */}
      {documents.length > 100 && (
        <div className="mb-4 p-3 bg-orange-50 border border-orange-200 rounded-lg">
          <div className="flex items-center gap-2 text-orange-800">
            <span className="text-sm font-medium">⚡ Performance Mode:</span>
            <span className="text-sm">
              Large dataset detected ({documents.length} documents). 
              {filteredDocuments.length > 0 ? 
                ` Showing ${filteredDocuments.length} filtered documents for optimal performance.` :
                ' Use filters below to improve performance.'
              }
            </span>
          </div>
        </div>
      )}

      {/* Category and Tag Filters */}
      {documents.length > 100 && (
        <div className="mb-4 p-4 bg-white rounded-lg border">
          <div className="text-sm font-medium mb-3">📊 Performance Filters (Required for large datasets):</div>
          
          {/* Category Filter */}
          <div className="mb-3">
            <label className="text-xs font-medium text-gray-700 mb-1 block">Filter by Category:</label>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => setSelectedCategory(null)}
                className={`px-3 py-1 text-xs rounded border ${
                  selectedCategory === null 
                    ? 'bg-blue-600 text-white' 
                    : 'bg-white text-gray-700 hover:bg-gray-50'
                }`}
              >
                All Categories
              </button>
              {availableCategories.map(category => (
                <button
                  key={category}
                  onClick={() => setSelectedCategory(category)}
                  className={`px-3 py-1 text-xs rounded border ${
                    selectedCategory === category
                      ? 'bg-blue-600 text-white'
                      : 'bg-white text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  {category}
                </button>
              ))}
            </div>
          </div>

          {/* Top Tags Filter */}
          <div>
            <label className="text-xs font-medium text-gray-700 mb-1 block">Filter by Tags:</label>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => setSelectedTags([])}
                className={`px-3 py-1 text-xs rounded border ${
                  selectedTags.length === 0 
                    ? 'bg-green-600 text-white' 
                    : 'bg-white text-gray-700 hover:bg-gray-50'
                }`}
              >
                Clear Tags
              </button>
              {allAvailableTags.map((tag: string) => (
                <button
                  key={tag}
                  onClick={() => {
                    if (selectedTags.includes(tag)) {
                      setSelectedTags(selectedTags.filter(t => t !== tag));
                    } else {
                      setSelectedTags([...selectedTags, tag]);
                    }
                  }}
                  className={`px-3 py-1 text-xs rounded border ${
                    selectedTags.includes(tag)
                      ? 'bg-green-600 text-white'
                      : 'bg-white text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  {tag} ({tagCounts[tag]})
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Regenerate Embeddings - Prominent Call to Action */}
      {!embeddings && !isLoading && (
        <div className="mb-6 p-6 bg-gradient-to-r from-blue-50 to-indigo-50 border-2 border-blue-200 rounded-lg">
          <div className="text-center">
            <div className="mb-4">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-100 rounded-full mb-4">
                <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">
                🚀 Generate Knowledge Graph Connections
              </h3>
              <p className="text-gray-700 mb-4 max-w-2xl mx-auto">
                Click the button below to analyze your documents with AI and create intelligent connections. 
                This will generate embeddings that power the knowledge graph visualization.
              </p>
            </div>
            <button
              onClick={handleRegenerateEmbeddings}
              disabled={isLoading}
              className="inline-flex items-center gap-2 px-8 py-4 text-lg font-semibold bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 shadow-lg hover:shadow-xl transition-all duration-200 transform hover:scale-105"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              {isLoading ? 'Generating Connections...' : 'Generate Embeddings & Connections'}
            </button>
            <p className="text-sm text-gray-600 mt-3">
              ⚡ This process analyzes {documents.length} documents and may take a few moments
            </p>
          </div>
        </div>
      )}

      {/* Controls - Only show when embeddings exist */}
      {embeddings && (
        <div className="mb-4 flex flex-wrap items-center gap-4 p-4 bg-gray-50 rounded-lg">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium">AI Status:</span>
            <span className={`text-sm px-2 py-1 rounded ${
              ollamaConnected ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
            }`}>
              {ollamaConnected ? '✅ Ollama Connected' : '⚠️ Offline Mode'}
            </span>
            <span className="text-xs text-gray-500">
              {ollamaConnected ? 
                'Using Mistral AI for high-quality embeddings' : 
                'Using keyword-based fallback embeddings'
              }
            </span>
          </div>
          
          <div className="flex items-center gap-2">
            <button
              onClick={handleRegenerateEmbeddings}
              disabled={isLoading}
              className="inline-flex items-center gap-1 px-4 py-2 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 transition-colors"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              {isLoading ? 'Regenerating...' : 'Regenerate Connections'}
            </button>
            <span className="text-xs text-gray-500">
              Click to refresh embeddings and update connections
            </span>
          </div>
        </div>
      )}

      {/* Topic filters */}
      {topicClusters.length > 0 && (
        <div className="mb-4">
          <div className="text-sm font-medium mb-2">Filter by Topic:</div>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => handleTopicFilter(null)}
              className={`px-3 py-1 text-sm rounded border ${
                selectedTopic === null 
                  ? 'bg-gray-800 text-white' 
                  : 'bg-white text-gray-700 hover:bg-gray-50'
              }`}
            >
              All Topics
            </button>
            {topicClusters.map(cluster => (
              <button
                key={cluster.topic}
                onClick={() => handleTopicFilter(cluster.topic)}
                className={`px-3 py-1 text-sm rounded border ${
                  selectedTopic === cluster.topic
                    ? 'text-white'
                    : 'bg-white text-gray-700 hover:bg-gray-50'
                }`}
                style={{
                  backgroundColor: selectedTopic === cluster.topic ? cluster.color : undefined,
                  borderColor: cluster.color
                }}
              >
                {cluster.topic} ({cluster.documents.length})
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Loading state */}
      {isLoading && (
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
            <div className="text-sm text-gray-600">
              {ollamaConnected ? 'Generating AI embeddings...' : 'Processing documents...'}
            </div>
          </div>
        </div>
      )}

      {/* Graph */}
      {!isLoading && embeddings && (
        <div className="relative">
          <svg ref={svgRef} className="border rounded-lg bg-white"></svg>
          
          {/* Hover tooltip */}
          {hoveredNode && (
            <div className="absolute top-4 left-4 bg-white p-3 rounded-lg shadow-lg border max-w-xs z-10">
              <h4 className="font-semibold text-sm mb-1">{hoveredNode.title}</h4>
              <p className="text-xs text-gray-600 mb-2">{hoveredNode.summary.substring(0, 100)}...</p>
              <div className="flex items-center gap-2 text-xs">
                <span className="px-2 py-1 rounded" style={{ 
                  backgroundColor: topicClusters.find(c => c.topic === hoveredNode.topic)?.color + '20',
                  color: topicClusters.find(c => c.topic === hoveredNode.topic)?.color
                }}>
                  {hoveredNode.topic}
                </span>
                <span className="text-gray-500">
                  {(hoveredNode.file_size / 1024 / 1024).toFixed(1)} MB
                </span>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Legend */}
      {topicClusters.length > 0 && !isLoading && (
        <div className="mt-4 p-3 bg-gray-50 rounded-lg">
          <div className="text-sm font-medium mb-2">Topic Legend:</div>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2 text-xs">
            {topicClusters.map(cluster => (
              <div key={cluster.topic} className="flex items-center gap-2">
                <div 
                  className="w-3 h-3 rounded-full"
                  style={{ backgroundColor: cluster.color }}
                ></div>
                <span>{cluster.topic}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default KnowledgeGraph;
