'use client';

import React, { useState } from 'react';
import { Palette, RotateCcw, Check } from 'lucide-react';
import { ColorScheme, COLOR_SCHEMES } from '@/lib/types';

interface ColorPickerProps {
  currentScheme: ColorScheme;
  onSchemeChange: (scheme: ColorScheme) => void;
  onResetColors?: () => void;
  className?: string;
}

const PRESET_COLORS = [
  '#e74c3c', '#3498db', '#2ecc71', '#f39c12', '#9b59b6',
  '#e67e22', '#1abc9c', '#34495e', '#f1c40f', '#95a5a6',
  '#c0392b', '#2980b9', '#27ae60', '#d68910', '#8e44ad',
  '#d35400', '#16a085', '#2c3e50', '#f4d03f', '#85929e'
];

export default function ColorPicker({
  currentScheme,
  onSchemeChange,
  onResetColors,
  className = '',
}: ColorPickerProps) {
  const [selectedColor, setSelectedColor] = useState(PRESET_COLORS[0]);
  const [customColor, setCustomColor] = useState('#3498db');

  const handleSchemeChange = (scheme: ColorScheme) => {
    onSchemeChange(scheme);
  };

  const handleCustomColorSelect = (color: string) => {
    setSelectedColor(color);
    setCustomColor(color);
  };

  const handleCustomColorInput = (color: string) => {
    setCustomColor(color);
  };

  return (
    <div className={`bg-white rounded-lg shadow-lg p-4 space-y-4 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <Palette className="h-5 w-5 text-gray-600" />
          <h3 className="text-lg font-medium text-gray-900">Color Settings</h3>
        </div>
        {onResetColors && (
          <button
            onClick={onResetColors}
            className="p-1 text-gray-400 hover:text-gray-600 focus:outline-none focus:text-gray-600"
            title="Reset to default colors"
          >
            <RotateCcw className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* Color Scheme Selector */}
      <div className="space-y-3">
        <label className="text-sm font-medium text-gray-700">Color Scheme</label>
        <div className="grid grid-cols-1 gap-2">
          {COLOR_SCHEMES.map((scheme) => (
            <button
              key={scheme.id}
              onClick={() => handleSchemeChange(scheme.id)}
              className={`w-full text-left p-3 rounded-lg border transition-colors ${
                currentScheme === scheme.id
                  ? 'border-blue-500 bg-blue-50 text-blue-900'
                  : 'border-gray-200 hover:border-gray-300 bg-white'
              }`}
            >
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-medium text-sm">{scheme.name}</div>
                  <div className="text-xs text-gray-500 mt-1">
                    {scheme.description}
                  </div>
                </div>
                {currentScheme === scheme.id && (
                  <Check className="h-4 w-4 text-blue-600" />
                )}
              </div>
              
              {/* Color Preview */}
              <div className="mt-2 flex space-x-1">
                {scheme.id === 'by-region' && (
                  <>
                    <div className="w-4 h-4 rounded bg-red-400"></div>
                    <div className="w-4 h-4 rounded bg-blue-400"></div>
                    <div className="w-4 h-4 rounded bg-green-400"></div>
                    <div className="w-4 h-4 rounded bg-yellow-400"></div>
                    <div className="w-4 h-4 rounded bg-purple-400"></div>
                  </>
                )}
                {scheme.id === 'by-area' && (
                  <div className="w-full h-4 rounded bg-gradient-to-r from-blue-200 to-red-500"></div>
                )}
                {scheme.id === 'monochrome' && (
                  <div className="w-full h-4 rounded bg-blue-400"></div>
                )}
                {scheme.id === 'custom' && (
                  <>
                    <div className="w-4 h-4 rounded bg-gray-300 border border-gray-400"></div>
                    <div className="text-xs text-gray-500 flex items-center ml-2">
                      Click features to customize colors
                    </div>
                  </>
                )}
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Custom Color Options */}
      {currentScheme === 'custom' && (
        <div className="space-y-3 pt-2 border-t border-gray-200">
          <label className="text-sm font-medium text-gray-700">
            Custom Colors
          </label>
          
          {/* Preset Colors */}
          <div>
            <div className="text-xs text-gray-600 mb-2">Preset Colors</div>
            <div className="grid grid-cols-10 gap-1">
              {PRESET_COLORS.map((color, index) => (
                <button
                  key={index}
                  onClick={() => handleCustomColorSelect(color)}
                  className={`w-8 h-8 rounded border-2 transition-all hover:scale-110 ${
                    selectedColor === color
                      ? 'border-gray-800 shadow-md'
                      : 'border-gray-300 hover:border-gray-400'
                  }`}
                  style={{ backgroundColor: color }}
                  title={color}
                />
              ))}
            </div>
          </div>

          {/* Custom Color Input */}
          <div>
            <div className="text-xs text-gray-600 mb-2">Custom Color</div>
            <div className="flex items-center space-x-2">
              <input
                type="color"
                value={customColor}
                onChange={(e) => handleCustomColorInput(e.target.value)}
                className="w-12 h-8 border border-gray-300 rounded cursor-pointer"
              />
              <input
                type="text"
                value={customColor}
                onChange={(e) => handleCustomColorInput(e.target.value)}
                placeholder="#3498db"
                className="flex-1 px-2 py-1 text-xs border border-gray-300 rounded font-mono focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>
          </div>

          {/* Instructions */}
          <div className="text-xs text-gray-500 bg-gray-50 p-2 rounded">
            <strong>How to use:</strong> Select a color above, then click on any region on the map to apply the color.
          </div>
        </div>
      )}

      {/* Color Legend */}
      {currentScheme === 'by-region' && (
        <div className="space-y-2 pt-2 border-t border-gray-200">
          <div className="text-xs font-medium text-gray-700">Region Legend</div>
          <div className="space-y-1 text-xs">
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 rounded bg-red-400"></div>
              <span>North</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 rounded bg-blue-400"></div>
              <span>Northeast</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 rounded bg-green-400"></div>
              <span>Central</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 rounded bg-yellow-400"></div>
              <span>East</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 rounded bg-purple-400"></div>
              <span>West</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 rounded bg-orange-400"></div>
              <span>South</span>
            </div>
          </div>
        </div>
      )}

      {/* Area Range Info */}
      {currentScheme === 'by-area' && (
        <div className="space-y-2 pt-2 border-t border-gray-200">
          <div className="text-xs font-medium text-gray-700">Area Scale</div>
          <div className="flex items-center justify-between text-xs text-gray-600">
            <span>Small</span>
            <div className="flex-1 mx-2 h-2 rounded bg-gradient-to-r from-blue-200 to-red-500"></div>
            <span>Large</span>
          </div>
          <div className="text-xs text-gray-500">
            Colors represent relative area sizes within the current administrative level.
          </div>
        </div>
      )}
    </div>
  );
}