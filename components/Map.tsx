'use client';

import React, { useEffect, useRef, useState, useCallback } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import {
  GeoJSONFeature,
  MapState,
  TooltipData,
  THAILAND_CONFIG,
} from '@/lib/types';
import {
  GeoJSONDataManager,
} from '@/lib/geojson-utils';
import {
  MapStyleManager,
  createTooltipData,
  getHighlightStyle,
  getSelectedStyle,
  getBoundsFromGeoJSON,
} from '@/lib/map-utils';

interface MapProps {
  mapState: MapState;
  onFeatureClick?: (feature: GeoJSONFeature | null) => void;
  onFeatureHover?: (tooltipData: TooltipData | null) => void;
  onMapReady?: () => void;
}

export default function Map({
  mapState,
  onFeatureClick,
  onFeatureHover,
  onMapReady,
}: MapProps) {
  const mapRef = useRef<L.Map | null>(null);
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const currentLayerRef = useRef<L.GeoJSON | null>(null);
  
  const [dataManager] = useState(() => new GeoJSONDataManager());
  const [styleManager] = useState(() => new MapStyleManager());
  const [isMapInitialized, setIsMapInitialized] = useState(false);

  // Initialize map
  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return;

    // Create map
    const map = L.map(mapContainerRef.current, {
      center: THAILAND_CONFIG.center,
      zoom: THAILAND_CONFIG.zoom,
      minZoom: THAILAND_CONFIG.minZoom,
      maxZoom: THAILAND_CONFIG.maxZoom,
      zoomControl: true,
      scrollWheelZoom: true,
      doubleClickZoom: true,
      dragging: true,
    });

    // Add tile layer
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
      maxZoom: 19,
    }).addTo(map);

    // Set max bounds to Thailand region
    const bounds = L.latLngBounds(
      [THAILAND_CONFIG.bounds.south, THAILAND_CONFIG.bounds.west],
      [THAILAND_CONFIG.bounds.north, THAILAND_CONFIG.bounds.east]
    );
    map.setMaxBounds(bounds);

    mapRef.current = map;
    setIsMapInitialized(true);

    // Load data
    dataManager.loadGeoJSONData().then(() => {
      onMapReady?.();
    }).catch((error) => {
      console.error('Failed to load GeoJSON data:', error);
    });

    // Cleanup
    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, [dataManager, onMapReady]);

  // Handle level changes and update map layers
  useEffect(() => {
    if (!isMapInitialized || !mapRef.current || !dataManager.isDataLoaded()) return;

    updateMapLayer();
  }, [mapState.currentLevel, mapState.colorScheme, isMapInitialized]);

  // Handle selected feature highlighting
  useEffect(() => {
    if (!currentLayerRef.current) return;

    // Reset all features to default style
    currentLayerRef.current.eachLayer((layer) => {
      if (layer instanceof L.Path) {
        const feature = (layer as L.Path & { feature?: GeoJSONFeature }).feature;
        if (feature) {
          const style = styleManager.getFeatureStyle(
            feature,
            mapState.currentLevel,
            mapState.colorScheme
          );
          layer.setStyle(style);
        }
      }
    });

    // Highlight selected feature
    if (mapState.selectedFeature) {
      currentLayerRef.current.eachLayer((layer) => {
        if (layer instanceof L.Path) {
          const feature = (layer as L.Path & { feature?: GeoJSONFeature }).feature;
          if (feature === mapState.selectedFeature) {
            layer.setStyle(getSelectedStyle());
          }
        }
      });
    }
  }, [mapState.selectedFeature, styleManager, mapState.currentLevel, mapState.colorScheme]);

  const updateMapLayer = useCallback(() => {
    if (!mapRef.current || !dataManager.isDataLoaded()) return;

    const data = dataManager.getData(mapState.currentLevel);
    if (!data) return;

    // Remove existing layer
    if (currentLayerRef.current) {
      mapRef.current.removeLayer(currentLayerRef.current);
    }

    // Update style manager for this level
    if (mapState.colorScheme === 'by-region') {
      const regions = dataManager.getRegionList(
        mapState.currentLevel.includes('region') 
          ? mapState.currentLevel as 'region_royin' | 'region_nesdb'
          : 'region_royin'
      );
      styleManager.updateRegionColors(regions);
    }

    if (mapState.colorScheme === 'by-area') {
      styleManager.updateAreaRange(data.features);
    }

    // Create new layer
    const layer = L.geoJSON(data, {
      style: (feature) => {
        if (!feature) return {};
        return styleManager.getFeatureStyle(
          feature as GeoJSONFeature,
          mapState.currentLevel,
          mapState.colorScheme
        );
      },
      onEachFeature: (feature, layer) => {
        // Mouse events
        layer.on({
          mouseover: () => {
            (layer as L.Path).setStyle(getHighlightStyle());
            
            // Create tooltip data
            if (onFeatureHover) {
              const center = dataManager.getFeatureCenter(feature as GeoJSONFeature);
              const tooltipData = createTooltipData(
                feature as GeoJSONFeature,
                mapState.currentLevel,
                center
              );
              onFeatureHover(tooltipData);
            }
          },
          mouseout: () => {
            // Reset style unless it's selected
            if (mapState.selectedFeature !== feature) {
              const style = styleManager.getFeatureStyle(
                feature as GeoJSONFeature,
                mapState.currentLevel,
                mapState.colorScheme
              );
              (layer as L.Path).setStyle(style);
            } else {
              (layer as L.Path).setStyle(getSelectedStyle());
            }
            
            if (onFeatureHover) {
              onFeatureHover(null);
            }
          },
          click: () => {
            if (onFeatureClick) {
              onFeatureClick(feature as GeoJSONFeature);
            }
            
            // Fit bounds to feature
            const bounds = getBoundsFromGeoJSON(feature as GeoJSONFeature);
            if (bounds.isValid()) {
              mapRef.current?.fitBounds(bounds, { 
                padding: [20, 20],
                maxZoom: mapState.currentLevel === 'subdistricts' ? 12 : undefined
              });
            }
          },
        });
      },
    });

    layer.addTo(mapRef.current);
    currentLayerRef.current = layer;

    // Fit bounds to data
    const bounds = layer.getBounds();
    if (bounds.isValid()) {
      mapRef.current.fitBounds(bounds, { padding: [10, 10] });
    }
  }, [mapState, dataManager, styleManager, onFeatureClick, onFeatureHover]);

  const fitToFeature = useCallback((feature: GeoJSONFeature) => {
    if (!mapRef.current) return;
    
    const bounds = dataManager.getFeatureBounds(feature);
    const leafletBounds = L.latLngBounds(bounds);
    
    mapRef.current.fitBounds(leafletBounds, { 
      padding: [20, 20],
      maxZoom: mapState.currentLevel === 'subdistricts' ? 12 : undefined
    });
  }, [dataManager, mapState.currentLevel]);

  const zoomToLocation = useCallback((lat: number, lng: number, zoom?: number) => {
    if (!mapRef.current) return;
    
    mapRef.current.setView([lat, lng], zoom || mapRef.current.getZoom());
  }, []);

  // Expose methods to parent component
  useEffect(() => {
    if (mapRef.current) {
      (mapRef.current as L.Map & { thailandMap?: unknown }).thailandMap = {
        fitToFeature,
        zoomToLocation,
        getDataManager: () => dataManager,
        getStyleManager: () => styleManager,
      };
    }
  }, [fitToFeature, zoomToLocation, dataManager, styleManager]);

  return (
    <div className="relative w-full h-full">
      <div
        ref={mapContainerRef}
        className="w-full h-full z-0"
        style={{ minHeight: '400px' }}
      />
      
      {mapState.isLoading && (
        <div className="absolute inset-0 bg-white bg-opacity-75 flex items-center justify-center z-10">
          <div className="flex flex-col items-center space-y-4">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
            <p className="text-gray-600">Loading map data...</p>
          </div>
        </div>
      )}
    </div>
  );
}