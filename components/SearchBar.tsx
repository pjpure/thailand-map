'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Search, MapPin, X } from 'lucide-react';
import { SearchResult, AdminLevel } from '@/lib/types';
import { GeoJSONDataManager } from '@/lib/geojson-utils';

interface SearchBarProps {
  dataManager: GeoJSONDataManager;
  onResultSelect: (result: SearchResult) => void;
  onSearchChange?: (query: string) => void;
  placeholder?: string;
  className?: string;
}

export default function SearchBar({
  dataManager,
  onResultSelect,
  onSearchChange,
  placeholder = "Search provinces, districts, or subdistricts...",
  className = '',
}: SearchBarProps) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);

  const inputRef = useRef<HTMLInputElement>(null);
  const resultsRef = useRef<HTMLDivElement>(null);

  // Search with debounce
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (query.trim().length >= 2) {
        setIsLoading(true);
        try {
          const searchResults = dataManager.search(query.trim(), 20);
          setResults(searchResults);
          setIsOpen(searchResults.length > 0);
        } catch (error) {
          console.error('Search error:', error);
          setResults([]);
        }
        setIsLoading(false);
      } else {
        setResults([]);
        setIsOpen(false);
      }
      setSelectedIndex(-1);
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [query, dataManager]);

  // Notify parent of search changes
  useEffect(() => {
    onSearchChange?.(query);
  }, [query, onSearchChange]);

  const handleResultSelect = useCallback((result: SearchResult) => {
    setQuery(result.displayName);
    setIsOpen(false);
    setSelectedIndex(-1);
    onResultSelect(result);
  }, [onResultSelect]);

  // Handle keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen || results.length === 0) return;

      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault();
          setSelectedIndex(prev => (prev < results.length - 1 ? prev + 1 : prev));
          break;
        case 'ArrowUp':
          e.preventDefault();
          setSelectedIndex(prev => (prev > 0 ? prev - 1 : prev));
          break;
        case 'Enter':
          e.preventDefault();
          if (selectedIndex >= 0 && selectedIndex < results.length) {
            handleResultSelect(results[selectedIndex]);
          }
          break;
        case 'Escape':
          setIsOpen(false);
          setSelectedIndex(-1);
          inputRef.current?.blur();
          break;
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown);
      return () => document.removeEventListener('keydown', handleKeyDown);
    }
  }, [isOpen, results, selectedIndex, handleResultSelect]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        resultsRef.current &&
        !resultsRef.current.contains(event.target as Node) &&
        !inputRef.current?.contains(event.target as Node)
      ) {
        setIsOpen(false);
        setSelectedIndex(-1);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setQuery(e.target.value);
  };


  const handleClearSearch = () => {
    setQuery('');
    setResults([]);
    setIsOpen(false);
    setSelectedIndex(-1);
    inputRef.current?.focus();
  };

  const getLevelIcon = (level: AdminLevel) => {
    switch (level) {
      case 'provinces':
        return '🏛️';
      case 'districts':
        return '🏘️';
      case 'subdistricts':
        return '🏠';
      case 'region_royin':
      case 'region_nesdb':
        return '🌏';
      default:
        return '📍';
    }
  };

  const getLevelLabel = (level: AdminLevel) => {
    switch (level) {
      case 'provinces':
        return 'Province';
      case 'districts':
        return 'District';
      case 'subdistricts':
        return 'Subdistrict';
      case 'region_royin':
        return 'Region (ROYIN)';
      case 'region_nesdb':
        return 'Region (NESDB)';
      default:
        return 'Location';
    }
  };

  return (
    <div className={`relative ${className}`}>
      {/* Search Input */}
      <div className="relative">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          <Search className="h-4 w-4 text-gray-400" />
        </div>
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={handleInputChange}
          placeholder={placeholder}
          className="block w-full pl-10 pr-10 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
          onFocus={() => {
            if (results.length > 0) {
              setIsOpen(true);
            }
          }}
        />
        {query && (
          <div className="absolute inset-y-0 right-0 pr-3 flex items-center">
            <button
              onClick={handleClearSearch}
              className="text-gray-400 hover:text-gray-600 focus:outline-none"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        )}
      </div>

      {/* Search Results Dropdown */}
      {isOpen && (results.length > 0 || isLoading) && (
        <div
          ref={resultsRef}
          className="absolute z-50 mt-1 w-full bg-white shadow-lg max-h-96 rounded-md border border-gray-200 overflow-hidden"
        >
          {isLoading ? (
            <div className="px-4 py-3 text-sm text-gray-500 flex items-center space-x-2">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-500"></div>
              <span>Searching...</span>
            </div>
          ) : (
            <div className="overflow-auto max-h-96">
              {results.map((result, index) => (
                <button
                  key={`${result.level}-${JSON.stringify(result.feature.properties)}`}
                  onClick={() => handleResultSelect(result)}
                  className={`w-full text-left px-4 py-3 hover:bg-gray-50 focus:bg-gray-50 focus:outline-none border-b border-gray-100 last:border-b-0 ${
                    index === selectedIndex ? 'bg-blue-50' : ''
                  }`}
                >
                  <div className="flex items-center space-x-3">
                    <span className="text-lg flex-shrink-0">
                      {getLevelIcon(result.level)}
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-medium text-gray-900 truncate">
                        {result.displayName}
                      </div>
                      <div className="text-xs text-gray-500 flex items-center space-x-2">
                        <span>{getLevelLabel(result.level)}</span>
                        {result.feature.properties.area_sqkm && (
                          <>
                            <span>•</span>
                            <span>
                              {Number(result.feature.properties.area_sqkm) >= 1000
                                ? `${(Number(result.feature.properties.area_sqkm) / 1000).toFixed(1)}K km²`
                                : `${Number(result.feature.properties.area_sqkm).toFixed(1)} km²`}
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                    <MapPin className="h-4 w-4 text-gray-400 flex-shrink-0" />
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* No Results */}
      {isOpen && !isLoading && results.length === 0 && query.trim().length >= 2 && (
        <div
          ref={resultsRef}
          className="absolute z-50 mt-1 w-full bg-white shadow-lg rounded-md border border-gray-200 px-4 py-3"
        >
          <div className="text-sm text-gray-500 text-center">
            No results found for &quot;{query}&quot;
          </div>
        </div>
      )}
    </div>
  );
}