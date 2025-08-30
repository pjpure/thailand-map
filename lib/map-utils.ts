import L from 'leaflet';
import {
  GeoJSONFeature,
  LayerStyle,
  ColorScheme,
  AdminLevel,
  TooltipData,
  ProvinceProperties,
  DistrictProperties,
  SubdistrictProperties,
  RegionProperties,
} from './types';
import { generateRegionColors, generateAreaGradientColor, formatArea, formatPerimeter } from './geojson-utils';

export const getDefaultStyle = (colorScheme: ColorScheme = 'monochrome'): LayerStyle => {
  switch (colorScheme) {
    case 'monochrome':
      return {
        fillColor: '#3498db',
        fillOpacity: 0.6,
        color: '#2c3e50',
        weight: 1,
        opacity: 0.8,
      };
    case 'by-region':
    case 'by-area':
    case 'custom':
      return {
        fillColor: '#3498db',
        fillOpacity: 0.6,
        color: '#2c3e50',
        weight: 1,
        opacity: 0.8,
      };
    default:
      return {
        fillColor: '#3498db',
        fillOpacity: 0.6,
        color: '#2c3e50',
        weight: 1,
        opacity: 0.8,
      };
  }
};

export const getHighlightStyle = (): Partial<LayerStyle> => ({
  fillOpacity: 0.8,
  weight: 3,
  color: '#e74c3c',
  opacity: 1,
});

export const getSelectedStyle = (): Partial<LayerStyle> => ({
  fillOpacity: 0.9,
  weight: 4,
  color: '#f39c12',
  opacity: 1,
});

export class MapStyleManager {
  private regionColors: Map<string, string> = new Map();
  private areaRange: { min: number; max: number } = { min: 0, max: 0 };
  private customColors: Map<string, string> = new Map();

  updateRegionColors(regions: string[]): void {
    this.regionColors = generateRegionColors(regions);
  }

  updateAreaRange(features: GeoJSONFeature[]): void {
    const areas = features.map(f => Number(f.properties.area_sqkm) || 0);
    this.areaRange = {
      min: Math.min(...areas),
      max: Math.max(...areas),
    };
  }

  setCustomColor(featureId: string, color: string): void {
    this.customColors.set(featureId, color);
  }

  clearCustomColors(): void {
    this.customColors.clear();
  }

  getFeatureStyle(
    feature: GeoJSONFeature,
    level: AdminLevel,
    colorScheme: ColorScheme
  ): LayerStyle {
    const baseStyle = getDefaultStyle(colorScheme);
    const featureId = this.getFeatureId(feature, level);

    switch (colorScheme) {
      case 'by-region':
        const region = this.getRegionName(feature);
        const regionColor = region ? this.regionColors.get(region) : null;
        return {
          ...baseStyle,
          fillColor: regionColor || baseStyle.fillColor,
        };

      case 'by-area':
        const area = Number(feature.properties.area_sqkm) || 0;
        const areaColor = generateAreaGradientColor(
          area,
          this.areaRange.min,
          this.areaRange.max
        );
        return {
          ...baseStyle,
          fillColor: areaColor,
        };

      case 'custom':
        const customColor = this.customColors.get(featureId);
        return {
          ...baseStyle,
          fillColor: customColor || baseStyle.fillColor,
        };

      case 'monochrome':
      default:
        return baseStyle;
    }
  }

  private getFeatureId(feature: GeoJSONFeature, level: AdminLevel): string {
    const props = feature.properties;
    
    switch (level) {
      case 'provinces':
        return (props as ProvinceProperties).pro_code;
      case 'districts':
        return (props as DistrictProperties).amp_code;
      case 'subdistricts':
        return (props as SubdistrictProperties).tam_code;
      case 'region_royin':
        return (props as RegionProperties).reg_royin || 'unknown';
      case 'region_nesdb':
        return (props as RegionProperties).reg_nesdb || 'unknown';
      default:
        return 'unknown';
    }
  }

  private getRegionName(feature: GeoJSONFeature): string | null {
    const props = feature.properties;
    
    // Try reg_royin first, then reg_nesdb
    if (props.reg_royin) return String(props.reg_royin);
    if (props.reg_nesdb) return String(props.reg_nesdb);
    
    return null;
  }
}

export const createTooltipData = (
  feature: GeoJSONFeature,
  level: AdminLevel,
  position: [number, number]
): TooltipData => {
  const props = feature.properties;
  
  let name_th: string, name_en: string, code: string;

  switch (level) {
    case 'provinces':
      const provinceProp = props as ProvinceProperties;
      name_th = provinceProp.pro_th;
      name_en = provinceProp.pro_en;
      code = provinceProp.pro_code;
      break;
    case 'districts':
      const districtProp = props as DistrictProperties;
      name_th = `${districtProp.amp_th}, ${districtProp.pro_th}`;
      name_en = `${districtProp.amp_en}, ${districtProp.pro_en}`;
      code = districtProp.amp_code;
      break;
    case 'subdistricts':
      const subdistrictProp = props as SubdistrictProperties;
      name_th = `${subdistrictProp.tam_th}, ${subdistrictProp.amp_th}`;
      name_en = `${subdistrictProp.tam_en}, ${subdistrictProp.amp_en}`;
      code = subdistrictProp.tam_code;
      break;
    case 'region_royin':
      const royinProp = props as RegionProperties;
      name_th = royinProp.reg_royin || 'Unknown Region';
      name_en = royinProp.reg_royin || 'Unknown Region';
      code = 'REG-R';
      break;
    case 'region_nesdb':
      const nesdbProp = props as RegionProperties;
      name_th = nesdbProp.reg_nesdb || 'Unknown Region';
      name_en = nesdbProp.reg_nesdb || 'Unknown Region';
      code = 'REG-N';
      break;
    default:
      name_th = 'Unknown';
      name_en = 'Unknown';
      code = 'UNK';
  }

  return {
    name_th,
    name_en,
    area: Number(props.area_sqkm) || 0,
    perimeter: Number(props.perimeter) || 0,
    code,
    position,
  };
};

export const formatTooltipContent = (data: TooltipData): string => {
  return `
    <div class="tooltip-content">
      <div class="tooltip-title">${data.name_th}</div>
      <div class="tooltip-subtitle">${data.name_en}</div>
      <hr class="tooltip-divider">
      <div class="tooltip-info">
        <div class="tooltip-row">
          <span class="tooltip-label">Area:</span>
          <span class="tooltip-value">${formatArea(data.area)}</span>
        </div>
        <div class="tooltip-row">
          <span class="tooltip-label">Perimeter:</span>
          <span class="tooltip-value">${formatPerimeter(data.perimeter)}</span>
        </div>
        <div class="tooltip-row">
          <span class="tooltip-label">Code:</span>
          <span class="tooltip-value">${data.code}</span>
        </div>
      </div>
    </div>
  `;
};

export const createLeafletIcon = (iconName: string, color: string = '#3498db'): L.DivIcon => {
  return L.divIcon({
    html: `<div style="color: ${color}; font-size: 16px;">${iconName}</div>`,
    iconSize: [20, 20],
    className: 'custom-div-icon',
  });
};

export const getBoundsFromGeoJSON = (geojson: GeoJSONFeature): L.LatLngBounds => {
  const layer = L.geoJSON(geojson);
  return layer.getBounds();
};

export const calculateOptimalZoom = (
  bounds: L.LatLngBounds,
  mapSize: { width: number; height: number }
): number => {
  const WORLD_DIM = { height: 256, width: 256 };
  const ZOOM_MAX = 18;

  function latRad(lat: number): number {
    const sin = Math.sin(lat * Math.PI / 180);
    const radX2 = Math.log((1 + sin) / (1 - sin)) / 2;
    return Math.max(Math.min(radX2, Math.PI), -Math.PI) / 2;
  }

  function zoom(mapPx: number, worldPx: number, fraction: number): number {
    return Math.floor(Math.log(mapPx / worldPx / fraction) / Math.LN2);
  }

  const ne = bounds.getNorthEast();
  const sw = bounds.getSouthWest();

  const latFraction = (latRad(ne.lat) - latRad(sw.lat)) / Math.PI;
  const lngDiff = ne.lng - sw.lng;
  const lngFraction = ((lngDiff < 0) ? (lngDiff + 360) : lngDiff) / 360;

  const latZoom = zoom(mapSize.height, WORLD_DIM.height, latFraction);
  const lngZoom = zoom(mapSize.width, WORLD_DIM.width, lngFraction);

  return Math.min(latZoom, lngZoom, ZOOM_MAX);
};

export const isPointInThailand = (lat: number, lng: number): boolean => {
  // Rough bounds of Thailand
  return lat >= 5.61 && lat <= 20.46 && lng >= 97.38 && lng <= 105.64;
};