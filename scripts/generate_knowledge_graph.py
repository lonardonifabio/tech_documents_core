#!/usr/bin/env python3
"""
Knowledge Graph Generator for Document Library
Automatically generates embeddings and knowledge graph data when documents are uploaded.
"""

import json
import os
import sys
import requests
import hashlib
from typing import Dict, List, Any, Optional
from pathlib import Path
import time

class KnowledgeGraphGenerator:
    def __init__(self, ollama_url: str = "http://localhost:11434"):
        self.ollama_url = ollama_url
        self.model = "mistral"
        # Handle both local and GitHub Actions environments
        script_dir = Path(__file__).parent
        project_root = script_dir.parent
        self.data_dir = project_root / "data"
        self.documents_file = self.data_dir / "documents.json"
        self.embeddings_file = self.data_dir / "knowledge_graph_embeddings.json"
        
    def check_ollama_connection(self) -> bool:
        """Check if Ollama is running and Mistral model is available."""
        try:
            response = requests.get(f"{self.ollama_url}/api/tags", timeout=5)
            if response.ok:
                data = response.json()
                models = data.get("models", [])
                has_mistral = any("mistral" in model.get("name", "").lower() for model in models)
                print(f"Ollama connected. Available models: {[m.get('name') for m in models]}")
                return has_mistral
            return False
        except Exception as e:
            print(f"Ollama connection failed: {e}")
            return False
    
    def generate_embedding(self, text: str) -> Optional[List[float]]:
        """Generate embedding for text using Ollama."""
        try:
            response = requests.post(
                f"{self.ollama_url}/api/embeddings",
                json={
                    "model": self.model,
                    "prompt": text
                },
                timeout=30
            )
            
            if response.ok:
                data = response.json()
                return data.get("embedding")
            else:
                print(f"Ollama API error: {response.status_code}")
                return None
                
        except Exception as e:
            print(f"Failed to generate embedding: {e}")
            return None
    
    def generate_fallback_embedding(self, text: str) -> List[float]:
        """Generate simple hash-based embedding as fallback."""
        words = text.lower().split()
        embedding = [0.0] * 384  # Standard embedding size
        
        for i, word in enumerate(words):
            word_hash = int(hashlib.md5(word.encode()).hexdigest(), 16)
            for j in range(len(embedding)):
                embedding[j] += (word_hash % 1000) * 0.001 * (1 + j + i)
        
        # Normalize
        magnitude = sum(x * x for x in embedding) ** 0.5
        if magnitude > 0:
            embedding = [x / magnitude for x in embedding]
        
        return embedding
    
    def detect_topic(self, document: Dict[str, Any]) -> str:
        """Detect topic using Ollama or fallback to keyword-based detection."""
        try:
            prompt = f"""Analyze this document and classify it into ONE of these categories: Machine Learning, Deep Learning, Data Science, AI Ethics, Business Intelligence, Natural Language Processing, Computer Vision, Reinforcement Learning, Statistics, Programming, Business Strategy, or Other.

Document: {document.get('title', '')}
Summary: {document.get('summary', '')}
Keywords: {', '.join(document.get('keywords', []))}

Respond with only the category name:"""

            response = requests.post(
                f"{self.ollama_url}/api/generate",
                json={
                    "model": self.model,
                    "prompt": prompt,
                    "stream": False
                },
                timeout=30
            )
            
            if response.ok:
                data = response.json()
                topic = data.get("response", "").strip()
                return self.validate_topic(topic)
                
        except Exception as e:
            print(f"Failed to detect topic via Ollama: {e}")
        
        # Fallback to keyword-based detection
        return self.detect_topic_fallback(document)
    
    def validate_topic(self, topic: str) -> str:
        """Validate and normalize topic name."""
        valid_topics = [
            'Machine Learning', 'Deep Learning', 'Data Science', 'AI Ethics',
            'Business Intelligence', 'Natural Language Processing', 'Computer Vision',
            'Reinforcement Learning', 'Statistics', 'Programming', 'Business Strategy'
        ]
        
        topic = topic.strip()
        for valid_topic in valid_topics:
            if valid_topic.lower() in topic.lower() or topic.lower() in valid_topic.lower():
                return valid_topic
        
        return 'Other'
    
    def detect_topic_fallback(self, document: Dict[str, Any]) -> str:
        """Fallback topic detection based on keywords."""
        text = f"{document.get('title', '')} {document.get('summary', '')} {' '.join(document.get('keywords', []))}".lower()
        
        topic_keywords = {
            'Machine Learning': ['machine learning', 'ml', 'algorithm', 'model', 'training', 'supervised', 'unsupervised'],
            'Deep Learning': ['deep learning', 'neural network', 'cnn', 'rnn', 'transformer', 'pytorch', 'tensorflow'],
            'Data Science': ['data science', 'analytics', 'visualization', 'pandas', 'numpy', 'statistics'],
            'AI Ethics': ['ethics', 'bias', 'fairness', 'responsible ai', 'governance', 'regulation'],
            'Business Intelligence': ['business', 'strategy', 'management', 'leadership', 'productivity'],
            'Natural Language Processing': ['nlp', 'text', 'language', 'chatbot', 'sentiment', 'tokenization'],
            'Computer Vision': ['computer vision', 'image', 'opencv', 'detection', 'recognition'],
            'Programming': ['python', 'code', 'programming', 'development', 'software'],
            'Statistics': ['statistics', 'probability', 'regression', 'hypothesis', 'distribution']
        }
        
        best_topic = 'Other'
        max_score = 0
        
        for topic, keywords in topic_keywords.items():
            score = sum(1 for keyword in keywords if keyword in text)
            if score > max_score:
                max_score = score
                best_topic = topic
        
        return best_topic
    
    def calculate_similarity(self, emb1: List[float], emb2: List[float]) -> float:
        """Calculate cosine similarity between two embeddings."""
        if len(emb1) != len(emb2):
            return 0.0
        
        dot_product = sum(a * b for a, b in zip(emb1, emb2))
        norm1 = sum(a * a for a in emb1) ** 0.5
        norm2 = sum(b * b for b in emb2) ** 0.5
        
        if norm1 == 0 or norm2 == 0:
            return 0.0
        
        return dot_product / (norm1 * norm2)
    
    def load_documents(self) -> List[Dict[str, Any]]:
        """Load documents from JSON file."""
        if not self.documents_file.exists():
            print(f"Documents file not found: {self.documents_file}")
            return []
        
        try:
            with open(self.documents_file, 'r', encoding='utf-8') as f:
                documents = json.load(f)
            print(f"Loaded {len(documents)} documents")
            return documents
        except Exception as e:
            print(f"Failed to load documents: {e}")
            return []
    
    def process_documents(self, documents: List[Dict[str, Any]]) -> Dict[str, Any]:
        """Process documents to generate embeddings and topics."""
        embeddings_data = {}
        ollama_connected = self.check_ollama_connection()
        
        print(f"Processing {len(documents)} documents...")
        print(f"Using {'Ollama' if ollama_connected else 'fallback'} for embeddings")
        
        for i, doc in enumerate(documents):
            doc_id = doc.get('id')
            if not doc_id:
                continue
            
            print(f"Processing document {i+1}/{len(documents)}: {doc.get('title', 'Unknown')[:50]}...")
            
            # Generate text for embedding
            text = f"{doc.get('title', '')} {doc.get('summary', '')} {' '.join(doc.get('keywords', []))} {doc.get('category', '')}"
            
            # Generate embedding
            if ollama_connected:
                embedding = self.generate_embedding(text)
                if embedding is None:
                    embedding = self.generate_fallback_embedding(text)
            else:
                embedding = self.generate_fallback_embedding(text)
            
            # Detect topic
            if ollama_connected:
                topic = self.detect_topic(doc)
            else:
                topic = self.detect_topic_fallback(doc)
            
            embeddings_data[doc_id] = {
                "embedding": embedding,
                "topic": topic,
                "topicConfidence": 0.8 if ollama_connected else 0.5
            }
            
            # Small delay to avoid overwhelming Ollama
            if ollama_connected:
                time.sleep(0.1)
        
        return embeddings_data
    
    def generate_topic_clusters(self, embeddings_data: Dict[str, Any]) -> List[Dict[str, Any]]:
        """Generate topic clusters with colors."""
        topic_groups = {}
        
        # Group documents by topic
        for doc_id, data in embeddings_data.items():
            topic = data["topic"]
            if topic not in topic_groups:
                topic_groups[topic] = []
            topic_groups[topic].append(doc_id)
        
        # Generate colors for topics
        colors = [
            '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7',
            '#DDA0DD', '#98D8C8', '#F7DC6F', '#BB8FCE', '#85C1E9',
            '#F8C471', '#82E0AA', '#F1948A', '#85C1E9', '#D7BDE2'
        ]
        
        clusters = []
        for i, (topic, documents) in enumerate(topic_groups.items()):
            # Calculate centroid
            topic_embeddings = [embeddings_data[doc_id]["embedding"] for doc_id in documents]
            if topic_embeddings:
                centroid = [sum(emb[j] for emb in topic_embeddings) / len(topic_embeddings) 
                           for j in range(len(topic_embeddings[0]))]
            else:
                centroid = []
            
            clusters.append({
                "topic": topic,
                "color": colors[i % len(colors)],
                "documents": documents,
                "centroid": centroid
            })
        
        return clusters
    
    def generate_graph_links(self, embeddings_data: Dict[str, Any], similarity_threshold: float = 0.3) -> List[Dict[str, Any]]:
        """Generate links between documents based on similarity."""
        links = []
        doc_ids = list(embeddings_data.keys())
        
        for i in range(len(doc_ids)):
            for j in range(i + 1, len(doc_ids)):
                doc1_id = doc_ids[i]
                doc2_id = doc_ids[j]
                
                emb1 = embeddings_data[doc1_id]["embedding"]
                emb2 = embeddings_data[doc2_id]["embedding"]
                
                similarity = self.calculate_similarity(emb1, emb2)
                
                if similarity > similarity_threshold:
                    links.append({
                        "source": doc1_id,
                        "target": doc2_id,
                        "similarity": similarity,
                        "weight": similarity
                    })
        
        return links
    
    def save_knowledge_graph_data(self, embeddings_data: Dict[str, Any]) -> None:
        """Save complete knowledge graph data."""
        # Generate clusters and links
        clusters = self.generate_topic_clusters(embeddings_data)
        links = self.generate_graph_links(embeddings_data)
        
        # Create complete knowledge graph data
        knowledge_graph_data = {
            "embeddings": embeddings_data,
            "clusters": clusters,
            "links": links,
            "metadata": {
                "generated_at": time.strftime("%Y-%m-%d %H:%M:%S UTC", time.gmtime()),
                "total_documents": len(embeddings_data),
                "total_topics": len(clusters),
                "total_links": len(links),
                "similarity_threshold": 0.3
            }
        }
        
        # Ensure data directory exists
        self.data_dir.mkdir(exist_ok=True)
        
        # Save to file
        with open(self.embeddings_file, 'w', encoding='utf-8') as f:
            json.dump(knowledge_graph_data, f, indent=2, ensure_ascii=False)
        
        print(f"Knowledge graph data saved to {self.embeddings_file}")
        print(f"Generated {len(clusters)} topic clusters and {len(links)} similarity links")
    
    def run(self) -> None:
        """Main execution function."""
        print("🕸️ Knowledge Graph Generator Starting...")
        
        # Load documents
        documents = self.load_documents()
        if not documents:
            print("No documents found. Exiting.")
            return
        
        # Process documents
        embeddings_data = self.process_documents(documents)
        
        # Save knowledge graph data
        self.save_knowledge_graph_data(embeddings_data)
        
        print("✅ Knowledge Graph Generation Complete!")

def main():
    """Main entry point."""
    generator = KnowledgeGraphGenerator()
    generator.run()

if __name__ == "__main__":
    main()
