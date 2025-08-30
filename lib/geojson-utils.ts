import {
  AdminLevel,
  ProvinceCollection,
  DistrictCollection,
  SubdistrictCollection,
  RegionCollection,
  GeoJSONFeature,
  GeoJSONFeatureCollection,
  SearchResult,
  ProvinceProperties,
  DistrictProperties,
  SubdistrictProperties,
  RegionProperties,
} from './types';

export class GeoJSONDataManager {
  private data: Map<AdminLevel, GeoJSONFeatureCollection> = new Map();
  private searchIndex: Map<string, SearchResult[]> = new Map();

  async loadGeoJSONData(): Promise<void> {
    const levels: AdminLevel[] = ['provinces', 'districts', 'subdistricts', 'region_royin', 'region_nesdb'];
    
    const loadPromises = levels.map(async (level) => {
      try {
        const response = await fetch(`/data/${level}.geojson`);
        if (!response.ok) {
          throw new Error(`Failed to load ${level}.geojson: ${response.statusText}`);
        }
        const data = await response.json();
        this.data.set(level, data);
        this.buildSearchIndex(level, data);
      } catch (error) {
        console.error(`Error loading ${level} data:`, error);
        throw error;
      }
    });

    await Promise.all(loadPromises);
  }

  getData(level: AdminLevel): GeoJSONFeatureCollection | null {
    return this.data.get(level) || null;
  }

  getAllData(): Map<AdminLevel, GeoJSONFeatureCollection> {
    return new Map(this.data);
  }

  isDataLoaded(): boolean {
    return this.data.size === 5; // All 5 admin levels
  }

  private buildSearchIndex(level: AdminLevel, collection: GeoJSONFeatureCollection): void {
    collection.features.forEach((feature) => {
      const searchTerms = this.extractSearchTerms(feature, level);
      
      searchTerms.forEach((term) => {
        const normalizedTerm = this.normalizeSearchTerm(term);
        if (!this.searchIndex.has(normalizedTerm)) {
          this.searchIndex.set(normalizedTerm, []);
        }
        
        this.searchIndex.get(normalizedTerm)!.push({
          feature,
          level,
          displayName: this.getDisplayName(feature, level),
        });
      });
    });
  }

  private extractSearchTerms(feature: GeoJSONFeature, level: AdminLevel): string[] {
    const props = feature.properties;
    const terms: string[] = [];

    switch (level) {
      case 'provinces':
        const provinceProp = props as ProvinceProperties;
        terms.push(provinceProp.pro_th, provinceProp.pro_en, provinceProp.pro_code);
        break;
      case 'districts':
        const districtProp = props as DistrictProperties;
        terms.push(
          districtProp.amp_th,
          districtProp.amp_en,
          districtProp.amp_code,
          districtProp.pro_th,
          districtProp.pro_en
        );
        break;
      case 'subdistricts':
        const subdistrictProp = props as SubdistrictProperties;
        terms.push(
          subdistrictProp.tam_th,
          subdistrictProp.tam_en,
          subdistrictProp.tam_code,
          subdistrictProp.amp_th,
          subdistrictProp.amp_en,
          subdistrictProp.pro_th,
          subdistrictProp.pro_en
        );
        break;
      case 'region_royin':
      case 'region_nesdb':
        const regionProp = props as RegionProperties;
        if (regionProp.reg_royin) terms.push(regionProp.reg_royin);
        if (regionProp.reg_nesdb) terms.push(regionProp.reg_nesdb);
        break;
    }

    return terms.filter(Boolean);
  }

  private normalizeSearchTerm(term: string): string {
    return term.toLowerCase().trim();
  }

  private getDisplayName(feature: GeoJSONFeature, level: AdminLevel): string {
    const props = feature.properties;

    switch (level) {
      case 'provinces':
        const provinceProp = props as ProvinceProperties;
        return `${provinceProp.pro_th} (${provinceProp.pro_en})`;
      case 'districts':
        const districtProp = props as DistrictProperties;
        return `${districtProp.amp_th}, ${districtProp.pro_th}`;
      case 'subdistricts':
        const subdistrictProp = props as SubdistrictProperties;
        return `${subdistrictProp.tam_th}, ${subdistrictProp.amp_th}, ${subdistrictProp.pro_th}`;
      case 'region_royin':
        return (props as RegionProperties).reg_royin || 'Unknown Region';
      case 'region_nesdb':
        return (props as RegionProperties).reg_nesdb || 'Unknown Region';
      default:
        return 'Unknown';
    }
  }

  search(query: string, limit: number = 20): SearchResult[] {
    if (!query.trim()) return [];

    const normalizedQuery = this.normalizeSearchTerm(query);
    const results: SearchResult[] = [];
    const seen = new Set<string>();

    // Exact matches first
    for (const [term, termResults] of this.searchIndex.entries()) {
      if (term === normalizedQuery) {
        termResults.forEach((result) => {
          const key = `${result.level}-${JSON.stringify(result.feature.properties)}`;
          if (!seen.has(key)) {
            results.push(result);
            seen.add(key);
          }
        });
      }
    }

    // Partial matches
    if (results.length < limit) {
      for (const [term, termResults] of this.searchIndex.entries()) {
        if (term.includes(normalizedQuery) && term !== normalizedQuery) {
          termResults.forEach((result) => {
            const key = `${result.level}-${JSON.stringify(result.feature.properties)}`;
            if (!seen.has(key) && results.length < limit) {
              results.push(result);
              seen.add(key);
            }
          });
        }
      }
    }

    return results.slice(0, limit);
  }

  getFeatureBounds(feature: GeoJSONFeature): [[number, number], [number, number]] {
    const coords = this.extractCoordinates(feature.geometry.coordinates);
    const lats = coords.map((c) => c[1]);
    const lngs = coords.map((c) => c[0]);

    return [
      [Math.min(...lats), Math.min(...lngs)], // Southwest
      [Math.max(...lats), Math.max(...lngs)], // Northeast
    ];
  }

  private extractCoordinates(coords: number[][][] | number[][][][] | number[] | number[][]): [number, number][] {
    const result: [number, number][] = [];

    const flatten = (arr: unknown): void => {
      if (Array.isArray(arr)) {
        if (arr.length === 2 && typeof arr[0] === 'number' && typeof arr[1] === 'number') {
          result.push([arr[0], arr[1]]);
        } else {
          arr.forEach(flatten);
        }
      }
    };

    flatten(coords);
    return result;
  }

  getFeatureCenter(feature: GeoJSONFeature): [number, number] {
    const bounds = this.getFeatureBounds(feature);
    return [
      (bounds[0][0] + bounds[1][0]) / 2, // Average latitude
      (bounds[0][1] + bounds[1][1]) / 2, // Average longitude
    ];
  }

  getStatistics(level: AdminLevel): { count: number; totalArea: number; averageArea: number } {
    const collection = this.data.get(level);
    if (!collection) {
      return { count: 0, totalArea: 0, averageArea: 0 };
    }

    const areas = collection.features.map((f) => Number(f.properties.area_sqkm) || 0);
    const totalArea = areas.reduce((sum, area) => sum + area, 0);
    
    return {
      count: collection.features.length,
      totalArea,
      averageArea: totalArea / collection.features.length,
    };
  }

  getRegionList(level: 'region_royin' | 'region_nesdb'): string[] {
    const collection = this.data.get(level);
    if (!collection) return [];

    const regions = new Set<string>();
    collection.features.forEach((feature) => {
      const regionName = level === 'region_royin' 
        ? (feature.properties as RegionProperties).reg_royin
        : (feature.properties as RegionProperties).reg_nesdb;
      
      if (regionName) {
        regions.add(regionName);
      }
    });

    return Array.from(regions).sort();
  }

  filterFeaturesByRegion(level: AdminLevel, regionName: string): GeoJSONFeature[] {
    const collection = this.data.get(level);
    if (!collection) return [];

    return collection.features.filter((feature) => {
      const props = feature.properties;
      return props.reg_royin === regionName || props.reg_nesdb === regionName;
    });
  }
}

// Utility functions for color generation
export const generateRegionColors = (regions: string[]): Map<string, string> => {
  const colors = [
    '#e74c3c', '#3498db', '#2ecc71', '#f39c12', '#9b59b6',
    '#e67e22', '#1abc9c', '#34495e', '#f1c40f', '#95a5a6'
  ];

  const colorMap = new Map<string, string>();
  regions.forEach((region, index) => {
    colorMap.set(region, colors[index % colors.length]);
  });

  return colorMap;
};

export const generateAreaGradientColor = (area: number, minArea: number, maxArea: number): string => {
  if (maxArea === minArea) return '#3498db';
  
  const normalized = (area - minArea) / (maxArea - minArea);
  const hue = 240 - (normalized * 120); // Blue to red
  
  return `hsl(${hue}, 70%, 50%)`;
};

export const formatArea = (area: number): string => {
  if (area >= 1000) {
    return `${(area / 1000).toFixed(1)}K km²`;
  }
  return `${area.toFixed(1)} km²`;
};

export const formatPerimeter = (perimeter: number): string => {
  if (perimeter >= 1000) {
    return `${(perimeter / 1000).toFixed(1)}K km`;
  }
  return `${perimeter.toFixed(1)} km`;
};