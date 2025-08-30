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
  selectedDistricts?: string[]; // Array of district codes to filter subdistricts
  borderColor?: string; // Custom border color
  showAreaNames?: boolean; // Toggle for showing/hiding area names
}

export default function SimpleMap({
  selectedColor,
  currentLevel,
  areaColors,
  onAreaColorsChange,
  onMapReady,
  selectedProvinces = [],
  selectedDistricts = [],
  borderColor = '#000000',
  showAreaNames = true
}: SimpleMapProps) {
  const mapRef = useRef<L.Map | null>(null);
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const currentLayerRef = useRef<L.GeoJSON | null>(null);
  const labelsLayerRef = useRef<L.LayerGroup | null>(null);
  const provinceBordersRef = useRef<L.GeoJSON | null>(null);
  const districtBordersRef = useRef<L.GeoJSON | null>(null);
  const selectedColorRef = useRef<string>(selectedColor);
  const areaColorsRef = useRef<Map<string, string>>(areaColors);
  const currentLevelRef = useRef<AdminLevel>(currentLevel);

  // Update refs when props change
  useEffect(() => {
    selectedColorRef.current = selectedColor;
  }, [selectedColor]);

  useEffect(() => {
    areaColorsRef.current = areaColors;
  }, [areaColors]);

  useEffect(() => {
    currentLevelRef.current = currentLevel;
  }, [currentLevel]);

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
      doubleClickZoom: false,
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

    // Add zoom event listener to update labels when zoom changes
    map.on('zoomend', () => {
      if (labelsLayerRef.current) {
        labelsLayerRef.current.eachLayer((labelLayer: any) => {
          const marker = labelLayer as L.Marker;
          const icon = marker.getIcon() as L.DivIcon;
          const currentHtml = icon.options.html;

          if (typeof currentHtml === 'string') {
            const areaNameMatch = currentHtml.match(/>(.*?)<\/div>/);
            if (areaNameMatch) {
              const areaName = areaNameMatch[1];
              const newLabelSize = getLabelSize(currentLevelRef.current);
              const newHtml = `<div style="color: #000; font-size: ${newLabelSize}px; font-weight: bold; text-align: center; pointer-events: none; text-shadow: 1px 1px 2px rgba(255,255,255,0.8);">${areaName}</div>`;

              const newIcon = L.divIcon({
                className: 'area-label',
                html: newHtml,
                iconSize: [120, 24],
                iconAnchor: [60, 12]
              });
              marker.setIcon(newIcon);
            }
          }
        });
      }
    });

    return () => {
      if (mapRef.current) {
        removeProvinceBorders();
        removeDistrictBorders();
        mapRef.current.off('zoomend');
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, []);

  // Load data when level changes or selected provinces/districts change
  useEffect(() => {
    if (!mapRef.current) return;
    loadLevelData();
  }, [currentLevel, selectedProvinces, selectedDistricts]);

  // Update colors when areaColors changes
  useEffect(() => {
    updateLayerColors();
  }, [areaColors]);

  // Update labels when showAreaNames changes
  useEffect(() => {
    if (!mapRef.current || !labelsLayerRef.current || !currentLayerRef.current) return;

    if (showAreaNames) {
      // Show labels immediately by recreating them from current layer
      labelsLayerRef.current.clearLayers();
      currentLayerRef.current.eachLayer((layer: any) => {
        if (layer.feature && layer.feature.properties) {
          const areaName = getAreaName(layer.feature, currentLevel);

          if (shouldShowLabel(currentLevel)) {
            const labelPosition = (layer as any).getBounds().getCenter();
            const labelSize = getLabelSize(currentLevel);
            const marker = L.marker(labelPosition, {
              icon: L.divIcon({
                className: 'area-label',
                html: `<div style="color: #000; font-size: ${labelSize}px; font-weight: bold; text-align: center; pointer-events: none; text-shadow: 1px 1px 2px rgba(255,255,255,0.8);">${areaName}</div>`,
                iconSize: [120, 24],
                iconAnchor: [60, 12]
              })
            });
            labelsLayerRef.current!.addLayer(marker);
          }
        }
      });
    } else {
      // Hide all labels immediately
      labelsLayerRef.current.clearLayers();
    }
  }, [showAreaNames]);

  // Update border colors when borderColor changes
  useEffect(() => {
    updateLayerColors();
    // Also update province borders if they exist
    if (currentLevel === 'districts' && provinceBordersRef.current && mapRef.current) {
      provinceBordersRef.current.setStyle({
        color: borderColor,
        weight: 2,
        opacity: 1,
      });
    }
    // Also update district borders if they exist
    if (currentLevel === 'subdistricts' && districtBordersRef.current && mapRef.current) {
      districtBordersRef.current.setStyle({
        color: borderColor,
        weight: 2,
        opacity: 1,
      });
    }
  }, [borderColor]);

  const loadLevelData = async () => {
    try {
      const response = await fetch(`/data/${currentLevel}.geojson`);
      const data = await response.json();

      if (mapRef.current) {
        displayAreas(data);
        // Load borders overlay based on level
        if (currentLevel === 'districts') {
          await loadProvinceBorders();
          removeDistrictBorders();
        } else if (currentLevel === 'subdistricts') {
          await loadDistrictBorders();
          removeProvinceBorders();
        } else {
          removeProvinceBorders();
          removeDistrictBorders();
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

        // Add province borders with custom color
        const provinceBordersLayer = L.geoJSON(filteredProvincesData, {
          style: () => ({
            fillColor: 'transparent',
            fillOpacity: 0,
            color: borderColor, // Use custom border color
            weight: 2,
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

  const loadDistrictBorders = async () => {
    try {
      const response = await fetch('/data/districts.geojson');
      const districtsData = await response.json();

      if (mapRef.current) {
        // Remove existing district borders
        removeDistrictBorders();

        // Filter districts based on selection
        let filteredDistrictsData = districtsData;
        if (selectedDistricts.length > 0) {
          filteredDistrictsData = {
            ...districtsData,
            features: districtsData.features.filter((feature: any) =>
              selectedDistricts.includes(feature.properties.amp_code)
            )
          };
        }

        // Add district borders with custom color
        const districtBordersLayer = L.geoJSON(filteredDistrictsData, {
          style: () => ({
            fillColor: 'transparent',
            fillOpacity: 0,
            color: borderColor, // Use custom border color
            weight: 2,
            opacity: 1,
          }),
          interactive: false // Make it non-interactive so clicks go through to subdistricts
        });

        districtBordersLayer.addTo(mapRef.current);
        districtBordersRef.current = districtBordersLayer;
      }
    } catch (error) {
      console.error('Error loading district borders:', error);
    }
  };

  const removeDistrictBorders = () => {
    if (districtBordersRef.current && mapRef.current) {
      mapRef.current.removeLayer(districtBordersRef.current);
      districtBordersRef.current = null;
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

    // Filter data based on selected districts for subdistricts level
    if (currentLevel === 'subdistricts' && selectedDistricts.length > 0) {
      filteredData = {
        ...geojsonData,
        features: geojsonData.features.filter((feature: any) =>
          selectedDistricts.includes(feature.properties.amp_code)
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
              // Calculate polygon centroid using proper geometry
              const geoJsonLayer = layer as L.GeoJSON;

              // Check if it's a Polygon or MultiPolygon
              if (feature.geometry.type === 'Polygon') {
                const coordinates = feature.geometry.coordinates[0]; // Get outer ring

                // Calculate true polygon centroid using shoelace formula
                let area = 0;
                let centroidLng = 0;
                let centroidLat = 0;

                for (let i = 0; i < coordinates.length - 1; i++) {
                  const x0 = coordinates[i][0];
                  const y0 = coordinates[i][1];
                  const x1 = coordinates[i + 1][0];
                  const y1 = coordinates[i + 1][1];

                  const a = x0 * y1 - x1 * y0;
                  area += a;
                  centroidLng += (x0 + x1) * a;
                  centroidLat += (y0 + y1) * a;
                }

                area *= 0.5;
                centroidLng /= (6 * area);
                centroidLat /= (6 * area);

                labelPosition = L.latLng(centroidLat, centroidLng);

              } else if (feature.geometry.type === 'MultiPolygon') {
                // For MultiPolygon, use the largest polygon's centroid
                const polygons = feature.geometry.coordinates;
                let largestPolygon = polygons[0];
                let maxArea = 0;

                // Find the largest polygon by approximate area
                for (const polygon of polygons) {
                  const coords = polygon[0];
                  const area = Math.abs(coords.reduce((acc: number, curr: number[], i: number) => {
                    const next = coords[(i + 1) % coords.length];
                    return acc + (curr[0] * next[1] - next[0] * curr[1]);
                  }, 0)) / 2;

                  if (area > maxArea) {
                    maxArea = area;
                    largestPolygon = polygon;
                  }
                }

                const coordinates = largestPolygon[0];

                // Calculate true polygon centroid for the largest polygon
                let area = 0;
                let centroidLng = 0;
                let centroidLat = 0;

                for (let i = 0; i < coordinates.length - 1; i++) {
                  const x0 = coordinates[i][0];
                  const y0 = coordinates[i][1];
                  const x1 = coordinates[i + 1][0];
                  const y1 = coordinates[i + 1][1];

                  const a = x0 * y1 - x1 * y0;
                  area += a;
                  centroidLng += (x0 + x1) * a;
                  centroidLat += (y0 + y1) * a;
                }

                area *= 0.5;
                centroidLng /= (6 * area);
                centroidLat /= (6 * area);

                labelPosition = L.latLng(centroidLat, centroidLng);

              } else {
                // Fallback to bounds center for other geometry types
                labelPosition = (geoJsonLayer as any).getBounds().getCenter();
              }
            } catch (error) {
              // Fallback to bounds center if centroid calculation fails
              console.warn('Centroid calculation failed, using bounds center:', error);
              labelPosition = (layer as any).getBounds().getCenter();
            }

            const labelSize = getLabelSize(currentLevel);
            const marker = L.marker(labelPosition, {
              icon: L.divIcon({
                className: 'area-label',
                html: `<div style="color: #000; font-size: ${labelSize}px; font-weight: bold; text-align: center; pointer-events: none; text-shadow: 1px 1px 2px rgba(255,255,255,0.8);">${areaName}</div>`,
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
        return 1;
      case 'districts':
        return 1;
      case 'subdistricts':
        return 1;
      default:
        return 1;
    }
  };

  const getStrokeColor = (level: AdminLevel): string => {
    // Use custom border color for all levels
    return borderColor;
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
    if (!showAreaNames) return false; // Hide labels if toggle is off

    switch (level) {
      case 'provinces':
        return true;
      case 'districts':
        return true; // Show district names too
      case 'subdistricts':
        // Show subdistrict names only when district filter is active (reduces clutter)
        return selectedDistricts.length > 0;
      default:
        return true;
    }
  };

  const getLabelSize = (level: AdminLevel): number => {
    if (!mapRef.current) return 10;

    const zoom = mapRef.current.getZoom();
    const baseSize = (() => {
      switch (level) {
        case 'provinces':
          return 8;
        case 'districts':
          return 4;
        case 'subdistricts':
          return 4;
        default:
          return 6;
      }
    })();

    // Scale font size more aggressively with zoom level
    const zoomFactor = Math.max(0.6, Math.min(3, zoom / 6));
    return Math.round(baseSize * zoomFactor);
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