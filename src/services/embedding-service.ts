import type { DocumentNode, EmbeddingData, OllamaEmbeddingResponse, TopicCluster } from '../types/knowledge-graph';

export class EmbeddingService {
  private static instance: EmbeddingService;
  private ollamaUrl = 'http://localhost:11434';
  private model = 'mistral';
  private cache: Map<string, number[]> = new Map();

  static getInstance(): EmbeddingService {
    if (!EmbeddingService.instance) {
      EmbeddingService.instance = new EmbeddingService();
    }
    return EmbeddingService.instance;
  }

  async checkOllamaConnection(): Promise<boolean> {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 second timeout

      const response = await fetch(`${this.ollamaUrl}/api/tags`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        signal: controller.signal,
        mode: 'cors', // Explicitly set CORS mode
      });
      
      clearTimeout(timeoutId);
      
      if (response.ok) {
        const data = await response.json();
        // Check if any compatible model is available
        const models = data.models || [];
        const hasCompatibleModel = models.some((model: any) => 
          model.name && (
            model.name.toLowerCase().includes('mistral') ||
            model.name.toLowerCase().includes('llama') ||
            model.name.toLowerCase().includes('phi3')
          )
        );
        console.log('Ollama models available:', models.map((m: any) => m.name));
        return hasCompatibleModel;
      }
      return false;
    } catch (error) {
      // More detailed error logging
      if (error instanceof Error) {
        if (error.name === 'AbortError') {
          console.log('Ollama connection timeout after 5 seconds');
        } else if (error.message.includes('CORS')) {
          console.log('CORS error - make sure Ollama is running with OLLAMA_ORIGINS="*"');
        } else if (error.message.includes('NetworkError') || error.message.includes('Failed to fetch')) {
          console.log('Network error - Ollama not running on localhost:11434');
        } else {
          console.log('Ollama connection failed:', error.message);
        }
      } else {
        console.log('Ollama connection failed:', error);
      }
      return false;
    }
  }

  async generateEmbedding(text: string): Promise<number[]> {
    const cacheKey = this.hashString(text).toString();
    if (this.cache.has(cacheKey)) {
      return this.cache.get(cacheKey)!;
    }

    try {
      const response = await fetch(`${this.ollamaUrl}/api/embeddings`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: this.model,
          prompt: text,
        }),
      });

      if (!response.ok) {
        throw new Error(`Ollama API error: ${response.status}`);
      }

      const data: OllamaEmbeddingResponse = await response.json();
      this.cache.set(cacheKey, data.embedding);
      return data.embedding;
    } catch (error) {
      console.warn('Failed to generate embedding via Ollama:', error);
      // Fallback to simple text-based embedding
      return this.generateFallbackEmbedding(text);
    }
  }

  async generateDocumentEmbedding(document: DocumentNode): Promise<number[]> {
    const text = `${document.title} ${document.summary} ${document.keywords.join(' ')} ${document.category}`;
    return this.generateEmbedding(text);
  }

  async detectTopic(document: DocumentNode): Promise<string> {
    try {
      const prompt = `Analyze this document and classify it into ONE of these categories: Machine Learning, Deep Learning, Data Science, AI Ethics, Business Intelligence, Natural Language Processing, Computer Vision, Reinforcement Learning, Statistics, Programming, Business Strategy, or Other.

Document: ${document.title}
Summary: ${document.summary}
Keywords: ${document.keywords.join(', ')}

Respond with only the category name:`;

      const response = await fetch(`${this.ollamaUrl}/api/generate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: this.model,
          prompt,
          stream: false,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        const topic = data.response.trim();
        return this.validateTopic(topic);
      }
    } catch (error) {
      console.warn('Failed to detect topic via Ollama:', error);
    }

    // Fallback to keyword-based topic detection
    return this.detectTopicFallback(document);
  }

  private validateTopic(topic: string): string {
    const validTopics = [
      'Machine Learning', 'Deep Learning', 'Data Science', 'AI Ethics',
      'Business Intelligence', 'Natural Language Processing', 'Computer Vision',
      'Reinforcement Learning', 'Statistics', 'Programming', 'Business Strategy'
    ];

    const normalizedTopic = topic.trim();
    const match = validTopics.find(t => 
      t.toLowerCase() === normalizedTopic.toLowerCase() ||
      normalizedTopic.toLowerCase().includes(t.toLowerCase())
    );

    return match || 'Other';
  }

  private detectTopicFallback(document: DocumentNode): string {
    const text = `${document.title} ${document.summary} ${document.keywords.join(' ')}`.toLowerCase();
    
    const topicKeywords = {
      'Machine Learning': ['machine learning', 'ml', 'algorithm', 'model', 'training', 'supervised', 'unsupervised'],
      'Deep Learning': ['deep learning', 'neural network', 'cnn', 'rnn', 'transformer', 'pytorch', 'tensorflow'],
      'Data Science': ['data science', 'analytics', 'visualization', 'pandas', 'numpy', 'statistics'],
      'AI Ethics': ['ethics', 'bias', 'fairness', 'responsible ai', 'governance', 'regulation'],
      'Business Intelligence': ['business', 'strategy', 'management', 'leadership', 'productivity'],
      'Natural Language Processing': ['nlp', 'text', 'language', 'chatbot', 'sentiment', 'tokenization'],
      'Computer Vision': ['computer vision', 'image', 'opencv', 'detection', 'recognition'],
      'Programming': ['python', 'code', 'programming', 'development', 'software'],
      'Statistics': ['statistics', 'probability', 'regression', 'hypothesis', 'distribution']
    };

    let bestTopic = 'Other';
    let maxScore = 0;

    for (const [topic, keywords] of Object.entries(topicKeywords)) {
      const score = keywords.reduce((acc, keyword) => {
        return acc + (text.includes(keyword) ? 1 : 0);
      }, 0);

      if (score > maxScore) {
        maxScore = score;
        bestTopic = topic;
      }
    }

    return bestTopic;
  }

  private generateFallbackEmbedding(text: string): number[] {
    // Simple hash-based embedding as fallback
    const words = text.toLowerCase().split(/\s+/);
    const embedding = new Array(384).fill(0); // Standard embedding size
    
    words.forEach((word, index) => {
      const hash = this.hashString(word);
      for (let i = 0; i < embedding.length; i++) {
        embedding[i] += Math.sin(hash + i + index) * 0.1;
      }
    });

    // Normalize
    const magnitude = Math.sqrt(embedding.reduce((sum, val) => sum + val * val, 0));
    return embedding.map(val => val / (magnitude || 1));
  }

  private hashString(str: string): number {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash);
  }

  calculateSimilarity(embedding1: number[], embedding2: number[]): number {
    if (embedding1.length !== embedding2.length) return 0;
    
    let dotProduct = 0;
    let norm1 = 0;
    let norm2 = 0;
    
    for (let i = 0; i < embedding1.length; i++) {
      dotProduct += embedding1[i] * embedding2[i];
      norm1 += embedding1[i] * embedding1[i];
      norm2 += embedding2[i] * embedding2[i];
    }
    
    const magnitude = Math.sqrt(norm1) * Math.sqrt(norm2);
    return magnitude === 0 ? 0 : dotProduct / magnitude;
  }

  async processDocuments(documents: DocumentNode[]): Promise<EmbeddingData> {
    const embeddings: EmbeddingData = {};
    
    for (const doc of documents) {
      try {
        const [embedding, topic] = await Promise.all([
          this.generateDocumentEmbedding(doc),
          this.detectTopic(doc)
        ]);
        
        embeddings[doc.id] = {
          embedding,
          topic,
          topicConfidence: 0.8 // Placeholder confidence score
        };
      } catch (error) {
        console.warn(`Failed to process document ${doc.id}:`, error);
        // Use fallback values
        embeddings[doc.id] = {
          embedding: this.generateFallbackEmbedding(doc.summary),
          topic: this.detectTopicFallback(doc),
          topicConfidence: 0.5
        };
      }
    }
    
    return embeddings;
  }

  generateTopicClusters(embeddings: EmbeddingData): TopicCluster[] {
    const topicGroups: { [topic: string]: string[] } = {};
    
    // Group documents by topic
    Object.entries(embeddings).forEach(([docId, data]) => {
      if (!topicGroups[data.topic]) {
        topicGroups[data.topic] = [];
      }
      topicGroups[data.topic].push(docId);
    });

    // Generate colors for topics
    const colors = [
      '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7',
      '#DDA0DD', '#98D8C8', '#F7DC6F', '#BB8FCE', '#85C1E9',
      '#F8C471', '#82E0AA', '#F1948A', '#85C1E9', '#D7BDE2'
    ];

    return Object.entries(topicGroups).map(([topic, documents], index) => {
      // Calculate centroid for topic
      const topicEmbeddings = documents.map(docId => embeddings[docId].embedding);
      const centroid = this.calculateCentroid(topicEmbeddings);

      return {
        topic,
        color: colors[index % colors.length],
        documents,
        centroid
      };
    });
  }

  private calculateCentroid(embeddings: number[][]): number[] {
    if (embeddings.length === 0) return [];
    
    const dimensions = embeddings[0].length;
    const centroid = new Array(dimensions).fill(0);
    
    embeddings.forEach(embedding => {
      embedding.forEach((value, index) => {
        centroid[index] += value;
      });
    });
    
    return centroid.map(sum => sum / embeddings.length);
  }

  async saveEmbeddings(embeddings: EmbeddingData): Promise<void> {
    try {
      // Store embeddings in localStorage for caching (no file download)
      localStorage.setItem('document-embeddings', JSON.stringify(embeddings));
      console.log('Embeddings saved to cache successfully');
    } catch (error) {
      console.warn('Failed to save embeddings to cache:', error);
    }
  }

  loadCachedEmbeddings(): EmbeddingData | null {
    try {
      const cached = localStorage.getItem('document-embeddings');
      return cached ? JSON.parse(cached) : null;
    } catch {
      return null;
    }
  }
}
