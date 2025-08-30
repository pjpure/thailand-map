'use client';

import React, { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { THAILAND_CONFIG } from '@/lib/types';

type AdminLevel = 'provinces' | 'districts' | 'subdistricts';

interface SimpleMapProps extends Readonly<{}> {
  selectedColor: string;
  currentLevel: AdminLevel;
  areaColors: Map<string, string>;
  onAreaColorsChange: (colors: Map<string, string>) => void;
  onMapReady?: () => void;
  selectedProvinces?: string[]; // Array of province codes to filter districts
}

export default function SimpleMap({
  selectedColor,
  currentLevel,
  areaColors,
  onAreaColorsChange,
  onMapReady,
  selectedProvinces = []
}: SimpleMapProps) {
  const mapRef = useRef<L.Map | null>(null);
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const currentLayerRef = useRef<L.GeoJSON | null>(null);
  const labelsLayerRef = useRef<L.LayerGroup | null>(null);
  const provinceBordersRef = useRef<L.GeoJSON | null>(null);
  const selectedColorRef = useRef<string>(selectedColor);
  const areaColorsRef = useRef<Map<string, string>>(areaColors);

  // Update refs when props change
  useEffect(() => {
    selectedColorRef.current = selectedColor;
  }, [selectedColor]);

  useEffect(() => {
    areaColorsRef.current = areaColors;
  }, [areaColors]);

  // Initialize map
  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return;

    // Create map with simple white background
    const map = L.map(mapContainerRef.current, {
      center: THAILAND_CONFIG.center,
      zoom: THAILAND_CONFIG.zoom,
      minZoom: THAILAND_CONFIG.minZoom,
      maxZoom: THAILAND_CONFIG.maxZoom,
      zoomControl: true,
      scrollWheelZoom: true,
      doubleClickZoom: true,
      dragging: true,
      attributionControl: false,
    });

    // Add simple white tile layer (no external tiles needed)
    const whiteLayer = L.tileLayer('data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAAC0lEQVQIHWP4/x8AAwMCAO+ip1sAAAAASUVORK5CYII=', {
      attribution: '',
    });
    whiteLayer.addTo(map);

    // Set bounds to Thailand region
    const bounds = L.latLngBounds(
      [THAILAND_CONFIG.bounds.south, THAILAND_CONFIG.bounds.west],
      [THAILAND_CONFIG.bounds.north, THAILAND_CONFIG.bounds.east]
    );
    map.setMaxBounds(bounds);

    mapRef.current = map;
    labelsLayerRef.current = L.layerGroup().addTo(map);

    return () => {
      if (mapRef.current) {
        removeProvinceBorders();
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, []);

  // Load data when level changes or selected provinces change
  useEffect(() => {
    if (!mapRef.current) return;
    loadLevelData();
  }, [currentLevel, selectedProvinces]);

  // Update colors when areaColors changes
  useEffect(() => {
    updateLayerColors();
  }, [areaColors]);

  const loadLevelData = async () => {
    try {
      const response = await fetch(`/data/${currentLevel}.geojson`);
      const data = await response.json();

      if (mapRef.current) {
        displayAreas(data);
        // Load province borders overlay for district level
        if (currentLevel === 'districts') {
          await loadProvinceBorders();
        } else {
          removeProvinceBorders();
        }
        onMapReady?.();
      }
    } catch (error) {
      console.error(`Error loading ${currentLevel} data:`, error);
    }
  };

  const loadProvinceBorders = async () => {
    try {
      const response = await fetch('/data/provinces.geojson');
      const provincesData = await response.json();
      
      if (mapRef.current) {
        // Remove existing province borders
        removeProvinceBorders();
        
        // Filter provinces based on selection
        let filteredProvincesData = provincesData;
        if (selectedProvinces.length > 0) {
          filteredProvincesData = {
            ...provincesData,
            features: provincesData.features.filter((feature: any) => 
              selectedProvinces.includes(feature.properties.pro_code)
            )
          };
        }
        
        // Add province borders with thick dark black lines
        const provinceBordersLayer = L.geoJSON(filteredProvincesData, {
          style: () => ({
            fillColor: 'transparent',
            fillOpacity: 0,
            color: '#000000', // Dark black color
            weight: 3,
            opacity: 1,
          }),
          interactive: false // Make it non-interactive so clicks go through to districts
        });
        
        provinceBordersLayer.addTo(mapRef.current);
        provinceBordersRef.current = provinceBordersLayer;
      }
    } catch (error) {
      console.error('Error loading province borders:', error);
    }
  };

  const removeProvinceBorders = () => {
    if (provinceBordersRef.current && mapRef.current) {
      mapRef.current.removeLayer(provinceBordersRef.current);
      provinceBordersRef.current = null;
    }
  };

  const displayAreas = (geojsonData: any) => {
    if (!mapRef.current || !labelsLayerRef.current) return;

    // Filter data based on selected provinces for district level
    let filteredData = geojsonData;
    if (currentLevel === 'districts' && selectedProvinces.length > 0) {
      filteredData = {
        ...geojsonData,
        features: geojsonData.features.filter((feature: any) => 
          selectedProvinces.includes(feature.properties.pro_code)
        )
      };
    }

    // Remove existing layers
    if (currentLayerRef.current) {
      mapRef.current.removeLayer(currentLayerRef.current);
    }
    labelsLayerRef.current.clearLayers();

    const layer = L.geoJSON(filteredData, {
      style: (feature) => {
        if (!feature) return getDefaultStyle();

        const areaCode = getAreaCode(feature, currentLevel);
        const fillColor = areaColorsRef.current.get(areaCode) || '#ffffff';

        return {
          fillColor: fillColor,
          fillOpacity: fillColor === '#ffffff' ? 0 : 0.7,
          color: getStrokeColor(currentLevel),
          weight: getStrokeWeight(currentLevel),
          opacity: getStrokeOpacity(currentLevel),
        };
      },
      onEachFeature: (feature, layer) => {
        if (feature.properties) {
          const areaName = getAreaName(feature, currentLevel);
          const areaCode = getAreaCode(feature, currentLevel);

          // Add tooltip
          layer.bindTooltip(areaName, {
            permanent: false,
            direction: 'center',
            className: 'area-tooltip'
          });

          // Add permanent label for larger areas or when zoomed in
          if (shouldShowLabel(currentLevel)) {
            // Use polygon centroid for better positioning instead of bounds center
            let labelPosition;
            try {
              // Try to calculate centroid from the polygon
              if ((layer as any).getLatLngs && (layer as any).getLatLngs().length > 0) {
                // For polygon, calculate centroid
                const latLngs = (layer as any).getLatLngs()[0]; // Get outer ring
                if (Array.isArray(latLngs) && latLngs.length > 0) {
                  let lat = 0, lng = 0;
                  for (const point of latLngs) {
                    lat += point.lat;
                    lng += point.lng;
                  }
                  lat /= latLngs.length;
                  lng /= latLngs.length;
                  labelPosition = L.latLng(lat, lng);
                } else {
                  labelPosition = (layer as any).getBounds().getCenter();
                }
              } else {
                labelPosition = (layer as any).getBounds().getCenter();
              }
            } catch (error) {
              // Fallback to bounds center if centroid calculation fails
              labelPosition = (layer as any).getBounds().getCenter();
            }
            
            const marker = L.marker(labelPosition, {
              icon: L.divIcon({
                className: 'area-label',
                html: `<div style="color: #000; font-size: ${getLabelSize(currentLevel)}px; font-weight: bold; text-align: center; pointer-events: none; text-shadow: 1px 1px 2px rgba(255,255,255,0.8);">${areaName}</div>`,
                iconSize: [120, 24],
                iconAnchor: [60, 12]
              })
            });
            labelsLayerRef.current!.addLayer(marker);
          }

          // Click to color - always add the selected color (allow multiple areas)
          layer.on('click', () => {
            const newColors = new Map(areaColorsRef.current);
            newColors.set(areaCode, selectedColorRef.current);
            onAreaColorsChange(newColors);
          });

          // Double-click to remove color
          layer.on('dblclick', () => {
            const newColors = new Map(areaColorsRef.current);
            newColors.delete(areaCode);
            onAreaColorsChange(newColors);
          });

          // Hover effects
          layer.on({
            mouseover: () => {
              (layer as any).setStyle({
                weight: getStrokeWeight(currentLevel) + 1,
                opacity: 1,
              });
            },
            mouseout: () => {
              (layer as any).setStyle({
                weight: getStrokeWeight(currentLevel),
                opacity: getStrokeOpacity(currentLevel),
              });
            }
          });
        }
      }
    });

    layer.addTo(mapRef.current);
    currentLayerRef.current = layer;

    // Fit to bounds
    const bounds = layer.getBounds();
    if (bounds.isValid()) {
      mapRef.current.fitBounds(bounds, { padding: [20, 20] });
    }
  };

  const updateLayerColors = () => {
    if (!currentLayerRef.current) return;

    currentLayerRef.current.eachLayer((layer: any) => {
      if (layer.feature) {
        const areaCode = getAreaCode(layer.feature, currentLevel);
        const fillColor = areaColorsRef.current.get(areaCode) || '#ffffff';

        (layer as any).setStyle({
          fillColor: fillColor,
          fillOpacity: fillColor === '#ffffff' ? 0 : 0.7,
          color: getStrokeColor(currentLevel),
          weight: getStrokeWeight(currentLevel),
          opacity: getStrokeOpacity(currentLevel),
        });
      }
    });
  };

  const getAreaCode = (feature: any, level: AdminLevel): string => {
    switch (level) {
      case 'provinces':
        return feature.properties.pro_code;
      case 'districts':
        return feature.properties.amp_code;
      case 'subdistricts':
        return feature.properties.tam_code;
      default:
        return '';
    }
  };

  const getAreaName = (feature: any, level: AdminLevel): string => {
    switch (level) {
      case 'provinces':
        return feature.properties.pro_th;
      case 'districts':
        return feature.properties.amp_th;
      case 'subdistricts':
        return feature.properties.tam_th;
      default:
        return '';
    }
  };

  const getStrokeWeight = (level: AdminLevel): number => {
    switch (level) {
      case 'provinces':
        return 2;
      case 'districts':
        return 1.5;
      case 'subdistricts':
        return 1;
      default:
        return 2;
    }
  };

  const getStrokeColor = (level: AdminLevel): string => {
    switch (level) {
      case 'provinces':
        return '#000000'; // Dark black
      case 'districts':
        return '#666666'; // Light black (gray)
      case 'subdistricts':
        return '#888888'; // Lighter gray
      default:
        return '#000000';
    }
  };

  const getStrokeOpacity = (level: AdminLevel): number => {
    switch (level) {
      case 'provinces':
        return 1;
      case 'districts':
        return 0.8;
      case 'subdistricts':
        return 0.6;
      default:
        return 1;
    }
  };

  const shouldShowLabel = (level: AdminLevel): boolean => {
    switch (level) {
      case 'provinces':
        return true;
      case 'districts':
        return true; // Show district names too
      case 'subdistricts':
        return false; // Too many subdistricts to show all labels
      default:
        return true;
    }
  };

  const getLabelSize = (level: AdminLevel): number => {
    switch (level) {
      case 'provinces':
        return 12;
      case 'districts':
        return 9; // Smaller size for districts since there are more of them
      case 'subdistricts':
        return 7;
      default:
        return 12;
    }
  };

  const getDefaultStyle = () => ({
    fillColor: '#ffffff',
    fillOpacity: 0,
    color: getStrokeColor(currentLevel),
    weight: getStrokeWeight(currentLevel),
    opacity: getStrokeOpacity(currentLevel),
  });

  return (
    <div className="w-full h-full bg-white">
      <div
        ref={mapContainerRef}
        className="w-full h-full"
        style={{ minHeight: '400px' }}
      />
    </div>
  );
}