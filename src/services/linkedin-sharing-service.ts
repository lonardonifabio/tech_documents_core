import { PreviewGenerator } from './preview-generator';

export interface LinkedInShareOptions {
  useCustomPreview?: boolean;
  downloadDocument?: boolean;
  shareAsAttachment?: boolean;
}

export class LinkedInSharingService {
  private static instance: LinkedInSharingService;
  private previewGenerator: PreviewGenerator;

  constructor() {
    this.previewGenerator = PreviewGenerator.getInstance();
  }

  static getInstance(): LinkedInSharingService {
    if (!LinkedInSharingService.instance) {
      LinkedInSharingService.instance = new LinkedInSharingService();
    }
    return LinkedInSharingService.instance;
  }

  /**
   * Enhanced LinkedIn sharing with custom preview generation
   */
  async shareOnLinkedIn(
    doc: any,
    options: LinkedInShareOptions = {}
  ): Promise<void> {
    const {
      useCustomPreview = true,
      downloadDocument = false,
      shareAsAttachment = false
    } = options;

    try {
      // Generate custom preview if requested
      let customPreviewUrl: string | null = null;
      if (useCustomPreview) {
        customPreviewUrl = await this.previewGenerator.generateDocumentPreview(doc);
      }

      // Prepare sharing content
      const shareContent = await this.prepareShareContent(doc, customPreviewUrl, downloadDocument);

      // Handle different sharing approaches
      if (shareAsAttachment && downloadDocument) {
        await this.shareWithDocumentAttachment(doc, shareContent);
      } else {
        await this.shareWithPreview(doc, shareContent, customPreviewUrl);
      }
    } catch (error) {
      console.error('Error sharing on LinkedIn:', error);
      // Fallback to basic sharing
      await this.fallbackShare(doc);
    }
  }

  /**
   * Prepare the content for LinkedIn sharing
   */
  private async prepareShareContent(
    doc: any,
    customPreviewUrl: string | null,
    includeDocument: boolean
  ): Promise<string> {
    const title = doc.title || doc.filename;
    const documentUrl = `https://lonardonifabio.github.io/tech_documents/document/${doc.id}`;
    
    let post = `🚀 Sharing an insightful AI/Data Science resource!\n\n`;
    post += `📄 **${title}**\n\n`;
    
    // Add enhanced summary with key insights
    //if (doc.summary) {
    //  const summary = doc.summary.length > 200 ? 
    //    doc.summary.substring(0, 197) + '...' : doc.summary;
    //  post += `📝 **Summary:**\n${summary}\n\n`;
    //}

    // Add key concepts if available
    if (doc.key_concepts && doc.key_concepts.length > 0) {
      post += `💡 **Key Concepts:**\n`;
      doc.key_concepts.slice(0, 3).forEach((concept: string) => {
        post += `• ${concept}\n`;
      });
      post += `\n`;
    }

    // Add target audience if available
    //if (doc.target_audience) {
    //  post += `🎯 **Target Audience:** ${doc.target_audience}\n\n`;
    //}

    // Add use cases if available
    //if (doc.use_cases && doc.use_cases.length > 0) {
    //  post += `💼 **Use Cases:**\n`;
    //  doc.use_cases.slice(0, 2).forEach((useCase: string) => {
    //    post += `• ${useCase}\n`;
    //  });
    //  post += `\n`;
    //}

    // Add category and difficulty
    //post += `📊 **Category:** ${doc.category} | **Level:** ${doc.difficulty}\n\n`;

    // Add call to action
    post += `🤖 Explore with AI assistance: ${documentUrl}\n\n`;
    post += `📚 **Discover 1100+ AI & Data Science Documents:**\n`;
    post += `🌐 https://lonardonifabio.github.io/tech_documents/\n\n`;

    // Add relevant hashtags
    const hashtags = this.generateHashtags(doc);
    post += hashtags;

    return post;
  }

  /**
   * Share with custom preview image
   */
  private async shareWithPreview(
    doc: any,
    content: string,
    customPreviewUrl: string | null
  ): Promise<void> {
    const documentUrl = `https://lonardonifabio.github.io/tech_documents/document/${doc.id}`;
    const isMobile = this.isMobileDevice();

    if (isMobile && navigator.share) {
      // Use native mobile sharing
      try {
        const shareData: ShareData = {
          title: doc.title || doc.filename,
          text: content,
          url: documentUrl
        };

        // Add custom preview as file if supported
        if (customPreviewUrl && this.supportsFileSharing()) {
          const blob = await this.dataUrlToBlob(customPreviewUrl);
          const file = new File([blob], `${doc.id}_preview.jpg`, { type: 'image/jpeg' });
          shareData.files = [file];
        }

        await navigator.share(shareData);
      } catch (error) {
        console.log('Native sharing failed, falling back to LinkedIn URL');
        this.openLinkedInShare(documentUrl, content);
      }
    } else {
      // Desktop: use LinkedIn direct sharing
      this.openLinkedInShare(documentUrl, content);
    }
  }

  /**
   * Share with document as attachment
   */
  private async shareWithDocumentAttachment(
    doc: any,
    content: string
  ): Promise<void> {
    try {
      // Download the document first
      const documentBlob = await this.downloadDocument(doc);
      const documentFile = new File([documentBlob], `${doc.filename}`, { type: 'application/pdf' });

      // Generate custom preview
      const customPreviewUrl = await this.previewGenerator.generateDocumentPreview(doc);
      const previewBlob = await this.dataUrlToBlob(customPreviewUrl);
      const previewFile = new File([previewBlob], `${doc.id}_preview.jpg`, { type: 'image/jpeg' });

      if (navigator.share && this.supportsFileSharing()) {
        await navigator.share({
          title: doc.title || doc.filename,
          text: content,
          files: [documentFile, previewFile]
        });
      } else {
        // Fallback: download files and show instructions
        this.downloadFile(documentFile);
        this.downloadFile(previewFile);
        
        const instructions = `Files downloaded! To share on LinkedIn:\n\n` +
          `1. Create a new LinkedIn post\n` +
          `2. Attach the downloaded PDF: ${doc.filename}\n` +
          `3. Add the preview image: ${doc.id}_preview.jpg\n` +
          `4. Copy and paste this text:\n\n${content}`;
        
        alert(instructions);
      }
    } catch (error) {
      console.error('Error sharing with attachment:', error);
      await this.shareWithPreview(doc, content, null);
    }
  }

  /**
   * Download document from GitHub
   */
  private async downloadDocument(doc: any): Promise<Blob> {
    const documentUrl = `https://raw.githubusercontent.com/lonardonifabio/tech_documents/main/${doc.filepath}`;
    const response = await fetch(documentUrl);
    
    if (!response.ok) {
      throw new Error(`Failed to download document: ${response.statusText}`);
    }
    
    return await response.blob();
  }

  /**
   * Convert data URL to Blob
   */
  private async dataUrlToBlob(dataUrl: string): Promise<Blob> {
    const response = await fetch(dataUrl);
    return await response.blob();
  }

  /**
   * Download file to user's device
   */
  private downloadFile(file: File): void {
    const url = URL.createObjectURL(file);
    const a = document.createElement('a');
    a.href = url;
    a.download = file.name;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  /**
   * Generate relevant hashtags for the document
   */
  private generateHashtags(doc: any): string {
    const baseHashtags = ['#ArtificialIntelligence', '#DataScience', '#MachineLearning', '#AI', '#TechResources'];
    
    // Add category-specific hashtags
    const categoryHashtags: { [key: string]: string[] } = {
      'AI': ['#ArtificialIntelligence', '#AIResearch', '#AITechnology'],
      'Machine Learning': ['#MachineLearning', '#MLAlgorithms', '#DeepLearning'],
      'Data Science': ['#DataScience', '#DataAnalytics', '#BigData'],
      'Business': ['#BusinessIntelligence', '#DigitalTransformation', '#Innovation'],
      'Technology': ['#Technology', '#TechTrends', '#DigitalInnovation'],
      'Research': ['#Research', '#AcademicResearch', '#TechResearch']
    };

    let hashtags = [...baseHashtags];
    
    if (categoryHashtags[doc.category]) {
      hashtags = [...hashtags, ...categoryHashtags[doc.category]];
    }

    // Add keyword-based hashtags (first 3 keywords)
    if (doc.keywords && doc.keywords.length > 0) {
      doc.keywords.slice(0, 3).forEach((keyword: string) => {
        const cleanKeyword = keyword.replace(/[^a-zA-Z0-9]/g, '');
        if (cleanKeyword.length > 2) {
          hashtags.push(`#${cleanKeyword}`);
        }
      });
    }

    // Remove duplicates and limit to 10 hashtags
    const uniqueHashtags = [...new Set(hashtags)].slice(0, 10);
    
    return uniqueHashtags.join(' ');
  }

  /**
   * Open LinkedIn sharing URL
   */
  private openLinkedInShare(url: string, text: string): void {
    const encodedText = encodeURIComponent(text);
    const encodedUrl = encodeURIComponent(url);
    const linkedInUrl = `https://www.linkedin.com/sharing/share-offsite/?url=${encodedUrl}&text=${encodedText}`;
    
    if (this.isMobileDevice()) {
      window.open(linkedInUrl, '_blank');
    } else {
      window.open(linkedInUrl, '_blank', 'width=600,height=600');
    }
  }

  /**
   * Fallback sharing method
   */
  private async fallbackShare(doc: any): Promise<void> {
    const documentUrl = `https://lonardonifabio.github.io/tech_documents/document/${doc.id}`;
    const basicContent = `Check out this AI/Data Science resource: ${doc.title || doc.filename}\n\n${documentUrl}`;
    
    this.openLinkedInShare(documentUrl, basicContent);
  }

  /**
   * Check if device is mobile
   */
  private isMobileDevice(): boolean {
    return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
  }

  /**
   * Check if browser supports file sharing
   */
  private supportsFileSharing(): boolean {
    return 'canShare' in navigator && navigator.canShare({ files: [new File([], 'test')] });
  }
}
