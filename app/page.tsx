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

type AdminLevel = 'provinces' | 'districts' | 'subdistricts';

const ADMIN_LEVELS: { value: AdminLevel; label: string }[] = [
  { value: 'provinces', label: 'จังหวัด (77)' },
  { value: 'districts', label: 'อำเภอ (928)' },
  { value: 'subdistricts', label: 'ตำบล (7,367)' },
];

type ProvinceItem = { code: string; name: string };

export default function Home() {
  // พาเล็ต 5 สีเริ่มต้น (แก้ไขได้)
  const [palette, setPalette] = useState<string[]>([
    '#ff3b30', // แดง
    '#34c759', // เขียว
    '#007aff', // น้ำเงิน
    '#ffcc00', // เหลือง
    '#8e8e93', // เทาเข้ม
  ]);
  const [selectedColor, setSelectedColor] = useState(palette[0]);

  const [currentLevel, setCurrentLevel] = useState<AdminLevel>('provinces');
  const [isLoading, setIsLoading] = useState(true);
  const [areaColors, setAreaColors] = useState<Map<string, string>>(new Map());
  const [selectedProvinces, setSelectedProvinces] = useState<string[]>([]);
  const [availableProvinces, setAvailableProvinces] = useState<ProvinceItem[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  // === เปลี่ยน 1 ปุ่มเป็น Color Picker ===
  const [borderColor, setBorderColor] = useState('#000000');

  // โหมดแก้ไขพาเล็ต
  const [isEditingPalette, setIsEditingPalette] = useState(false);

  const handleClearColors = () => {
    setAreaColors(new Map());
  };

  // Load provinces list when component mounts
  React.useEffect(() => {
    const loadProvinces = async () => {
      try {
        const response = await fetch('/data/provinces.geojson');
        const data = await response.json() as {
          features: Array<{ properties: { pro_code: string; pro_th: string } }>
        };
        const provinces: ProvinceItem[] = data.features
          .map((feature) => ({
            code: feature.properties.pro_code,
            name: feature.properties.pro_th,
          }))
          .sort((a, b) => a.name.localeCompare(b.name));
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
  const filteredProvinces = availableProvinces.filter((province) =>
    province.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleProvinceToggle = (provinceCode: string) => {
    setSelectedProvinces((prev) =>
      prev.includes(provinceCode) ? prev.filter((code) => code !== provinceCode) : [...prev, provinceCode]
    );
  };

  const handleSelectAll = () => {
    setSelectedProvinces(filteredProvinces.map((p) => p.code));
  };

  const handleClearSelection = () => {
    setSelectedProvinces([]);
  };

  // อัพเดตสีในพาเล็ตทีละตำแหน่ง
  const updatePaletteColor = (index: number, newColor: string) => {
    setPalette((prev) => {
      const next = [...prev];
      const old = next[index];
      next[index] = newColor;

      // ถ้ากำลังเลือกสีเดิมอยู่ ให้ตามไปเป็นสีใหม่ด้วย
      if (selectedColor === old) {
        setSelectedColor(newColor);
      }
      return next;
    });
  };

  return (
    <div className="h-screen flex flex-col bg-white">
      {/* Header */}
      <header className="bg-white border-b-2 border-gray-800 px-4 py-2 shadow-sm">
        <div className="flex items-center justify-between mb-2">
          <div>
            <h1 className="text-lg font-bold text-gray-800">แผนที่ประเทศไทย</h1>
            <p className="text-xs text-gray-500 leading-none">คลิก 1 ครั้ง = ลงสี | ดับเบิลคลิก = ลบสี | ลงสีได้หลายพื้นที่</p>
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
                          ? availableProvinces.find((p) => p.code === selectedProvinces[0])?.name
                          : `${selectedProvinces.length} จังหวัด`}
                    </span>
                    <ChevronDown className={`h-4 w-4 transition-transform ${isDropdownOpen ? 'rotate-180' : ''}`} />
                  </button>

                  {/* Dropdown */}
                  {isDropdownOpen && (
                    <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-300 rounded-sm shadow-lg max-h-64 overflow-hidden z-500">
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
                            <label key={province.code} className="flex items-center px-3 py-2 hover:bg-gray-100 cursor-pointer">
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

              {/* ปุ่มสลับโหมดแก้ไขสี */}
              <button
                type="button"
                onClick={() => setIsEditingPalette((v) => !v)}
                className={`px-2 py-1 text-xs border rounded-sm transition-colors ${isEditingPalette
                  ? 'border-blue-500 text-blue-600 bg-blue-50'
                  : 'border-gray-300 text-gray-700 bg-white hover:bg-gray-100'
                  }`}
                title="แก้ไขชุดสี"
              >
                {isEditingPalette ? 'เสร็จสิ้น' : 'แก้ไขสี'}
              </button>

              {/* ปุ่มเลือกสี + ช่องแก้ไขสี */}
              <div className="flex space-x-2">
                {palette.map((color, idx) => (
                  <div key={idx} className="flex flex-col items-center">
                    <button
                      onClick={() => setSelectedColor(color)}
                      className={`w-7 h-7 border transition-all rounded-sm ${selectedColor === color
                        ? 'border-gray-700 ring-2 ring-blue-400 ring-offset-1 scale-105'
                        : 'border-gray-300 hover:border-gray-500 hover:scale-105'
                        }`}
                      style={{ backgroundColor: color }}
                      title={color}
                    />
                    {isEditingPalette && (
                      <input
                        type="color"
                        value={color}
                        onChange={(e) => updatePaletteColor(idx, e.target.value)}
                        className="mt-1 w-8 h-6 p-0 border border-gray-300 rounded-sm"
                        aria-label={`แก้ไขสีที่ ${idx + 1}`}
                      />
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Border Color Picker (มี Color Picker + ปุ่มเทา/ดำ) */}
            <div className="flex items-center space-x-3">
              <div className="flex items-center space-x-1.5">
                <div className="h-4 w-4 border-2 border-gray-600 rounded-sm bg-white"></div>
                <span className="text-sm font-medium text-gray-700">สีเส้น:</span>
              </div>

              {(() => {
                const isCustomBorder = !['#808080', '#000000'].includes(borderColor.toLowerCase());
                return (
                  <div className="flex items-center space-x-1.5">
                    {/* Color Picker (แทนที่ปุ่มสีขาวเดิม) */}
                    <label className="inline-flex items-center">
                      <span className="sr-only">เลือกสีเส้นแบบกำหนดเอง</span>
                      <input
                        type="color"
                        value={borderColor}
                        onChange={(e) => setBorderColor(e.target.value)}
                        className={`appearance-none w-7 h-7 p-0 border-2 rounded-sm cursor-pointer 
                          ${isCustomBorder
                            ? 'border-gray-700 ring-2 ring-green-400 ring-offset-1 scale-105'
                            : 'border-gray-300 hover:border-gray-500 hover:scale-105'
                          }`}
                        title={borderColor}
                        aria-label="เลือกสีเส้นแบบกำหนดเอง"
                      />
                    </label>

                  </div>
                );
              })()}
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
