// Translations for multilingual interface
const translations = {
    en: {
        // Header
        title: "🤖 AI & Data Science Library",
        subtitle: "Automated collection of Artificial Intelligence and Data Science documents",
        documentsCount: "documents • Automatically updated",
        
        // Search and filters
        searchPlaceholder: "🔍 Search documents, keywords, topics...",
        allCategories: "📂 All categories",
        allLevels: "🎯 All levels",
        
        // Document card
        showMore: "Show more",
        showLess: "Show less",
        moreKeywords: "more",
        viewDocument: "View →",
        
        // Results
        showing: "📊 Showing",
        of: "of",
        documents: "documents",
        noDocuments: "No documents found",
        noDocumentsDesc: "Try modifying your search criteria",
        
        // Loading and errors
        loading: "Loading documents...",
        errorLoading: "Loading error",
        retry: "Retry",
        
        // Language selector
        language: "Language",
        
        // Document info
        uploadDate: "Upload date",
        fileSize: "File size",
        category: "Category",
        difficulty: "Difficulty",
        authors: "Authors",
        noAuthors: "Authors not specified"
    },
    it: {
        // Header
        title: "🤖 AI & Data Science Library",
        subtitle: "Raccolta automatizzata di documenti su Intelligenza Artificiale e Data Science",
        documentsCount: "documenti • Aggiornato automaticamente",
        
        // Search and filters
        searchPlaceholder: "🔍 Cerca documenti, keywords, argomenti...",
        allCategories: "📂 Tutte le categorie",
        allLevels: "🎯 Tutti i livelli",
        
        // Document card
        showMore: "Mostra tutto",
        showLess: "Mostra meno",
        moreKeywords: "altri",
        viewDocument: "Visualizza →",
        
        // Results
        showing: "📊 Mostrando",
        of: "di",
        documents: "documenti",
        noDocuments: "Nessun documento trovato",
        noDocumentsDesc: "Prova a modificare i criteri di ricerca",
        
        // Loading and errors
        loading: "Caricamento documenti...",
        errorLoading: "Errore nel caricamento",
        retry: "Riprova",
        
        // Language selector
        language: "Lingua",
        
        // Document info
        uploadDate: "Data caricamento",
        fileSize: "Dimensione",
        category: "Categoria",
        difficulty: "Difficoltà",
        authors: "Autori",
        noAuthors: "Autori non specificati"
    }
};

// Function to get translation
function t(key, lang = 'en') {
    return translations[lang]?.[key] || translations['en'][key] || key;
}

// Function to format date based on language
function formatDate(dateString, lang = 'en') {
    const date = new Date(dateString);
    const locale = lang === 'it' ? 'it-IT' : 'en-US';
    return date.toLocaleDateString(locale);
}

// Function to format file size
function formatFileSize(bytes, lang = 'en') {
    const mb = (bytes / (1024 * 1024)).toFixed(1);
    return `${mb} MB`;
}

// Export for global use
window.translations = translations;
window.t = t;
window.formatDate = formatDate;
window.formatFileSize = formatFileSize;
