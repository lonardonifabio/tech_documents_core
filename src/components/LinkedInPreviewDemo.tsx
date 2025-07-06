import React, { useState } from 'react';
import { PreviewGenerator } from '../services/preview-generator';
import { LinkedInSharingService } from '../services/linkedin-sharing-service';

interface LinkedInPreviewDemoProps {
  doc: any;
}

const LinkedInPreviewDemo: React.FC<LinkedInPreviewDemoProps> = ({ doc }) => {
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);

  const generatePreview = async () => {
    setIsGenerating(true);
    try {
      const previewGenerator = PreviewGenerator.getInstance();
      const url = await previewGenerator.generateDocumentPreview(doc);
      setPreviewUrl(url);
    } catch (error) {
      console.error('Error generating preview:', error);
      alert('Failed to generate preview. Please try again.');
    } finally {
      setIsGenerating(false);
    }
  };

  const shareWithPreview = async () => {
    try {
      const linkedInService = LinkedInSharingService.getInstance();
      await linkedInService.shareOnLinkedIn(doc, {
        useCustomPreview: true,
        downloadDocument: false,
        shareAsAttachment: false
      });
    } catch (error) {
      console.error('Error sharing:', error);
      alert('Failed to share. Please try again.');
    }
  };

  const downloadPreview = () => {
    if (previewUrl) {
      const link = document.createElement('a');
      link.href = previewUrl;
      link.download = `${doc.id}_preview.jpg`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-lg p-6 max-w-2xl mx-auto">
      <h3 className="text-xl font-bold text-gray-800 mb-4">
        🚀 Enhanced LinkedIn Sharing Preview
      </h3>
      
      <div className="space-y-4">
        <div className="bg-gray-50 p-4 rounded-lg">
          <h4 className="font-semibold text-gray-700 mb-2">Document:</h4>
          <p className="text-sm text-gray-600">{doc.title || doc.filename}</p>
          <p className="text-xs text-gray-500 mt-1">
            Category: {doc.category} | Difficulty: {doc.difficulty}
          </p>
        </div>

        <div className="flex gap-3">
          <button
            onClick={generatePreview}
            disabled={isGenerating}
            className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isGenerating ? '🔄 Generating...' : '🎨 Generate Custom Preview'}
          </button>
          
          <button
            onClick={shareWithPreview}
            className="flex-1 bg-linkedin text-white px-4 py-2 rounded-lg hover:bg-linkedin-dark transition-colors duration-200"
          >
            📤 Share on LinkedIn
          </button>
        </div>

        {previewUrl && (
          <div className="space-y-3">
            <div className="border rounded-lg overflow-hidden">
              <img 
                src={previewUrl} 
                alt="Generated preview" 
                className="w-full h-auto"
                style={{ maxHeight: '315px', objectFit: 'contain' }}
              />
            </div>
            
            <div className="flex gap-2">
              <button
                onClick={downloadPreview}
                className="flex-1 bg-green-600 text-white px-3 py-2 rounded text-sm hover:bg-green-700 transition-colors duration-200"
              >
                📥 Download Preview
              </button>
              
              <button
                onClick={() => setPreviewUrl(null)}
                className="flex-1 bg-gray-500 text-white px-3 py-2 rounded text-sm hover:bg-gray-600 transition-colors duration-200"
              >
                🗑️ Clear Preview
              </button>
            </div>
          </div>
        )}

        <div className="bg-blue-50 p-4 rounded-lg">
          <h4 className="font-semibold text-blue-800 mb-2">✨ Enhanced Features:</h4>
          <ul className="text-sm text-blue-700 space-y-1">
            <li>• Custom preview images with document metadata</li>
            <li>• Category-based color schemes and icons</li>
            <li>• Enhanced LinkedIn post content with key concepts</li>
            <li>• Mobile-optimized sharing with native APIs</li>
            <li>• Document attachment sharing (when supported)</li>
            <li>• Fallback to standard sharing if needed</li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default LinkedInPreviewDemo;
