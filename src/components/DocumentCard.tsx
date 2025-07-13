import React, { useState } from 'react';
import PDFModal from './PDFModal';

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

interface DocumentCardProps {
  doc: Document;
  autoOpen?: boolean;
}

const DocumentCard: React.FC<DocumentCardProps> = ({ doc, autoOpen = false }) => {
  const [showFullSummary, setShowFullSummary] = useState(false);
  const [showPDFModal, setShowPDFModal] = useState(autoOpen);

  // Get document preview URL with fallback
  const getDocumentPreviewUrl = (doc: Document) => {
    const baseUrl = import.meta.env.DEV ? '' : '/tech_documents';
    return `${baseUrl}/preview/${doc.id}.jpg`;
  };

  // Generate fallback preview styling for error cases
  const getFallbackPreview = (doc: Document) => {
    const categoryStyles = {
      'AI': {
        gradient: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        icon: '🤖'
      },
      'Machine Learning': {
        gradient: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
        icon: '🧠'
      },
      'Data Science': {
        gradient: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
        icon: '📊'
      },
      'Business': {
        gradient: 'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)',
        icon: '💼'
      },
      'Technology': {
        gradient: 'linear-gradient(135deg, #fa709a 0%, #fee140 100%)',
        icon: '⚙️'
      },
      'Research': {
        gradient: 'linear-gradient(135deg, #a8edea 0%, #fed6e3 100%)',
        icon: '🔬'
      }
    };

    const style = categoryStyles[doc.category as keyof typeof categoryStyles] || categoryStyles['Technology'];
    return {
      background: style.gradient,
      icon: style.icon
    };
  };

  // Truncate text if too long
  const truncateText = (text: string, maxLength = 40): string => {
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength - 3) + '...';
  };

  // Truncate summary if too long
  const truncateSummary = (text: string, maxLength = 150): string => {
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + '...';
  };

  // Format date
  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US');
  };

  // Format file size
  const formatFileSize = (bytes: number): string => {
    const mb = (bytes / (1024 * 1024)).toFixed(1);
    return `${mb} MB`;
  };

  // Share document on LinkedIn
  const shareOnLinkedIn = (doc: Document) => {
    const baseUrl = 'https://lonardonifabio.github.io/tech_documents';
    const documentUrl = `${baseUrl}/document/${doc.id}`;
    const title = doc.title || doc.filename;
    
    // Extract first sentence from summary
    const getFirstSentence = (text: string): string => {
      if (!text) return '';
      // Find first sentence ending with period, exclamation, or question mark
      const match = text.match(/^[^.!?]*[.!?]/);
      if (match) {
        return match[0].trim();
      }
      // If no sentence ending found, take first 100 characters
      return text.length > 100 ? text.substring(0, 97) + '...' : text;
    };
    
    const firstSentence = getFirstSentence(doc.summary);
    
    // Create LinkedIn post content
    let post = `🚀 Sharing an insightful AI/Data Science resource!\n\n`;
    post += `**${title}**\n`;
    if (firstSentence) {
      post += `${firstSentence}\n\n`;
    }
    
    // Add key concepts if available
    if (doc.key_concepts && doc.key_concepts.length > 0) {
      post += `💡 Key concepts: ${doc.key_concepts.slice(0, 2).join(', ')}\n\n`;
    }
    
    post += `🤖 Explore with AI: ${documentUrl}\n\n`;
    post += `📚 Discover 1100+ AI & Data Science Documents:\n`;
    post += `🌐 https://lonardonifabio.github.io/tech_documents/\n\n`;
    
    // Add hashtags
    const keywords = doc.keywords.slice(0, 5);
    keywords.forEach(keyword => {
      post += `#${keyword.replace(/\s+/g, '')} `;
    });
    post += '#ArtificialIntelligence #DataScience #MachineLearning';
    
    const encodedContent = encodeURIComponent(post);
    const encodedUrl = encodeURIComponent(documentUrl);
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    
    if (isMobile) {
      // For mobile, use both url and text parameters for better compatibility
      const linkedInUrl = `https://www.linkedin.com/sharing/share-offsite/?url=${encodedUrl}&text=${encodedContent}`;
      window.open(linkedInUrl, '_blank');
    } else {
      // For desktop, use the traditional approach with both parameters
      const linkedInUrl = `https://www.linkedin.com/sharing/share-offsite/?url=${encodedUrl}&text=${encodedContent}`;
      window.open(linkedInUrl, 'linkedin-share', 'width=600,height=600,scrollbars=yes,resizable=yes');
    }
  };

  const displaySummary = showFullSummary ? doc.summary : truncateSummary(doc.summary);
  const displayTitle = doc.title || doc.filename;
  const previewUrl = getDocumentPreviewUrl(doc);
  const fallbackStyle = getFallbackPreview(doc);

  return (
    <>
      <div className="border rounded-lg hover:shadow-xl transition-all duration-300 bg-white document-card overflow-hidden h-full flex flex-col">
        {/* Document preview */}
        <div className="h-32 w-full relative overflow-hidden">
          <div 
            className="cursor-pointer h-full relative"
            onClick={() => setShowPDFModal(true)}
            title="Click to preview PDF"
          >
            {/* Generated preview image - handles both JPG and SVG */}
            <img
              src={previewUrl}
              alt={`Preview of ${displayTitle}`}
              className="w-full h-full object-cover"
              style={{ backgroundColor: '#f9fafb' }}
            />
          </div>
          
          {/* Category badge overlay */}
          <div className="absolute top-2 right-2 z-20">
            <span className="bg-white bg-opacity-90 text-gray-800 px-2 py-1 rounded text-xs font-medium">
              {doc.category}
            </span>
          </div>
        </div>

        {/* Document content */}
        <div className="p-4 flex-1 flex flex-col">
          {/* Title with overflow handling */}
          <h3 className="font-semibold text-base mb-2 text-gray-800 line-clamp-2 leading-tight" title={displayTitle}>
            {truncateText(displayTitle, 60)}
          </h3>

          {/* Authors */}
          {doc.authors && doc.authors.length > 0 && (
            <div className="mb-2">
              <p className="text-sm text-gray-500">
                <span className="font-medium">Authors:</span> {doc.authors.join(', ')}
              </p>
            </div>
          )}

          {/* Summary with expand/collapse option */}
          <div className="mb-4 flex-1">
            <p className="text-gray-600 text-sm leading-relaxed">
              {displaySummary}
            </p>
            {doc.summary.length > 150 && (
              <button 
                onClick={() => setShowFullSummary(!showFullSummary)}
                className="text-blue-600 text-xs mt-1 hover:underline focus:outline-none font-medium"
              >
                {showFullSummary ? 'Show less' : 'Read more'}
              </button>
            )}
          </div>

          {/* Keywords - Show ALL keywords */}
          <div className="flex flex-wrap gap-1 mb-4">
            {doc.keywords.map(keyword => (
              <span key={keyword} className="bg-blue-100 text-blue-800 px-2 py-1 rounded-full text-xs font-medium">
                {keyword}
              </span>
            ))}
          </div>

          {/* Footer with info and actions */}
          <div className="mt-auto space-y-3">
            {/* Difficulty and date */}
            <div className="flex justify-between items-center text-sm">
              <span className="bg-orange-100 text-orange-800 px-2 py-1 rounded-full text-xs font-medium">
                {doc.difficulty}
              </span>
              <span className="text-xs text-gray-500">
                {formatDate(doc.upload_date)}
              </span>
            </div>

            {/* File size and actions */}
            <div className="flex justify-between items-center">
              <span className="text-xs text-gray-500">
                {formatFileSize(doc.file_size)}
              </span>
              <div className="flex gap-1">
                <button
                  onClick={() => setShowPDFModal(true)}
                  className="bg-green-600 text-white px-2 py-1 rounded-full text-xs font-medium hover:bg-green-700 transition-colors duration-200"
                >
                  Preview
                </button>
                <button
                  onClick={() => shareOnLinkedIn(doc)}
                  className="bg-blue-600 text-white px-2 py-1 rounded-full text-xs font-medium hover:bg-blue-700 transition-colors duration-200"
                  title="Share on LinkedIn"
                >
                  Share
                </button>
                <a
                  href={`https://raw.githubusercontent.com/lonardonifabio/tech_documents/main/${doc.filepath}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="bg-gray-600 text-white px-2 py-1 rounded-full text-xs font-medium hover:bg-gray-700 transition-colors duration-200"
                >
                  Download
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      {/* PDF Modal */}
      <PDFModal 
        doc={doc} 
        isOpen={showPDFModal} 
        onClose={() => setShowPDFModal(false)} 
      />
    </>
  );
};

export default DocumentCard;
