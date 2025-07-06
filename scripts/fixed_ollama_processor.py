#!/usr/bin/env python3
"""
Enhanced Ollama document processor with multi-chunk analysis and multi-pass approach
Optimized for performance, clarity, and maintainability
"""

import json
import os
import sys
import time
import hashlib
import logging
import re
from datetime import datetime
from pathlib import Path
from typing import Dict, List, Optional, Tuple, Any
from dataclasses import dataclass, asdict
from concurrent.futures import ThreadPoolExecutor, as_completed
import ollama
import PyPDF2

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

@dataclass
class DocumentChunk:
    """Represents a chunk of document content with metadata."""
    content: str
    page_start: int
    page_end: int
    chunk_id: str
    overlap_with_previous: bool = False

@dataclass
class AnalysisResult:
    """Structured result from document analysis."""
    title: str = ""
    authors: List[str] = None
    summary: str = ""
    category: str = ""
    keywords: List[str] = None
    key_concepts: List[str] = None
    technical_details: Dict[str, Any] = None
    business_context: Dict[str, Any] = None
    confidence_score: float = 0.0
    
    def __post_init__(self):
        if self.keywords is None:
            self.keywords = []
        if self.key_concepts is None:
            self.key_concepts = []
        if self.technical_details is None:
            self.technical_details = {}
        if self.business_context is None:
            self.business_context = {}

class DocumentChunker:
    """Handles intelligent document chunking with overlap."""
    
    def __init__(self, chunk_size: int = 2000, overlap_size: int = 200):
        self.chunk_size = chunk_size
        self.overlap_size = overlap_size
    
    def chunk_document(self, text: str, max_pages: int = 20) -> List[DocumentChunk]:
        """Create overlapping chunks from document text."""
        chunks = []
        words = text.split()
        
        if len(words) <= self.chunk_size:
            return [DocumentChunk(
                content=text,
                page_start=1,
                page_end=min(max_pages, len(text) // 500 + 1),
                chunk_id=self._generate_chunk_id(text)
            )]
        
        start_idx = 0
        chunk_num = 0
        
        while start_idx < len(words) and chunk_num < max_pages:
            end_idx = min(start_idx + self.chunk_size, len(words))
            chunk_words = words[start_idx:end_idx]
            
            # Add overlap from previous chunk if not the first chunk
            if start_idx > 0:
                overlap_start = max(0, start_idx - self.overlap_size)
                overlap_words = words[overlap_start:start_idx]
                chunk_words = overlap_words + chunk_words
                has_overlap = True
            else:
                has_overlap = False
            
            chunk_content = ' '.join(chunk_words)
            chunk = DocumentChunk(
                content=chunk_content,
                page_start=chunk_num + 1,
                page_end=min(chunk_num + 1, max_pages),
                chunk_id=self._generate_chunk_id(chunk_content),
                overlap_with_previous=has_overlap
            )
            
            chunks.append(chunk)
            start_idx += self.chunk_size
            chunk_num += 1
        
        return chunks
    
    def _generate_chunk_id(self, content: str) -> str:
        """Generate unique ID for chunk."""
        return hashlib.md5(content.encode()).hexdigest()[:8]

class OllamaClient:
    """Handles communication with Ollama API."""
    
    def __init__(self, model_name: str = "gemma3:4b", host: str = None):
        self.model_name = model_name
        self.host = host or os.getenv('OLLAMA_HOST', '127.0.0.1:11434')
        if not self.host.startswith('http'):
            self.host = f"http://{self.host}"
        
        self.client = ollama.Client(host=self.host)
    
    def is_available(self) -> bool:
        """Check if Ollama service is available."""
        try:
            self.client.list()
            return True
        except Exception as e:
            error_msg = str(e).lower()
            if "connection refused" in error_msg or "connection error" in error_msg:
                logger.error(f"❌ Ollama service not running on {self.host}")
                logger.error("💡 Try running: ./scripts/start_ollama_service.sh")
                logger.error("💡 Or manually: ollama serve &")
            elif "address already in use" in error_msg:
                logger.error(f"❌ Port 11434 already in use")
                logger.error("💡 Run: ./scripts/start_ollama_service.sh to fix this")
            else:
                logger.error(f"❌ Ollama service error: {e}")
            return False
    
    def ensure_model_available(self) -> bool:
        """Ensure the model is available in Ollama."""
        try:
            models = self.client.list()
            available_models = [model['name'] for model in models.get('models', [])]
            
            if self.model_name not in available_models:
                logger.info(f"Model {self.model_name} not found. Attempting to pull...")
                self.client.pull(self.model_name)
                logger.info(f"Successfully pulled {self.model_name}")
            
            return True
        except Exception as e:
            logger.error(f"Failed to ensure model availability: {e}")
            return False
    
    def generate_response(self, prompt: str, max_retries: int = 3) -> Optional[str]:
        """Generate response from Ollama with retry logic."""
        for attempt in range(max_retries):
            try:
                response = self.client.generate(
                    model=self.model_name,
                    prompt=prompt,
                    options={
                        "temperature": 0.1,
                        "top_p": 0.9,
                        "num_predict": 500
                    }
                )
                
                return response.get('response', '').strip()
                
            except Exception as e:
                logger.error(f"Attempt {attempt + 1} failed: {e}")
                if attempt < max_retries - 1:
                    time.sleep(2 ** attempt)  # Exponential backoff
        
        return None

class MultiPassAnalyzer:
    """Performs multi-pass analysis on document chunks."""
    
    def __init__(self, ollama_client: OllamaClient):
        self.ollama_client = ollama_client
        self.prompts = self._initialize_prompts()
    
    def _initialize_prompts(self) -> Dict[str, str]:
        """Initialize focused prompts for each analysis pass."""
        return {
            "basic_info": """
Analyze this document excerpt and extract basic information.
Respond with valid JSON only:
{{"title": "document title or main topic", "authors": ["author1", "author2"], "summary": "summarize the document with at least 600 characters", "category": "document category (AI, Machine Learning, Data Science, Analytics, Business, Technology, Research)"}}

Document excerpt:
{content}
""",
            
            "keywords": """
Extract keywords and key concepts from this document excerpt.
Respond with valid JSON only:
{{"keywords": ["keyword1", "keyword2", "keyword3"], "key_concepts": ["A sentence expressing a concept1", "A sentence expressing a concept2", "A sentence expressing a concept3"]}}

Document excerpt:
{content}
""",
            
            "technical": """
Identify technical details from this document excerpt.
Respond with valid JSON only:
{{"technologies": ["tech1", "tech2"], "methodologies": ["method1", "method2"], "tools": ["tool1", "tool2"], "complexity_level": "basic/intermediate/advanced"}}

Document excerpt:
{content}
""",
            
            "business": """
Extract business context from this document excerpt.
Respond with valid JSON only:
{{"industry": "relevant industry", "use_cases": ["use_case1", "use_case2"], "stakeholders": ["stakeholder1", "stakeholder2"], "business_value": "brief description of business value"}}

Document excerpt:
{content}
"""
        }
    
    def analyze_chunk(self, chunk: DocumentChunk) -> AnalysisResult:
        """Perform multi-pass analysis on a single chunk."""
        result = AnalysisResult()
        
        # Pass 1: Basic Information
        basic_info = self._analyze_pass(chunk.content, "basic_info")
        if basic_info:
            result.title = basic_info.get("title", "")
            result.authors = basic_info.get("authors", [])
            result.summary = basic_info.get("summary", "")
            result.category = basic_info.get("category", "")
        
        # Pass 2: Keywords and Concepts
        keywords_info = self._analyze_pass(chunk.content, "keywords")
        if keywords_info:
            result.keywords = keywords_info.get("keywords", [])
            result.key_concepts = keywords_info.get("key_concepts", [])
        
        # Pass 3: Technical Details
        technical_info = self._analyze_pass(chunk.content, "technical")
        if technical_info:
            result.technical_details = technical_info
        
        # Pass 4: Business Context
        business_info = self._analyze_pass(chunk.content, "business")
        if business_info:
            result.business_context = business_info
        
        # Calculate confidence score based on successful passes
        successful_passes = sum([
            bool(basic_info),
            bool(keywords_info),
            bool(technical_info),
            bool(business_info)
        ])
        result.confidence_score = successful_passes / 4.0
        
        return result
    
    def _analyze_pass(self, content: str, pass_type: str) -> Optional[Dict]:
        """Perform a single analysis pass."""
        prompt = self.prompts[pass_type].format(content=content[:1500])  # Limit content size
        
        response = self.ollama_client.generate_response(prompt)
        if not response:
            return None
        
        try:
            # Extract JSON from response
            return self._extract_json(response)
        except Exception as e:
            logger.warning(f"Failed to parse {pass_type} response: {e}")
            return None
    
    def _extract_json(self, response_text: str) -> Optional[Dict]:
        """Extract JSON from response text with robust parsing."""
        if not response_text:
            return None
        
        # Method 1: Direct JSON parsing
        try:
            return json.loads(response_text.strip())
        except json.JSONDecodeError:
            pass
        
        # Method 2: Extract JSON between braces
        first_brace = response_text.find('{')
        last_brace = response_text.rfind('}')
        
        if first_brace != -1 and last_brace != -1 and last_brace > first_brace:
            potential_json = response_text[first_brace:last_brace + 1]
            try:
                return json.loads(potential_json)
            except json.JSONDecodeError:
                pass
        
        return None

class ResultAggregator:
    """Aggregates results from multiple chunks into final document analysis."""
    
    def aggregate_results(self, chunk_results: List[AnalysisResult]) -> Dict:
        """Aggregate multiple chunk analysis results into final document analysis."""
        if not chunk_results:
            return self._get_empty_result()
        
        # Find the result with highest confidence score for basic info
        best_result = max(chunk_results, key=lambda r: r.confidence_score)
        
        # Aggregate keywords and concepts from all chunks
        all_keywords = []
        all_concepts = []
        all_technical = {}
        all_business = {}
        
        for result in chunk_results:
            all_keywords.extend(result.keywords)
            all_concepts.extend(result.key_concepts)
            
            # Merge technical details
            for key, value in result.technical_details.items():
                if key not in all_technical:
                    all_technical[key] = []
                if isinstance(value, list):
                    all_technical[key].extend(value)
                else:
                    all_technical[key].append(value)
            
            # Merge business context
            for key, value in result.business_context.items():
                if key not in all_business:
                    all_business[key] = []
                if isinstance(value, list):
                    all_business[key].extend(value)
                else:
                    all_business[key].append(value)
        
        # Remove duplicates and limit counts
        unique_keywords = list(dict.fromkeys(all_keywords))[:10]
        unique_concepts = list(dict.fromkeys(all_concepts))[:10]
        
        # Clean technical and business data
        for key in all_technical:
            if isinstance(all_technical[key], list):
                all_technical[key] = list(dict.fromkeys(all_technical[key]))[:5]
        
        for key in all_business:
            if isinstance(all_business[key], list):
                all_business[key] = list(dict.fromkeys(all_business[key]))[:5]

        # Aggregate and deduplicate complexity_level (if present)
        complexity_levels = [
            v for r in chunk_results for k, v in r.technical_details.items()
            if k == "complexity_level" and isinstance(v, str) and v
        ]
        if complexity_levels:
            from collections import Counter
            mode_level, _ = Counter(complexity_levels).most_common(1)[0]
            all_technical["complexity_level"] = mode_level
        
        return {
            "title": best_result.title,
            "authors": best_result.authors or [],
            "summary": best_result.summary,
            "category": best_result.category,
            "keywords": unique_keywords,
            "key_concepts": unique_concepts,
            "technical_details": all_technical,
            "business_context": all_business,
            "confidence_score": sum(r.confidence_score for r in chunk_results) / len(chunk_results)
        }
    
    def _get_empty_result(self) -> Dict:
        """Return empty result structure."""
        return {
            "title": "",
            "summary": "",
            "category": "Technology",
            "keywords": [],
            "key_concepts": [],
            "technical_details": {},
            "business_context": {},
            "confidence_score": 0.0
        }

class FixedOllamaDocumentProcessor:
    """Enhanced document processor with multi-chunk analysis and multi-pass approach."""
    
    def __init__(self, model_name: str = "gemma3:4b"):
        self.model_name = model_name
        self.base_dir = Path.cwd()
        self.documents_dir = self.base_dir / 'documents'
        self.data_dir = self.base_dir / 'data'
        self.dist_data_dir = self.base_dir / 'dist' / 'data'
        self.processed_files_path = self.data_dir / 'processed_files.json'
        
        # Initialize components
        self.ollama_client = OllamaClient(model_name)
        self.chunker = DocumentChunker()
        self.analyzer = MultiPassAnalyzer(self.ollama_client)
        self.aggregator = ResultAggregator()
        
        # Backward compatibility
        self.ollama_host = self.ollama_client.host
        
        logger.info(f"Initialized enhanced processor with model: {model_name}")
    
    def ensure_model_available(self) -> bool:
        """Ensure the Ollama model is available (backward compatibility)."""
        return self.ollama_client.ensure_model_available()
    
    def extract_pdf_text(self, filepath: Path, max_pages: int = 20) -> str:
        """Extract text from PDF file with increased page limit."""
        try:
            with open(filepath, 'rb') as file:
                pdf_reader = PyPDF2.PdfReader(file)
                text = ""
                
                pages_to_read = min(len(pdf_reader.pages), max_pages)
                for page_num in range(pages_to_read):
                    page = pdf_reader.pages[page_num]
                    text += page.extract_text() + "\n"
                
                return text.strip()
        except Exception as e:
            logger.warning(f"Failed to extract text from {filepath}: {e}")
            return ""
    
    def analyze_document_enhanced(self, text: str, filename: str) -> Dict:
        """Enhanced document analysis with multi-chunk and multi-pass approach."""
        if not text.strip():
            return self._get_fallback_analysis(filename)
        
        # Step 1: Create chunks with overlap
        chunks = self.chunker.chunk_document(text, max_pages=20)
        logger.info(f"Created {len(chunks)} chunks for {filename}")
        
        # Step 2: Analyze each chunk with multi-pass approach
        chunk_results = []
        for i, chunk in enumerate(chunks):
            logger.info(f"Analyzing chunk {i+1}/{len(chunks)} for {filename}")
            result = self.analyzer.analyze_chunk(chunk)
            chunk_results.append(result)
        
        # Step 3: Aggregate results
        final_analysis = self.aggregator.aggregate_results(chunk_results)
        
        # Step 4: Validate and enhance final result
        return self._validate_and_enhance_analysis(final_analysis, filename)
    
    def _map_complexity_to_difficulty(self, complexity_level: str) -> str:
        """Map complexity level to difficulty."""
        complexity_mapping = {
            "basic": "Basic",
            "intermediate": "Intermediate", 
            "advanced": "Advanced"
        }
        return complexity_mapping.get(complexity_level.lower(), "Intermediate")
    
    def _validate_and_enhance_analysis(self, analysis: Dict, filename: str) -> Dict:
        """Validate and enhance the aggregated analysis."""
        # Ensure required fields exist
        if not analysis.get("title"):
            analysis["title"] = filename.replace('.pdf', '').replace('_', ' ').replace('-', ' ')
        
        # Validate category
        valid_categories = ["AI", "Machine Learning", "Data Science", "Analytics", "Business", "Technology", "Research"]
        if analysis.get("category") not in valid_categories:
            analysis["category"] = self._infer_category_from_filename(filename)
        
        # Ensure minimum content
        if not analysis.get("summary"):
            analysis["summary"] = f"This document covers {analysis['title'].lower()} with detailed analysis and practical insights."
        
        if not analysis.get("keywords"):
            analysis["keywords"] = self._extract_keywords_from_filename(filename)
        
        # Map complexity level to difficulty
        complexity_level = analysis.get("technical_details", {}).get("complexity_level", "intermediate")
        difficulty = self._map_complexity_to_difficulty(complexity_level)
        
        # Add traditional fields for compatibility
        analysis.update({
            "difficulty": difficulty,
            "authors": analysis.get("authors", []),
            "content_preview": f"Document: {analysis['title']}",
            "target_audience": f"Professionals in {analysis['category'].lower()} field",
            "industry": analysis.get("business_context", {}).get("industry", ["Technology"]),
            "business_functions": ["Research and Development", "Strategy"],
            "companies": [],
            "technologies": analysis.get("technical_details", {}).get("technologies", []),
            "processes": ["Analysis", "Implementation"],
            "technical_terms": analysis.get("keywords", [])[:3],
            "methodologies": analysis.get("technical_details", {}).get("methodologies", []),
            "tools_mentioned": analysis.get("technical_details", {}).get("tools", []),
            "prerequisites": ["Basic understanding of the subject matter"],
            "learning_objectives": [f"Understand {analysis['category'].lower()} concepts"],
            "use_cases": analysis.get("business_context", {}).get("use_cases", []),
            "benefits_mentioned": ["Improved understanding", "Practical insights"],
            "challenges_addressed": ["Knowledge gaps", "Implementation challenges"],
            "best_practices": ["Follow systematic approaches"],
            "questions_and_answers": self._generate_qa(analysis)
        })
        
        return analysis
    
    def _infer_category_from_filename(self, filename: str) -> str:
        """Infer category from filename."""
        filename_lower = filename.lower()
        if any(word in filename_lower for word in ['ai', 'artificial']):
            return "AI"
        elif any(word in filename_lower for word in ['machine', 'learning', 'ml']):
            return "Machine Learning"
        elif any(word in filename_lower for word in ['data', 'analytics']):
            return "Data Science"
        elif any(word in filename_lower for word in ['business']):
            return "Business"
        else:
            return "Technology"
    
    def _extract_keywords_from_filename(self, filename: str) -> List[str]:
        """Extract keywords from filename."""
        filename_lower = filename.lower()
        keyword_map = {
            'ai': 'AI', 'machine': 'Machine Learning', 'data': 'Data Science',
            'learning': 'Machine Learning', 'neural': 'Neural Networks',
            'deep': 'Deep Learning', 'analytics': 'Analytics',
            'business': 'Business', 'python': 'Python'
        }
        
        keywords = []
        for key, value in keyword_map.items():
            if key in filename_lower and value not in keywords:
                keywords.append(value)
        
        return keywords if keywords else ['Technology']
    
    def _generate_qa(self, analysis: Dict) -> List[str]:
        """Generate Q&A based on analysis."""
        # Extract relevant information from analysis
        title = analysis.get('title', 'Document analysis')
        category = analysis.get('category', 'Technology')
        keywords = analysis.get('keywords', [])
        key_concepts = analysis.get('key_concepts', [])
        technical_details = analysis.get('technical_details', {})
        business_context = analysis.get('business_context', {})
        use_cases = analysis.get('use_cases', [])
        challenges = analysis.get('challenges_addressed', [])
        
        # Generate answers based on the new question framework
        qa_pairs = []
        
        # 🔍 1. What specific problem does this document aim to solve or highlight, and why does it matter now?
        problem_focus = f"This document addresses challenges in {category.lower()}"
        if challenges:
            problem_focus = f"This document tackles {', '.join(challenges[:2])}"
        elif key_concepts:
            problem_focus = f"This document explores {key_concepts[0] if key_concepts else 'key industry challenges'}"
        
        qa_pairs.append(f"🔍 Q: What specific problem does this document aim to solve or highlight, and why does it matter now? A: {problem_focus}, which is critical in today's rapidly evolving technological landscape where organizations need practical guidance to stay competitive.")
        
        # 💡 2. Which AI or data science methods or technologies are presented as game-changers, and in what context?
        technologies = technical_details.get('technologies', []) or keywords[:2]
        methodologies = technical_details.get('methodologies', [])
        game_changers = technologies + methodologies
        
        if game_changers:
            tech_answer = f"The document highlights {', '.join(game_changers[:3])} as transformative technologies"
        else:
            tech_answer = f"The document presents {category.lower()} innovations"
        
        context = business_context.get('industry', ['technology sector'])[0] if business_context.get('industry') else 'technology sector'
        qa_pairs.append(f"💡 Q: Which AI or data science methods or technologies are presented as game-changers, and in what context? A: {tech_answer} in the context of {context}, demonstrating their potential to revolutionize traditional approaches and create new opportunities for innovation.")
        
        # 🧭 3. How can the insights or use cases from this document be applied to real-world scenarios or decisions?
        if use_cases:
            application_answer = f"The insights can be applied through {', '.join(use_cases[:2])}"
        elif business_context.get('use_cases'):
            application_answer = f"The document provides practical applications including {', '.join(business_context['use_cases'][:2])}"
        else:
            application_answer = f"The insights from this {category.lower()} document can be applied to strategic decision-making and operational improvements"
        
        qa_pairs.append(f"🧭 Q: How can the insights or use cases from this document be applied to real-world scenarios or decisions? A: {application_answer}, enabling professionals to translate theoretical knowledge into actionable strategies that drive measurable business outcomes.")
        
        # 🌍 4. What shifts or trends are emerging from the data or case studies, and how should a professional respond?
        if keywords:
            trends = f"emerging trends in {', '.join(keywords[:2])}"
        else:
            trends = f"significant shifts in {category.lower()}"
        
        qa_pairs.append(f"🌍 Q: What shifts or trends are emerging from the data or case studies, and how should a professional respond? A: The document reveals {trends}, suggesting professionals should adapt by developing new competencies, embracing continuous learning, and positioning themselves at the forefront of industry transformation.")
        
        # 🔄 5. Which traditional assumptions are challenged or redefined by the findings in this document?
        if key_concepts:
            challenged_assumptions = f"traditional approaches to {key_concepts[0].lower() if key_concepts[0] else category.lower()}"
        else:
            challenged_assumptions = f"conventional {category.lower()} practices"
        
        qa_pairs.append(f"🔄 Q: Which traditional assumptions are challenged or redefined by the findings in this document? A: The document challenges {challenged_assumptions}, presenting evidence that conventional wisdom may be outdated and advocating for more innovative, data-driven approaches that better align with current market realities.")
        
        return qa_pairs
    
    def _get_fallback_analysis(self, filename: str) -> Dict:
        """Provide fallback analysis when processing fails."""
        clean_title = filename.replace('.pdf', '').replace('_', ' ').replace('-', ' ')
        category = self._infer_category_from_filename(filename)
        keywords = self._extract_keywords_from_filename(filename)
        
        # Infer complexity from filename patterns
        filename_lower = filename.lower()
        if any(word in filename_lower for word in ['basic', 'intro', 'beginner', 'fundamentals']):
            complexity_level = "basic"
        elif any(word in filename_lower for word in ['advanced', 'expert', 'deep', 'comprehensive']):
            complexity_level = "advanced"
        else:
            complexity_level = "intermediate"
        
        return {
            "title": clean_title,
            "summary": f"This document provides comprehensive coverage of {clean_title.lower()} concepts and applications.",
            "category": category,
            "keywords": keywords,
            "key_concepts": [f"Core concepts in {category.lower()}"],
            "technical_details": {"complexity_level": complexity_level},
            "business_context": {"industry": ["Technology"]},
            "confidence_score": 0.5
        }
    
    def get_file_hash(self, filepath: Path) -> str:
        """Generate MD5 hash of file content."""
        with open(filepath, 'rb') as f:
            return hashlib.md5(f.read()).hexdigest()
    
    def load_processed_files(self) -> Dict:
        """Load processed files registry."""
        if self.processed_files_path.exists():
            with open(self.processed_files_path, 'r') as f:
                return json.load(f)
        return {}
    
    def save_processed_files(self, processed_files: Dict):
        """Save processed files registry."""
        self.data_dir.mkdir(exist_ok=True)
        with open(self.processed_files_path, 'w') as f:
            json.dump(processed_files, f, indent=2)
    
    def load_existing_documents(self) -> List[Dict]:
        """Load existing documents database."""
        db_path = self.data_dir / 'documents.json'
        if db_path.exists():
            with open(db_path, 'r', encoding='utf-8') as f:
                return json.load(f)
        return []
    
    def save_documents(self, documents: List[Dict]):
        """Save documents to database."""
        # Save to data directory
        self.data_dir.mkdir(exist_ok=True)
        data_output = self.data_dir / 'documents.json'
        with open(data_output, 'w', encoding='utf-8') as f:
            json.dump(documents, f, indent=2, ensure_ascii=False)
        
        # Save to dist/data directory
        self.dist_data_dir.mkdir(parents=True, exist_ok=True)
        dist_output = self.dist_data_dir / 'documents.json'
        with open(dist_output, 'w', encoding='utf-8') as f:
            json.dump(documents, f, indent=2, ensure_ascii=False)
        
        logger.info(f"Updated documents.json with {len(documents)} documents")
    
    def process_document(self, filepath: Path) -> Dict:
        """Process a single document with enhanced analysis."""
        logger.info(f"Processing document: {filepath.name}")
        
        # Extract text content (up to 20 pages)
        text_content = self.extract_pdf_text(filepath, max_pages=20)
        
        # Enhanced analysis with multi-chunk and multi-pass
        analysis = self.analyze_document_enhanced(text_content, filepath.name)
        
        # Get file stats
        stat = filepath.stat()
        
        # Create document entry
        doc_info = {
            "id": hashlib.md5(str(filepath).encode()).hexdigest(),
            "filename": filepath.name,
            "title": analysis.get("title", filepath.stem.replace('_', ' ')),
            "authors": analysis.get("authors", []),
            "filepath": f"documents/{filepath.name}",
            "upload_date": datetime.fromtimestamp(stat.st_mtime).isoformat(),
            "file_size": stat.st_size,
            "summary": analysis.get("summary", ""),
            "keywords": analysis.get("keywords", []),
            "key_concepts": analysis.get("key_concepts", []),
            "category": analysis.get("category", "Technology"),
            "difficulty": analysis.get("difficulty", "Intermediate"),
            "content_preview": analysis.get("content_preview", ""),
            "target_audience": analysis.get("target_audience", ""),
            "industry": analysis.get("industry", []),
            "business_functions": analysis.get("business_functions", []),
            "companies": analysis.get("companies", []),
            "technologies": analysis.get("technologies", []),
            "processes": analysis.get("processes", []),
            "technical_terms": analysis.get("technical_terms", []),
            "methodologies": analysis.get("methodologies", []),
            "tools_mentioned": analysis.get("tools_mentioned", []),
            "prerequisites": analysis.get("prerequisites", []),
            "learning_objectives": analysis.get("learning_objectives", []),
            "use_cases": analysis.get("use_cases", []),
            "benefits_mentioned": analysis.get("benefits_mentioned", []),
            "challenges_addressed": analysis.get("challenges_addressed", []),
            "best_practices": analysis.get("best_practices", []),
            "questions_and_answers": analysis.get("questions_and_answers", []),
            "confidence_score": analysis.get("confidence_score", 0.0)
        }
        
        return doc_info
    
    def scan_and_process(self, force_reprocess: bool = False) -> bool:
        """Scan and process documents with enhanced analysis."""
        if not self.documents_dir.exists():
            logger.error(f"Documents directory does not exist: {self.documents_dir}")
            return False
        
        # Ensure Ollama model is available
        if not self.ollama_client.ensure_model_available():
            logger.error("Failed to ensure Ollama model availability")
            return False
        
        processed_files = self.load_processed_files()
        existing_documents = self.load_existing_documents() if not force_reprocess else []
        new_documents = []
        updated = False
        
        # Get all PDF files
        pdf_files = list(self.documents_dir.glob('*.pdf'))
        logger.info(f"Found {len(pdf_files)} PDF files")
        
        for filepath in pdf_files:
            if not filepath.is_file():
                continue
            
            file_path_str = str(filepath)
            current_hash = self.get_file_hash(filepath)
            
            # Check if file needs processing
            if force_reprocess or file_path_str not in processed_files or processed_files[file_path_str] != current_hash:
                logger.info(f"Processing {'new' if file_path_str not in processed_files else 'updated'} file: {filepath.name}")
                
                doc_info = self.process_document(filepath)
                
                # Remove old entry if it exists
                existing_documents = [doc for doc in existing_documents if doc['filename'] != filepath.name]
                
                # Add new entry
                new_documents.append(doc_info)
                processed_files[file_path_str] = current_hash
                updated = True
        
        if updated or force_reprocess:
            # Combine existing and new documents
            all_documents = existing_documents + new_documents
            
            # Sort by filename for consistency
            all_documents.sort(key=lambda x: x['filename'])
            
            self.save_documents(all_documents)
            self.save_processed_files(processed_files)
            logger.info("Documents database updated successfully")
            return True
        
        logger.info("No changes detected")
        return False

def main():
    """Main entry point."""
    # Allow custom model name via environment variable or argument
    model_name = os.getenv('OLLAMA_MODEL', 'gemma3:4b')
    if len(sys.argv) > 1 and not sys.argv[1].startswith('--'):
        model_name = sys.argv[1]
    
    # Check for force reprocess flag
    force_reprocess = '--force' in sys.argv or '-f' in sys.argv
    
    processor = FixedOllamaDocumentProcessor(model_name)
    
    logger.info("Starting enhanced document processing...")
    if force_reprocess:
        logger.info("Force reprocessing all documents...")
    
    success = processor.scan_and_process(force_reprocess=force_reprocess)
    
    if success:
        logger.info("Enhanced document processing completed successfully")
    else:
        logger.info("No documents were processed")

if __name__ == "__main__":
    main()
