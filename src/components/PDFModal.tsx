import React from 'react';

interface Document {
  id: string;
  filename: string;
  title?: string;
  summary: string;
  filepath: string;
}

interface PDFModalProps {
  doc: Document;
  isOpen: boolean;
  onClose: () => void;
}

const PDFModal: React.FC<PDFModalProps> = ({ doc, isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3 className="text-lg font-semibold">{doc.title || doc.filename}</h3>
          <button onClick={onClose} className="close-button">
            ×
          </button>
        </div>
        <div className="modal-body">
          <p className="p-6 text-gray-600">PDF modal component will be implemented here.</p>
          <p className="px-6 text-sm text-gray-500">Document: {doc.filename}</p>
        </div>
      </div>
    </div>
  );
};

export default PDFModal;
