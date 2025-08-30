'use client';

import React from 'react';
import { Settings, Layers, Palette, Search as SearchIcon } from 'lucide-react';
import {
  AdminLevel,
  ColorScheme,
  ADMIN_LEVELS,
  COLOR_SCHEMES,
  MapState,
  GeoJSONFeature,
} from '@/lib/types';

interface ControlPanelProps {
  mapState: MapState;
  onLevelChange: (level: AdminLevel) => void;
  onColorSchemeChange: (scheme: ColorScheme) => void;
  onSearchChange: (query: string) => void;
  className?: string;
}

export default function ControlPanel({
  mapState,
  onLevelChange,
  onColorSchemeChange,
  onSearchChange,
  className = '',
}: ControlPanelProps) {
  return (
    <div className={`bg-white rounded-lg shadow-lg p-4 space-y-4 ${className}`}>
      {/* Level Selector */}
      <div className="space-y-2">
        <div className="flex items-center space-x-2">
          <Layers className="h-4 w-4 text-gray-600" />
          <label className="text-sm font-medium text-gray-700">
            Administrative Level
          </label>
        </div>
        <select
          value={mapState.currentLevel}
          onChange={(e) => onLevelChange(e.target.value as AdminLevel)}
          className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
          disabled={mapState.isLoading}
        >
          {ADMIN_LEVELS.map((level) => (
            <option key={level.value} value={level.value}>
              {level.label}
            </option>
          ))}
        </select>
      </div>

      {/* Color Scheme Selector */}
      <div className="space-y-2">
        <div className="flex items-center space-x-2">
          <Palette className="h-4 w-4 text-gray-600" />
          <label className="text-sm font-medium text-gray-700">
            Color Scheme
          </label>
        </div>
        <select
          value={mapState.colorScheme}
          onChange={(e) => onColorSchemeChange(e.target.value as ColorScheme)}
          className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
          disabled={mapState.isLoading}
        >
          {COLOR_SCHEMES.map((scheme) => (
            <option key={scheme.id} value={scheme.id}>
              {scheme.name}
            </option>
          ))}
        </select>
        <p className="text-xs text-gray-500">
          {COLOR_SCHEMES.find(s => s.id === mapState.colorScheme)?.description}
        </p>
      </div>

      {/* Search */}
      <div className="space-y-2">
        <div className="flex items-center space-x-2">
          <SearchIcon className="h-4 w-4 text-gray-600" />
          <label className="text-sm font-medium text-gray-700">
            Search Location
          </label>
        </div>
        <input
          type="text"
          placeholder="Search provinces, districts, or subdistricts..."
          value={mapState.searchTerm}
          onChange={(e) => onSearchChange(e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
          disabled={mapState.isLoading}
        />
      </div>

      {/* Selected Feature Info */}
      {mapState.selectedFeature && (
        <div className="space-y-2 pt-4 border-t border-gray-200">
          <div className="flex items-center space-x-2">
            <Settings className="h-4 w-4 text-gray-600" />
            <label className="text-sm font-medium text-gray-700">
              Selected Area
            </label>
          </div>
          <div className="bg-gray-50 rounded-md p-3 text-sm">
            <SelectedFeatureInfo
              feature={mapState.selectedFeature}
              level={mapState.currentLevel}
            />
          </div>
        </div>
      )}

      {/* Statistics */}
      <div className="space-y-2 pt-4 border-t border-gray-200">
        <div className="text-xs text-gray-500 space-y-1">
          <div>Administrative Level: {mapState.currentLevel}</div>
          <div>Color Scheme: {mapState.colorScheme}</div>
          {mapState.searchTerm && (
            <div>Search: &quot;{mapState.searchTerm}&quot;</div>
          )}
        </div>
      </div>
    </div>
  );
}

function SelectedFeatureInfo({ feature, level }: { feature: GeoJSONFeature; level: AdminLevel }) {
  const props = feature.properties;

  const getName = () => {
    switch (level) {
      case 'provinces':
        return `${props.pro_th} (${props.pro_en})`;
      case 'districts':
        return `${props.amp_th}, ${props.pro_th}`;
      case 'subdistricts':
        return `${props.tam_th}, ${props.amp_th}`;
      case 'region_royin':
        return props.reg_royin || 'Unknown Region';
      case 'region_nesdb':
        return props.reg_nesdb || 'Unknown Region';
      default:
        return 'Unknown';
    }
  };

  const getCode = () => {
    switch (level) {
      case 'provinces':
        return props.pro_code;
      case 'districts':
        return props.amp_code;
      case 'subdistricts':
        return props.tam_code;
      default:
        return 'N/A';
    }
  };

  const formatArea = (area: number) => {
    if (area >= 1000) {
      return `${(area / 1000).toFixed(1)}K km²`;
    }
    return `${area.toFixed(1)} km²`;
  };

  const formatPerimeter = (perimeter: number) => {
    if (perimeter >= 1000) {
      return `${(perimeter / 1000).toFixed(1)}K km`;
    }
    return `${perimeter.toFixed(1)} km`;
  };

  return (
    <div className="space-y-2">
      <div className="font-medium text-gray-900">{getName()}</div>
      <div className="space-y-1">
        <div className="flex justify-between">
          <span className="text-gray-600">Code:</span>
          <span className="font-mono">{getCode()}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-600">Area:</span>
          <span>{formatArea(Number(props.area_sqkm) || 0)}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-600">Perimeter:</span>
          <span>{formatPerimeter(Number(props.perimeter) || 0)}</span>
        </div>
        {props.reg_royin && (
          <div className="flex justify-between">
            <span className="text-gray-600">Region (ROYIN):</span>
            <span>{props.reg_royin}</span>
          </div>
        )}
        {props.reg_nesdb && (
          <div className="flex justify-between">
            <span className="text-gray-600">Region (NESDB):</span>
            <span>{props.reg_nesdb}</span>
          </div>
        )}
      </div>
    </div>
  );
}