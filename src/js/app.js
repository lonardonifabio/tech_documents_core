const { useState, useEffect } = React;

// Single document component
const DocumentCard = ({ doc }) => (
    <div className="border rounded-lg p-4 hover:shadow-lg transition-shadow bg-white">
        <h3 className="font-semibold text-lg mb-2 text-gray-800">{doc.filename}</h3>
        <p className="text-gray-600 text-sm mb-3 line-clamp-3">{doc.summary}</p>

        <div className="flex flex-wrap gap-1 mb-3">
            {doc.keywords.slice(0, 3).map(keyword => (
                <span key={keyword} className="bg-blue-100 text-blue-800 px-2 py-1 rounded text-xs">
                    {keyword}
                </span>
            ))}
            {doc.keywords.length > 3 && (
                <span className="text-gray-500 text-xs">+{doc.keywords.length - 3}</span>
            )}
        </div>

        <div className="flex justify-between items-center text-sm mb-3">
            <span className="bg-green-100 text-green-800 px-2 py-1 rounded text-xs">
                {doc.category}
            </span>
            <span className="bg-orange-100 text-orange-800 px-2 py-1 rounded text-xs">
                {doc.difficulty}
            </span>
        </div>

        <div className="flex justify-between items-center">
            <span className="text-xs text-gray-500">
                {new Date(doc.upload_date).toLocaleDateString('en-US')}
            </span>
            <a
                href={`https://github.com/lonardonifabio/tech_documents/blob/main/${doc.filepath}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 hover:underline text-sm font-medium"
            >
                View →
            </a>
        </div>
    </div>
);

// Search filters component
const SearchFilters = ({
    searchTerm, setSearchTerm,
    selectedCategory, setSelectedCategory,
    selectedDifficulty, setSelectedDifficulty,
    categories, difficulties
}) => (
    <div className="mb-8 space-y-4 bg-gray-50 p-6 rounded-lg">
        <input
            type="text"
            placeholder="🔍 Search documents, keywords, topics..."
            className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
        />

        <div className="flex flex-wrap gap-4">
            <select
                className="p-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
            >
                <option value="">📂 All categories</option>
                {categories.map(cat => (
                    <option key={cat} value={cat}>{cat}</option>
                ))}
            </select>

            <select
                className="p-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                value={selectedDifficulty}
                onChange={(e) => setSelectedDifficulty(e.target.value)}
            >
                <option value="">🎯 All levels</option>
                {difficulties.map(diff => (
                    <option key={diff} value={diff}>{diff}</option>
                ))}
            </select>
        </div>
    </div>
);

// Main component
const DocumentLibrary = () => {
    const [documents, setDocuments] = useState([]);
    const [filteredDocs, setFilteredDocs] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedCategory, setSelectedCategory] = useState('');
    const [selectedDifficulty, setSelectedDifficulty] = useState('');
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetch('./data/documents.json')
            .then(response => response.json())
            .then(data => {
                setDocuments(data);
                setFilteredDocs(data);
                setLoading(false);
            })
            .catch(error => {
                console.error('Error loading documents:', error);
                setLoading(false);
            });
    }, []);

    useEffect(() => {
        let filtered = documents;

        if (searchTerm) {
            const term = searchTerm.toLowerCase();
            filtered = filtered.filter(doc =>
                doc.filename.toLowerCase().includes(term) ||
                doc.summary.toLowerCase().includes(term) ||
                doc.keywords.some(keyword =>
                    keyword.toLowerCase().includes(term)
                )
            );
        }

        if (selectedCategory) {
            filtered = filtered.filter(doc => doc.category === selectedCategory);
        }

        if (selectedDifficulty) {
            filtered = filtered.filter(doc => doc.difficulty === selectedDifficulty);
        }

        setFilteredDocs(filtered);
    }, [searchTerm, selectedCategory, selectedDifficulty, documents]);

    const categories = [...new Set(documents.map(doc => doc.category))];
    const difficulties = [...new Set(documents.map(doc => doc.difficulty))];

    if (loading) {
        return (
            <div className="min-h-screen bg-gray-100 flex items-center justify-center">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
                    <p className="text-gray-600">Loading documents...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-100">
            <div className="max-w-7xl mx-auto px-4 py-8">
                <header className="text-center mb-12">
                    <h1 className="text-4xl font-bold text-gray-800 mb-4">
                        🤖 AI & Data Science Library
                    </h1>
                    <p className="text-xl text-gray-600 mb-2">
                        Automated collection of Artificial Intelligence and Data Science documents
                    </p>
                    <p className="text-sm text-gray-500">
                        {documents.length} documents • Automatically updated
                    </p>
                </header>

                <SearchFilters
                    searchTerm={searchTerm}
                    setSearchTerm={setSearchTerm}
                    selectedCategory={selectedCategory}
                    setSelectedCategory={setSelectedCategory}
                    selectedDifficulty={selectedDifficulty}
                    setSelectedDifficulty={setSelectedDifficulty}
                    categories={categories}
                    difficulties={difficulties}
                />

                {filteredDocs.length > 0 ? (
                    <>
                        <div className="mb-4 text-sm text-gray-600">
                            Showing {filteredDocs.length} of {documents.length} documents
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                            {filteredDocs.map(doc => (
                                <DocumentCard key={doc.id} doc={doc} />
                            ))}
                        </div>
                    </>
                ) : (
                    <div className="text-center py-16">
                        <div className="text-6xl mb-4">📭</div>
                        <h3 className="text-xl font-semibold text-gray-700 mb-2">
                            No documents found
                        </h3>
                        <p className="text-gray-500">
                            Try modifying your search criteria
                        </p>
                    </div>
                )}
            </div>
        </div>
    );
};

// Render the app
ReactDOM.render(<DocumentLibrary />, document.getElementById('root'));
