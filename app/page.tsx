'use client';

import React, { useState } from 'react';
import dynamic from 'next/dynamic';
import { Palette, Layers, RotateCcw } from 'lucide-react';

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

  const handleClearColors = () => {
    setAreaColors(new Map());
  };

  return (
    <div className="h-screen flex flex-col bg-white">
      {/* Header */}
      <header className="bg-white border-b-2 border-gray-800 px-4 py-3">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h1 className="text-xl font-bold text-gray-800">แผนที่ประเทศไทย</h1>
            <p className="text-xs text-gray-600 mt-1">
              คลิก 1 ครั้ง = ลงสี | ดับเบิลคลิก = ลบสี | ลงสีได้หลายพื้นที่
            </p>
          </div>

          {/* Clear Colors Button */}
          <button
            onClick={handleClearColors}
            className="flex items-center space-x-2 px-3 py-2 border-2 border-gray-800 bg-white hover:bg-gray-100 transition-colors"
            title="ล้างสีทั้งหมด"
          >
            <RotateCcw className="h-4 w-4" />
            <span className="text-sm font-medium">ล้างสี</span>
          </button>
        </div>

        <div className="flex items-center justify-between">
          {/* Level Selector */}
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <Layers className="h-5 w-5 text-gray-600" />
              <span className="text-sm font-medium text-gray-700">ระดับ:</span>
            </div>
            <select
              value={currentLevel}
              onChange={(e) => setCurrentLevel(e.target.value as AdminLevel)}
              className="px-3 py-2 border-2 border-gray-800 bg-white text-sm font-medium focus:outline-none"
            >
              {ADMIN_LEVELS.map((level) => (
                <option key={level.value} value={level.value}>
                  {level.label}
                </option>
              ))}
            </select>
          </div>

          {/* Color Picker */}
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <Palette className="h-5 w-5 text-gray-600" />
              <span className="text-sm font-medium text-gray-700">เลือกสี:</span>
            </div>
            <div className="flex space-x-1">
              {COLORS.map((color) => (
                <button
                  key={color}
                  onClick={() => setSelectedColor(color)}
                  className={`w-8 h-8 border-2 transition-all ${selectedColor === color
                    ? 'border-gray-800 scale-110'
                    : 'border-gray-400 hover:border-gray-600'
                    }`}
                  style={{ backgroundColor: color }}
                  title={color}
                />
              ))}
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