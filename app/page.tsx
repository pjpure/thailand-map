'use client';

import React, { useState } from 'react';
import dynamic from 'next/dynamic';
import { Palette, Layers, RotateCcw, Search, X, ChevronDown } from 'lucide-react';

// Dynamically import Map component to avoid SSR issues with Leaflet
const SimpleMap = dynamic(() => import('@/components/SimpleMap'), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full bg-white flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-800 mx-auto mb-4"></div>
        <p className="text-gray-600">กำลังโหลดแผนที่...</p>
      </div>
    </div>
  ),
});

const COLORS = [
  '#ffffff', '#ff0000', '#00ff00', '#0000ff', '#ffff00', '#ff00ff', '#00ffff',
  '#ffa500', '#800080', '#008000', '#800000', '#008080', '#ffc0cb', '#a52a2a',
  '#808080', '#000080', '#90ee90', '#ffb6c1', '#dda0dd', '#98fb98'
];

type AdminLevel = 'provinces' | 'districts' | 'subdistricts';

const ADMIN_LEVELS: { value: AdminLevel; label: string }[] = [
  { value: 'provinces', label: 'จังหวัด (77)' },
  { value: 'districts', label: 'อำเภอ (928)' },
  { value: 'subdistricts', label: 'ตำบล (7,367)' },
];

export default function Home() {
  const [selectedColor, setSelectedColor] = useState('#ff0000');
  const [currentLevel, setCurrentLevel] = useState<AdminLevel>('provinces');
  const [isLoading, setIsLoading] = useState(true);
  const [areaColors, setAreaColors] = useState<Map<string, string>>(new Map());
  const [selectedProvinces, setSelectedProvinces] = useState<string[]>([]);
  const [availableProvinces, setAvailableProvinces] = useState<{ code: string, name: string }[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [borderColor, setBorderColor] = useState('#000000');

  const handleClearColors = () => {
    setAreaColors(new Map());
  };

  // Load provinces list when component mounts
  React.useEffect(() => {
    const loadProvinces = async () => {
      try {
        const response = await fetch('/data/provinces.geojson');
        const data = await response.json();
        const provinces = data.features.map((feature: any) => ({
          code: feature.properties.pro_code,
          name: feature.properties.pro_th
        })).sort((a: any, b: any) => a.name.localeCompare(b.name));
        setAvailableProvinces(provinces);
      } catch (error) {
        console.error('Error loading provinces:', error);
      }
    };
    loadProvinces();
  }, []);

  // Close dropdown when clicking outside
  React.useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Element;
      if (!target.closest('.province-dropdown')) {
        setIsDropdownOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Filter provinces based on search term
  const filteredProvinces = availableProvinces.filter(province =>
    province.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleProvinceToggle = (provinceCode: string) => {
    setSelectedProvinces(prev =>
      prev.includes(provinceCode)
        ? prev.filter(code => code !== provinceCode)
        : [...prev, provinceCode]
    );
  };

  const handleSelectAll = () => {
    setSelectedProvinces(filteredProvinces.map(p => p.code));
  };

  const handleClearSelection = () => {
    setSelectedProvinces([]);
  };

  return (
    <div className="h-screen flex flex-col bg-white">
      {/* Header */}
      <header className="bg-white border-b-2 border-gray-800 px-4 py-2 shadow-sm">
        <div className="flex items-center justify-between mb-2">
          <div>
            <h1 className="text-lg font-bold text-gray-800">แผนที่ประเทศไทย</h1>
            <p className="text-xs text-gray-500 leading-none">
              คลิก 1 ครั้ง = ลงสี | ดับเบิลคลิก = ลบสี | ลงสีได้หลายพื้นที่
            </p>
          </div>

          {/* Clear Colors Button */}
          <button
            onClick={handleClearColors}
            className="flex items-center space-x-1.5 px-2.5 py-1.5 border border-gray-300 bg-white hover:bg-red-50 hover:border-red-300 transition-all duration-200 rounded-sm"
            title="ล้างสีทั้งหมด"
          >
            <RotateCcw className="h-3.5 w-3.5 text-red-600" />
            <span className="text-xs font-medium text-red-600">ล้างสี</span>
          </button>
        </div>

        <div className="flex items-center justify-between">
          {/* Level Selector and Province Filter */}
          <div className="flex items-center space-x-3">
            <div className="flex items-center space-x-1.5">
              <Layers className="h-4 w-4 text-gray-600" />
              <span className="text-sm font-medium text-gray-700">ระดับ:</span>
            </div>
            <select
              value={currentLevel}
              onChange={(e) => setCurrentLevel(e.target.value as AdminLevel)}
              className="px-2.5 py-1.5 border border-gray-300 bg-white text-sm font-medium focus:outline-none focus:border-blue-400 rounded-sm hover:border-gray-400 transition-colors"
            >
              {ADMIN_LEVELS.map((level) => (
                <option key={level.value} value={level.value}>
                  {level.label}
                </option>
              ))}
            </select>

            {/* Province Filter - only show for districts level */}
            {currentLevel === 'districts' && (
              <>
                <div className="flex items-center space-x-1.5">
                  <span className="text-sm font-medium text-gray-700">จังหวัด:</span>
                </div>
                <div className="relative province-dropdown">
                  {/* Selected provinces display and toggle button */}
                  <button
                    onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                    className="px-2.5 py-1.5 border border-gray-300 bg-white text-sm font-medium focus:outline-none focus:border-blue-400 rounded-sm hover:border-gray-400 transition-colors min-w-[180px] flex items-center justify-between"
                  >
                    <span className="truncate">
                      {selectedProvinces.length === 0
                        ? 'เลือกจังหวัด'
                        : selectedProvinces.length === 1
                          ? availableProvinces.find(p => p.code === selectedProvinces[0])?.name
                          : `${selectedProvinces.length} จังหวัด`
                      }
                    </span>
                    <ChevronDown className={`h-4 w-4 transition-transform ${isDropdownOpen ? 'rotate-180' : ''}`} />
                  </button>

                  {/* Dropdown */}
                  {isDropdownOpen && (
                    <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-300 rounded-sm shadow-lg max-h-64 overflow-hidden z-50">
                      {/* Search input */}
                      <div className="p-2 border-b border-gray-200">
                        <div className="relative">
                          <Search className="absolute left-2 top-2 h-4 w-4 text-gray-400" />
                          <input
                            type="text"
                            placeholder="ค้นหาจังหวัด..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-8 pr-2 py-1 border border-gray-300 text-sm focus:outline-none focus:border-gray-500"
                          />
                          {searchTerm && (
                            <X
                              className="absolute right-2 top-2 h-4 w-4 text-gray-400 cursor-pointer hover:text-gray-600"
                              onClick={() => setSearchTerm('')}
                            />
                          )}
                        </div>
                      </div>

                      {/* Action buttons */}
                      <div className="p-2 border-b border-gray-200 flex space-x-2">
                        <button
                          onClick={handleSelectAll}
                          className="px-2 py-1 text-xs border border-gray-300 bg-white hover:bg-gray-100"
                          disabled={filteredProvinces.length === 0}
                        >
                          เลือกทั้งหมด
                        </button>
                        <button
                          onClick={handleClearSelection}
                          className="px-2 py-1 text-xs border border-gray-300 bg-white hover:bg-gray-100"
                        >
                          ล้าง
                        </button>
                      </div>

                      {/* Province list */}
                      <div className="max-h-40 overflow-y-auto">
                        {filteredProvinces.length > 0 ? (
                          filteredProvinces.map((province) => (
                            <label
                              key={province.code}
                              className="flex items-center px-3 py-2 hover:bg-gray-100 cursor-pointer"
                            >
                              <input
                                type="checkbox"
                                checked={selectedProvinces.includes(province.code)}
                                onChange={() => handleProvinceToggle(province.code)}
                                className="mr-2"
                              />
                              <span className="text-sm">{province.name}</span>
                            </label>
                          ))
                        ) : (
                          <div className="px-3 py-2 text-sm text-gray-500">ไม่พบจังหวัดที่ค้นหา</div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </>
            )}
          </div>

          {/* Color Pickers */}
          <div className="flex items-center space-x-6">
            {/* Area Color Picker */}
            <div className="flex items-center space-x-3">
              <div className="flex items-center space-x-1.5">
                <Palette className="h-4 w-4 text-gray-600" />
                <span className="text-sm font-medium text-gray-700">สีพื้นที่:</span>
              </div>
              <div className="flex space-x-0.5">
                {COLORS.map((color) => (
                  <button
                    key={color}
                    onClick={() => setSelectedColor(color)}
                    className={`w-7 h-7 border transition-all rounded-sm ${selectedColor === color
                      ? 'border-gray-700 ring-2 ring-blue-400 ring-offset-1 scale-105'
                      : 'border-gray-300 hover:border-gray-500 hover:scale-105'
                      }`}
                    style={{ backgroundColor: color }}
                    title={color}
                  />
                ))}
              </div>
            </div>

            {/* Border Color Picker */}
            <div className="flex items-center space-x-3">
              <div className="flex items-center space-x-1.5">
                <div className="h-4 w-4 border-2 border-gray-600 rounded-sm bg-white"></div>
                <span className="text-sm font-medium text-gray-700">สีเส้น:</span>
              </div>
              <div className="flex space-x-0.5">
                <button
                  onClick={() => setBorderColor('#ffffff')}
                  className={`w-7 h-7 border-2 transition-all rounded-sm ${borderColor === '#ffffff'
                    ? 'border-gray-700 ring-2 ring-green-400 ring-offset-1 scale-105'
                    : 'border-gray-300 hover:border-gray-500 hover:scale-105'
                    }`}
                  style={{ backgroundColor: '#ffffff' }}
                  title="ขาว"
                />
                <button
                  onClick={() => setBorderColor('#808080')}
                  className={`w-7 h-7 border-2 transition-all rounded-sm ${borderColor === '#808080'
                    ? 'border-gray-700 ring-2 ring-green-400 ring-offset-1 scale-105'
                    : 'border-gray-300 hover:border-gray-500 hover:scale-105'
                    }`}
                  style={{ backgroundColor: '#808080' }}
                  title="เทา"
                />
                <button
                  onClick={() => setBorderColor('#000000')}
                  className={`w-7 h-7 border-2 transition-all rounded-sm ${borderColor === '#000000'
                    ? 'border-gray-700 ring-2 ring-green-400 ring-offset-1 scale-105'
                    : 'border-gray-300 hover:border-gray-500 hover:scale-105'
                    }`}
                  style={{ backgroundColor: '#000000' }}
                  title="ดำ"
                />
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Map Container */}
      <div className="flex-1 relative">
        <SimpleMap
          selectedColor={selectedColor}
          currentLevel={currentLevel}
          areaColors={areaColors}
          onAreaColorsChange={setAreaColors}
          onMapReady={() => setIsLoading(false)}
          selectedProvinces={selectedProvinces}
          borderColor={borderColor}
        />

        {/* Loading Indicator */}
        {isLoading && (
          <div className="absolute top-4 left-1/2 transform -translate-x-1/2 bg-white border-2 border-gray-800 rounded px-4 py-2 flex items-center space-x-2 z-30">
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-800"></div>
            <span className="text-sm text-gray-600">กำลังโหลดข้อมูล...</span>
          </div>
        )}
      </div>
    </div>
  );
}