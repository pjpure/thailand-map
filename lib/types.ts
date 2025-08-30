export interface GeoJSONProperties {
  [key: string]: string | number | boolean | null | undefined;
}

export interface ProvinceProperties extends GeoJSONProperties {
  pro_code: string;
  pro_th: string;
  pro_en: string;
  reg_nesdb: string;
  reg_royin: string;
  perimeter: number;
  area_sqkm: number;
}

export interface DistrictProperties extends GeoJSONProperties {
  amp_code: string;
  amp_th: string;
  amp_en: string;
  pro_code: string;
  pro_th: string;
  pro_en: string;
  reg_nesdb: string;
  reg_royin: string;
  perimeter: number;
  area_sqkm: number;
}

export interface SubdistrictProperties extends GeoJSONProperties {
  tam_code: string;
  tam_th: string;
  tam_en: string;
  amp_code: string;
  amp_th: string;
  amp_en: string;
  pro_code: string;
  pro_th: string;
  pro_en: string;
  reg_nesdb: string;
  reg_royin: string;
  perimeter: number;
  area_sqkm: number;
}

export interface RegionProperties extends GeoJSONProperties {
  reg_royin?: string;
  reg_nesdb?: string;
  perimeter: number;
  area_sqkm: number;
}

export interface GeoJSONGeometry {
  type:
    | "Polygon"
    | "MultiPolygon"
    | "Point"
    | "LineString"
    | "MultiLineString"
    | "MultiPoint";
  coordinates: number[][][] | number[][][][] | number[] | number[][];
}

export interface GeoJSONFeature<T = GeoJSONProperties> {
  type: "Feature";
  properties: T;
  geometry: GeoJSONGeometry;
}

export interface GeoJSONFeatureCollection<T = GeoJSONProperties> {
  type: "FeatureCollection";
  name: string;
  crs: {
    type: string;
    properties: { name: string };
  };
  features: GeoJSONFeature<T>[];
}

export type ProvinceFeature = GeoJSONFeature<ProvinceProperties>;
export type DistrictFeature = GeoJSONFeature<DistrictProperties>;
export type SubdistrictFeature = GeoJSONFeature<SubdistrictProperties>;
export type RegionFeature = GeoJSONFeature<RegionProperties>;

export type ProvinceCollection = GeoJSONFeatureCollection<ProvinceProperties>;
export type DistrictCollection = GeoJSONFeatureCollection<DistrictProperties>;
export type SubdistrictCollection =
  GeoJSONFeatureCollection<SubdistrictProperties>;
export type RegionCollection = GeoJSONFeatureCollection<RegionProperties>;

export type AdminLevel =
  | "provinces"
  | "districts"
  | "subdistricts"
  | "region_royin"
  | "region_nesdb";

export interface MapState {
  currentLevel: AdminLevel;
  selectedFeature: GeoJSONFeature | null;
  searchTerm: string;
  colorScheme: ColorScheme;
  isLoading: boolean;
}

export type ColorScheme = "by-region" | "by-area" | "custom" | "monochrome";

export interface ColorSchemeOption {
  id: ColorScheme;
  name: string;
  description: string;
}

export interface SearchResult {
  feature: GeoJSONFeature;
  level: AdminLevel;
  displayName: string;
}

export interface MapBounds {
  north: number;
  south: number;
  east: number;
  west: number;
}

export interface TooltipData {
  name_th: string;
  name_en: string;
  area: number;
  perimeter: number;
  code: string;
  position: [number, number];
}

export interface LayerStyle {
  fillColor: string;
  fillOpacity: number;
  color: string;
  weight: number;
  opacity: number;
}

export interface MapConfig {
  center: [number, number];
  zoom: number;
  minZoom: number;
  maxZoom: number;
  bounds: MapBounds;
}

export const THAILAND_CONFIG: MapConfig = {
  center: [13.7563, 100.5018] as [number, number],
  zoom: 6,
  minZoom: 5,
  maxZoom: 15,
  bounds: {
    north: 20.4634,
    south: 5.6126,
    east: 105.6369,
    west: 97.3758,
  },
};

export const COLOR_SCHEMES: ColorSchemeOption[] = [
  {
    id: "by-region",
    name: "By Region",
    description: "Different colors for each region",
  },
  {
    id: "by-area",
    name: "By Area",
    description: "Gradient based on area size",
  },
  {
    id: "custom",
    name: "Custom",
    description: "Manual color selection",
  },
  {
    id: "monochrome",
    name: "Monochrome",
    description: "Single color with borders",
  },
];

export const ADMIN_LEVELS: { value: AdminLevel; label: string }[] = [
  { value: "provinces", label: "Provinces (77 จังหวัด)" },
  { value: "districts", label: "Districts (928 อำเภอ)" },
  { value: "subdistricts", label: "Subdistricts (7,367 ตำบล)" },
  { value: "region_royin", label: "Regions ROYIN (7 ภูมิภาค)" },
  { value: "region_nesdb", label: "Regions NESDB (6 ภูมิภาค)" },
];
