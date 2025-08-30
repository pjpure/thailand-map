'use client';

import React from 'react';
import { MapPin, Square, Ruler } from 'lucide-react';
import { TooltipData } from '@/lib/types';
import { formatArea, formatPerimeter } from '@/lib/geojson-utils';

interface TooltipProps {
  data: TooltipData | null;
  position?: { x: number; y: number };
  className?: string;
}

export default function Tooltip({ data, position, className = '' }: TooltipProps) {
  if (!data) return null;

  const style: React.CSSProperties = position 
    ? {
        position: 'fixed',
        left: position.x + 10,
        top: position.y - 10,
        zIndex: 1000,
        pointerEvents: 'none',
      }
    : {};

  return (
    <div
      className={`bg-white border border-gray-200 rounded-lg shadow-lg p-3 max-w-xs ${className}`}
      style={style}
    >
      {/* Header */}
      <div className="border-b border-gray-100 pb-2 mb-2">
        <div className="font-semibold text-gray-900 text-sm leading-tight">
          {data.name_th}
        </div>
        <div className="text-xs text-gray-600 mt-1">
          {data.name_en}
        </div>
      </div>

      {/* Details */}
      <div className="space-y-2">
        {/* Area */}
        <div className="flex items-center justify-between text-xs">
          <div className="flex items-center space-x-2 text-gray-600">
            <Square className="h-3 w-3" />
            <span>Area:</span>
          </div>
          <span className="font-medium text-gray-900">
            {formatArea(data.area)}
          </span>
        </div>

        {/* Perimeter */}
        <div className="flex items-center justify-between text-xs">
          <div className="flex items-center space-x-2 text-gray-600">
            <Ruler className="h-3 w-3" />
            <span>Perimeter:</span>
          </div>
          <span className="font-medium text-gray-900">
            {formatPerimeter(data.perimeter)}
          </span>
        </div>

        {/* Code */}
        <div className="flex items-center justify-between text-xs">
          <div className="flex items-center space-x-2 text-gray-600">
            <MapPin className="h-3 w-3" />
            <span>Code:</span>
          </div>
          <span className="font-mono font-medium text-gray-900">
            {data.code}
          </span>
        </div>
      </div>

      {/* Tooltip Arrow */}
      <div 
        className="absolute w-2 h-2 bg-white border-l border-b border-gray-200 transform rotate-45"
        style={{
          left: -4,
          top: '50%',
          marginTop: -4,
        }}
      />
    </div>
  );
}

// Mobile-friendly tooltip that appears at the bottom of the screen
export function MobileTooltip({ data, className = '' }: { data: TooltipData | null; className?: string }) {
  if (!data) return null;

  return (
    <div className={`fixed bottom-4 left-4 right-4 bg-white border border-gray-200 rounded-lg shadow-lg p-4 z-50 md:hidden ${className}`}>
      {/* Header */}
      <div className="border-b border-gray-100 pb-3 mb-3">
        <div className="font-semibold text-gray-900 text-base">
          {data.name_th}
        </div>
        <div className="text-sm text-gray-600 mt-1">
          {data.name_en}
        </div>
      </div>

      {/* Details Grid */}
      <div className="grid grid-cols-3 gap-4 text-center">
        {/* Area */}
        <div>
          <div className="flex justify-center mb-1">
            <Square className="h-4 w-4 text-gray-600" />
          </div>
          <div className="text-xs text-gray-600">Area</div>
          <div className="text-sm font-medium text-gray-900 mt-1">
            {formatArea(data.area)}
          </div>
        </div>

        {/* Perimeter */}
        <div>
          <div className="flex justify-center mb-1">
            <Ruler className="h-4 w-4 text-gray-600" />
          </div>
          <div className="text-xs text-gray-600">Perimeter</div>
          <div className="text-sm font-medium text-gray-900 mt-1">
            {formatPerimeter(data.perimeter)}
          </div>
        </div>

        {/* Code */}
        <div>
          <div className="flex justify-center mb-1">
            <MapPin className="h-4 w-4 text-gray-600" />
          </div>
          <div className="text-xs text-gray-600">Code</div>
          <div className="text-sm font-mono font-medium text-gray-900 mt-1">
            {data.code}
          </div>
        </div>
      </div>
    </div>
  );
}

// Tooltip hook for managing tooltip state
export function useTooltip() {
  const [tooltipData, setTooltipData] = React.useState<TooltipData | null>(null);
  const [mousePosition, setMousePosition] = React.useState<{ x: number; y: number } | null>(null);

  const showTooltip = React.useCallback((data: TooltipData, position?: { x: number; y: number }) => {
    setTooltipData(data);
    if (position) {
      setMousePosition(position);
    }
  }, []);

  const hideTooltip = React.useCallback(() => {
    setTooltipData(null);
    setMousePosition(null);
  }, []);

  const updatePosition = React.useCallback((position: { x: number; y: number }) => {
    setMousePosition(position);
  }, []);

  return {
    tooltipData,
    mousePosition,
    showTooltip,
    hideTooltip,
    updatePosition,
  };
}