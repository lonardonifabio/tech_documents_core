import React, { useState, useEffect } from 'react';

interface Document {
  id: string;
  filename: string;
  title?: string;
  summary: string;
  authors?: string[];
  keywords: string[];
  key_concepts?: string[];
  category: string;
  difficulty: string;
  filepath: string;
  file_size: number;
  upload_date: string;
  content_preview?: string;
  target_audience?: string;
  industry?: string[];
  business_functions?: string[];
  companies?: string[];
  technologies?: string[];
  processes?: string[];
  technical_terms?: string[];
  methodologies?: string[];
  tools_mentioned?: string[];
  prerequisites?: string[];
  learning_objectives?: string[];
  use_cases?: string[];
  benefits_mentioned?: string[];
  challenges_addressed?: string[];
  best_practices?: string[];
  questions_and_answers?: string[];
}

interface PDFModalProps {
  doc: Document;
  isOpen: boolean;
  onClose: () => void;
}

const PDFModal: React.FC<PDFModalProps> = ({ doc, isOpen, onClose }) => {
  const [previewError, setPreviewError] = useState(false);
  const [expandedSummary, setExpandedSummary] = useState(false);
  
  const getPDFPreviewUrl = (doc: Document): string => {
    // Use raw.githubusercontent.com for better CORS compatibility
    const rawGithubUrl = `https://raw.githubusercontent.com/lonardonifabio/tech_documents/main/${doc.filepath}`;
    return `https://mozilla.github.io/pdf.js/web/viewer.html?file=${encodeURIComponent(rawGithubUrl)}`;
  };
  
  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'Escape') {
      onClose();
    }
  };

  const truncateText = (text: string, maxLength: number = 200): string => {
    if (!text || text.length <= maxLength) return text || '';
    return text.substring(0, maxLength) + '...';
  };

  const formatFileSize = (bytes: number): string => {
    const mb = (bytes / (1024 * 1024)).toFixed(1);
    return `${mb} MB`;
  };

  const formatDate = (dateString: string): string => {
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('en-US', { 
        year: 'numeric', 
        month: 'short', 
        day: 'numeric' 
      });
    } catch {
      return 'Unknown date';
    }
  };

  // Enhanced LinkedIn sharing
  const shareOnLinkedIn = async () => {
    if (typeof window === 'undefined') return;
    
    try {
      const title = doc.title || doc.filename;
      const documentUrl = `https://lonardonifabio.github.io/tech_documents/document/${doc.id}`;
      
      let post = `🚀 Sharing an insightful AI/Data Science resource!\n\n`;
      post += `📄 **${title}**\n\n`;
      
      if (doc.key_concepts && doc.key_concepts.length > 0) {
        post += `💡 Key concepts: ${doc.key_concepts.slice(0, 2).join(', ')}\n\n`;
      }
      
      post += `🤖 Explore with AI: ${documentUrl}\n\n`;
      post += `📚 Discover 1100+ AI & Data Science Documents:\n`;
      post += `🌐 https://lonardonifabio.github.io/tech_documents/\n\n`;
      
      const keywords = doc.keywords.slice(0, 5);
      keywords.forEach(keyword => {
        post += `#${keyword.replace(/\s+/g, '')} `;
      });
      post += '#ArtificialIntelligence #DataScience #MachineLearning';
      
      const encodedContent = encodeURIComponent(post);
      const linkedInUrl = `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(documentUrl)}&text=${encodedContent}`;
      
      const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
      
      if (isMobile) {
        window.open(linkedInUrl, '_blank');
      } else {
        window.open(linkedInUrl, '_blank', 'width=600,height=600');
      }
    } catch (error) {
      console.error('LinkedIn sharing failed:', error);
    }
  };

  // Talk with AI function
  const handleTalkWithAI = async () => {
    if (typeof window === 'undefined') return;
    
    const title = doc.title || doc.filename;
    const documentUrl = `https://raw.githubusercontent.com/lonardonifabio/tech_documents/main/${doc.filepath}`;
    const summary = doc.summary || 'No summary available';
    
    const aiText = `I'd like to discuss this document with you:\n\n` +
                  `Title: ${title}\n\n` +
                  `Summary: ${summary}\n\n` +
                  `Document URL: ${documentUrl}\n\n` +
                  `Please help me understand and analyze this document.`;
    
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    
    if (isMobile && navigator.share) {
      try {
        await navigator.share({
          title: `Talk with AI about: ${title}`,
          text: aiText,
          url: documentUrl
        });
      } catch (error) {
        try {
          await navigator.clipboard.writeText(aiText);
          alert('Document information copied to clipboard! You can now paste it into ChatGPT, Gemini, or any AI assistant app.');
        } catch (clipboardError) {
          alert(`Copy this text to share with your AI assistant:\n\n${aiText}`);
        }
      }
    } else {
      try {
        await navigator.clipboard.writeText(aiText);
        alert('Document information copied to clipboard! You can now paste it into ChatGPT, Gemini, or any AI assistant.');
      } catch (error) {
        alert(`Copy this text to share with your AI assistant:\n\n${aiText}`);
      }
    }
  };
  
  useEffect(() => {
    if (isOpen && typeof document !== 'undefined') {
      document.addEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'hidden';
      
      return () => {
        document.removeEventListener('keydown', handleKeyDown);
        document.body.style.overflow = 'unset';
      };
    }
  }, [isOpen]);
  
  if (!isOpen) return null;
  
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-6xl h-full max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b">
          <h2 className="text-xl font-semibold text-gray-800 truncate pr-4">
            {doc.title || doc.filename}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 text-2xl font-bold w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100"
            title="Close preview (ESC)"
          >
            ×
          </button>
        </div>
        
        {/* Main Content */}
        <div className="flex-1 flex overflow-hidden">
          {/* Left Sidebar - Document Information */}
          <div className="w-80 bg-gray-50 border-r flex flex-col">
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {/* Title */}
              <div>
                <h3 className="text-sm font-semibold text-gray-700 mb-2">📄 Title</h3>
                <p className="text-sm text-gray-900 leading-relaxed">
                  {doc.title || doc.filename || 'No title available'}
                </p>
              </div>

              {/* Authors */}
              <div>
                <h3 className="text-sm font-semibold text-gray-700 mb-2">👥 Authors</h3>
                {doc.authors && doc.authors.length > 0 ? (
                  <div className="space-y-1">
                    {doc.authors.map((author, index) => (
                      <p key={index} className="text-sm text-gray-900">
                        {author}
                      </p>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-gray-500 italic">No author information available</p>
                )}
              </div>

              {/* Summary */}
              <div>
                <h3 className="text-sm font-semibold text-gray-700 mb-2">📝 Summary</h3>
                {doc.summary ? (
                  <div>
                    <p className="text-sm text-gray-900 leading-relaxed">
                      {expandedSummary ? doc.summary : truncateText(doc.summary, 200)}
                    </p>
                    {doc.summary.length > 200 && (
                      <button
                        onClick={() => setExpandedSummary(!expandedSummary)}
                        className="text-blue-600 hover:text-blue-800 text-sm mt-2 font-medium"
                      >
                        {expandedSummary ? 'Show less' : 'Read more'}
                      </button>
                    )}
                  </div>
                ) : (
                  <p className="text-sm text-gray-500 italic">No summary available</p>
                )}
              </div>

              {/* Key Concepts */}
              <div>
                <h3 className="text-sm font-semibold text-gray-700 mb-2">💡 Key Concepts</h3>
                {doc.key_concepts && doc.key_concepts.length > 0 ? (
                  <div className="space-y-2">
                    {doc.key_concepts.map((concept, index) => (
                      <div key={index} className="bg-white p-2 rounded border-l-2 border-blue-500">
                        <p className="text-sm text-gray-900 leading-relaxed">
                          {concept}
                        </p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-gray-500 italic">No key concepts available</p>
                )}
              </div>

              {/* Keywords */}
              <div>
                <h3 className="text-sm font-semibold text-gray-700 mb-2">🏷️ Keywords</h3>
                {doc.keywords && doc.keywords.length > 0 ? (
                  <div className="flex flex-wrap gap-1">
                    {doc.keywords.map((keyword, index) => (
                      <span
                        key={index}
                        className="bg-blue-100 text-blue-800 px-2 py-1 rounded-full text-xs font-medium"
                      >
                        {keyword}
                      </span>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-gray-500 italic">No keywords available</p>
                )}
              </div>

              {/* Target Audience */}
              {doc.target_audience && (
                <div>
                  <h3 className="text-sm font-semibold text-gray-700 mb-2">🎯 Target Audience</h3>
                  <p className="text-sm text-gray-900 leading-relaxed">
                    {doc.target_audience}
                  </p>
                </div>
              )}

              {/* Industry */}
              {doc.industry && doc.industry.length > 0 && (
                <div>
                  <h3 className="text-sm font-semibold text-gray-700 mb-2">🏭 Industry</h3>
                  <div className="flex flex-wrap gap-1">
                    {doc.industry.map((item, index) => (
                      <span
                        key={index}
                        className="bg-green-100 text-green-800 px-2 py-1 rounded-full text-xs font-medium"
                      >
                        {item}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Business Functions */}
              {doc.business_functions && doc.business_functions.length > 0 && (
                <div>
                  <h3 className="text-sm font-semibold text-gray-700 mb-2">💼 Business Functions</h3>
                  <div className="space-y-1">
                    {doc.business_functions.map((func, index) => (
                      <div key={index} className="bg-white p-2 rounded border-l-2 border-green-500">
                        <p className="text-sm text-gray-900">
                          {func}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Companies */}
              {doc.companies && doc.companies.length > 0 && (
                <div>
                  <h3 className="text-sm font-semibold text-gray-700 mb-2">🏢 Companies</h3>
                  <div className="flex flex-wrap gap-1">
                    {doc.companies.map((company, index) => (
                      <span
                        key={index}
                        className="bg-purple-100 text-purple-800 px-2 py-1 rounded-full text-xs font-medium"
                      >
                        {company}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Technologies */}
              {doc.technologies && doc.technologies.length > 0 && (
                <div>
                  <h3 className="text-sm font-semibold text-gray-700 mb-2">⚙️ Technologies</h3>
                  <div className="flex flex-wrap gap-1">
                    {doc.technologies.map((tech, index) => (
                      <span
                        key={index}
                        className="bg-indigo-100 text-indigo-800 px-2 py-1 rounded-full text-xs font-medium"
                      >
                        {tech}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Use Cases */}
              {doc.use_cases && doc.use_cases.length > 0 && (
                <div>
                  <h3 className="text-sm font-semibold text-gray-700 mb-2">💼 Use Cases</h3>
                  <div className="space-y-1">
                    {doc.use_cases.map((useCase, index) => (
                      <div key={index} className="bg-white p-2 rounded border-l-2 border-violet-500">
                        <p className="text-sm text-gray-900">
                          {useCase}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Processes */}
              {doc.processes && doc.processes.length > 0 && (
                <div>
                  <h3 className="text-sm font-semibold text-gray-700 mb-2">🔄 Processes</h3>
                  <div className="space-y-1">
                    {doc.processes.map((process, index) => (
                      <div key={index} className="bg-white p-2 rounded border-l-2 border-yellow-500">
                        <p className="text-sm text-gray-900">
                          {process}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Technical Terms */}
              {doc.technical_terms && doc.technical_terms.length > 0 && (
                <div>
                  <h3 className="text-sm font-semibold text-gray-700 mb-2">🔧 Technical Terms</h3>
                  <div className="flex flex-wrap gap-1">
                    {doc.technical_terms.map((term, index) => (
                      <span
                        key={index}
                        className="bg-red-100 text-red-800 px-2 py-1 rounded-full text-xs font-medium"
                      >
                        {term}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Methodologies */}
              {doc.methodologies && doc.methodologies.length > 0 && (
                <div>
                  <h3 className="text-sm font-semibold text-gray-700 mb-2">📋 Methodologies</h3>
                  <div className="space-y-1">
                    {doc.methodologies.map((methodology, index) => (
                      <div key={index} className="bg-white p-2 rounded border-l-2 border-cyan-500">
                        <p className="text-sm text-gray-900">
                          {methodology}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Tools Mentioned */}
              {doc.tools_mentioned && doc.tools_mentioned.length > 0 && (
                <div>
                  <h3 className="text-sm font-semibold text-gray-700 mb-2">🛠️ Tools Mentioned</h3>
                  <div className="flex flex-wrap gap-1">
                    {doc.tools_mentioned.map((tool, index) => (
                      <span
                        key={index}
                        className="bg-orange-100 text-orange-800 px-2 py-1 rounded-full text-xs font-medium"
                      >
                        {tool}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Prerequisites */}
              {doc.prerequisites && doc.prerequisites.length > 0 && (
                <div>
                  <h3 className="text-sm font-semibold text-gray-700 mb-2">📚 Prerequisites</h3>
                  <div className="space-y-1">
                    {doc.prerequisites.map((prerequisite, index) => (
                      <div key={index} className="bg-white p-2 rounded border-l-2 border-pink-500">
                        <p className="text-sm text-gray-900">
                          {prerequisite}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Learning Objectives */}
              {doc.learning_objectives && doc.learning_objectives.length > 0 && (
                <div>
                  <h3 className="text-sm font-semibold text-gray-700 mb-2">🎓 Learning Objectives</h3>
                  <div className="space-y-1">
                    {doc.learning_objectives.map((objective, index) => (
                      <div key={index} className="bg-white p-2 rounded border-l-2 border-emerald-500">
                        <p className="text-sm text-gray-900">
                          {objective}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Benefits Mentioned */}
              {doc.benefits_mentioned && doc.benefits_mentioned.length > 0 && (
                <div>
                  <h3 className="text-sm font-semibold text-gray-700 mb-2">✅ Benefits</h3>
                  <div className="space-y-1">
                    {doc.benefits_mentioned.map((benefit, index) => (
                      <div key={index} className="bg-white p-2 rounded border-l-2 border-green-500">
                        <p className="text-sm text-gray-900">
                          {benefit}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Challenges Addressed */}
              {doc.challenges_addressed && doc.challenges_addressed.length > 0 && (
                <div>
                  <h3 className="text-sm font-semibold text-gray-700 mb-2">⚠️ Challenges Addressed</h3>
                  <div className="space-y-1">
                    {doc.challenges_addressed.map((challenge, index) => (
                      <div key={index} className="bg-white p-2 rounded border-l-2 border-red-500">
                        <p className="text-sm text-gray-900">
                          {challenge}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Best Practices */}
              {doc.best_practices && doc.best_practices.length > 0 && (
                <div>
                  <h3 className="text-sm font-semibold text-gray-700 mb-2">⭐ Best Practices</h3>
                  <div className="space-y-1">
                    {doc.best_practices.map((practice, index) => (
                      <div key={index} className="bg-white p-2 rounded border-l-2 border-amber-500">
                        <p className="text-sm text-gray-900">
                          {practice}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Questions and Answers */}
              {doc.questions_and_answers && doc.questions_and_answers.length > 0 && (
                <div>
                  <h3 className="text-sm font-semibold text-gray-700 mb-2">❓ Questions & Answers</h3>
                  <div className="space-y-2">
                    {doc.questions_and_answers.map((qa, index) => (
                      <div key={index} className="bg-white p-3 rounded border border-gray-200">
                        <p className="text-sm text-gray-900 leading-relaxed">
                          {qa}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Document Metadata */}
              <div className="pt-4 border-t">
                <h3 className="text-sm font-semibold text-gray-700 mb-2">📊 Document Info</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Category:</span>
                    <span className="bg-green-100 text-green-800 px-2 py-1 rounded text-xs">
                      {doc.category || 'Unknown'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Difficulty:</span>
                    <span className="bg-orange-100 text-orange-800 px-2 py-1 rounded text-xs">
                      {doc.difficulty || 'Unknown'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">File Size:</span>
                    <span className="text-gray-900">{formatFileSize(doc.file_size)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Upload Date:</span>
                    <span className="text-gray-900">{formatDate(doc.upload_date)}</span>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="pt-4 border-t space-y-3">
                <button
                  onClick={handleTalkWithAI}
                  className="w-full bg-gradient-to-r from-purple-500 to-pink-600 hover:from-purple-600 hover:to-pink-700 text-white px-4 py-2 rounded-lg transition-all duration-200 text-center text-sm font-medium flex items-center justify-center gap-2 md:hidden shadow-lg"
                  title="Talk with your AI"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                  </svg>
                  🤖 Talk with your AI
                </button>
                
                <button
                  onClick={shareOnLinkedIn}
                  className="w-full bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors duration-200 text-center text-sm font-medium flex items-center justify-center gap-2"
                  title="Share on LinkedIn"
                >
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
                  </svg>
                  📤 Share on LinkedIn
                </button>
                
                <a
                  href={`https://raw.githubusercontent.com/lonardonifabio/tech_documents/main/${doc.filepath}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors duration-200 text-center block text-sm font-medium"
                >
                  📥 Download PDF
                </a>
              </div>
            </div>
          </div>

          {/* Center - PDF Preview */}
          <div className="flex-1 bg-white">
            {previewError ? (
              <div className="flex items-center justify-center h-full bg-gray-50">
                <div className="text-center">
                  <div className="text-6xl mb-4">⚠️</div>
                  <h3 className="text-xl font-semibold text-gray-700 mb-2">
                    Unable to load PDF
                  </h3>
                  <p className="text-gray-500 mb-4">
                    The PDF could not be displayed in the viewer.
                  </p>
                  <a
                    href={`https://raw.githubusercontent.com/lonardonifabio/tech_documents/main/${doc.filepath}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors duration-200"
                  >
                    Download PDF
                  </a>
                </div>
              </div>
            ) : (
              <iframe
                src={getPDFPreviewUrl(doc)}
                className="w-full h-full border-0"
                onError={() => setPreviewError(true)}
                title={`Preview of ${doc.title || doc.filename}`}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default PDFModal;
