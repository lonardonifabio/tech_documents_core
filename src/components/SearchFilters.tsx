import React, { useState } from 'react';

interface SearchFiltersProps {
  searchTerm: string;
  setSearchTerm: (term: string) => void;
  selectedCategory: string;
  setSelectedCategory: (category: string) => void;
  selectedDifficulty: string;
  setSelectedDifficulty: (difficulty: string) => void;
  categories: string[];
  difficulties: string[];
}

const SearchFilters: React.FC<SearchFiltersProps> = ({
  searchTerm,
  setSearchTerm,
  selectedCategory,
  setSelectedCategory,
  selectedDifficulty,
  setSelectedDifficulty,
  categories,
  difficulties
}) => {
  const [showSearchHelp, setShowSearchHelp] = useState(false);

  return (
    <div className="mb-8 space-y-4 bg-white p-6 rounded-lg shadow-sm border">
      <div className="relative">
        <input
          type="text"
          placeholder="🔍 Search with boolean operators: machine learning AND python OR 'data science' NOT statistics"
          className="w-full p-3 pr-12 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
        <button
          onClick={() => setShowSearchHelp(!showSearchHelp)}
          className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-blue-500 transition-colors"
          title="Search help"
        >
          ❓
        </button>
      </div>

      {showSearchHelp && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-sm">
          <h4 className="font-semibold text-blue-800 mb-2">🔍 Advanced Search Guide</h4>
          <div className="space-y-2 text-blue-700">
            <div><strong>AND:</strong> <span className="bg-gray-200 px-1 rounded">machine learning AND python</span> - Both terms must be present</div>
            <div><strong>OR:</strong> <span className="bg-gray-200 px-1 rounded">python OR javascript</span> - Either term can be present</div>
            <div><strong>NOT:</strong> <span className="bg-gray-200 px-1 rounded">data science NOT statistics</span> - Exclude documents with "statistics"</div>
            <div><strong>Quotes:</strong> <span className="bg-gray-200 px-1 rounded">"machine learning"</span> - Exact phrase search</div>
            <div><strong>Combine:</strong> <span className="bg-gray-200 px-1 rounded">python AND "data science" OR visualization NOT excel</span></div>
          </div>
        </div>
      )}

      <div className="flex flex-wrap gap-4">
        <select
          className="p-2 border rounded-lg focus:ring-2 focus:ring-blue-500 bg-white"
          value={selectedCategory}
          onChange={(e) => setSelectedCategory(e.target.value)}
        >
          <option value="">📂 All categories</option>
          {categories.map(cat => (
            <option key={cat} value={cat}>{cat}</option>
          ))}
        </select>

        <select
          className="p-2 border rounded-lg focus:ring-2 focus:ring-blue-500 bg-white"
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
};

export default SearchFilters;
