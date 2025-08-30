# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

### Development
- `npm run dev` - Start development server with Turbopack (runs on http://localhost:3000)
- `npm run build` - Build for production with Turbopack
- `npm run start` - Start production server
- `npm run lint` - Run ESLint

### Core Architecture

This is a Next.js 15+ application with App Router that displays an interactive map of Thailand with multiple administrative levels. The application currently supports a simplified mapping interface focused on basic coloring functionality.

## Key Components Architecture

### Map System (Two Implementations)
The project contains two different map implementations:
1. **Complex Implementation** (`components/Map.tsx`) - Full-featured with search, color schemes, tooltips
2. **Simple Implementation** (`components/SimpleMap.tsx`) - **Currently Active** - Basic coloring interface

The simple implementation is currently used in `app/page.tsx` and provides:
- Administrative level switching (provinces/districts/subdistricts) 
- Simple color picker with 20 preset colors
- Click to color areas, double-click to remove colors
- Clear all colors functionality
- White background with black borders

### Data Management
- **GeoJSON Data**: Five files in `public/data/` containing Thailand administrative boundaries:
  - `provinces.geojson` (77 provinces)
  - `districts.geojson` (928 districts) 
  - `subdistricts.geojson` (7,367 subdistricts)
  - `region_royin.geojson` & `region_nesdb.geojson` (regional classifications)

### Type System (`lib/types.ts`)
- `AdminLevel` type supports both simple ('provinces' | 'districts' | 'subdistricts') and complex implementations
- Property interfaces define expected GeoJSON data structure:
  - `ProvinceProperties` - pro_code, pro_th, pro_en, reg_nesdb, reg_royin, perimeter, area_sqkm
  - `DistrictProperties` - amp_code, amp_th, amp_en + province data
  - `SubdistrictProperties` - tam_code, tam_th, tam_en + district + province data

### State Management Pattern
The simple implementation uses React state for:
- `selectedColor` - Currently selected color from preset palette
- `currentLevel` - Current administrative level being displayed  
- `areaColors` - Map<string, string> storing area_code -> color mappings
- Colors persist across level changes using area-specific codes (pro_code, amp_code, tam_code)

### Leaflet Integration
- Custom white background using base64 encoded 1x1 white pixel as tile layer
- No external map tiles - pure white background
- Dynamic GeoJSON layer loading based on current administrative level
- Label display strategy: provinces show names, districts show names (smaller font), subdistricts show tooltips only
- Map bounds restricted to Thailand coordinates via THAILAND_CONFIG

### Styling Approach
- Tailwind CSS for UI components
- Custom CSS in `app/globals.css` for Leaflet overrides
- Simple visual design: white background, black borders, colored fills
- Responsive design but optimized for simple desktop usage

## Important Implementation Details

### Data Loading Pattern
```typescript
const response = await fetch(`/data/${currentLevel}.geojson`);
const data = await response.json();
```

### Area Identification
Each administrative level uses different property codes:
- Provinces: `feature.properties.pro_code`
- Districts: `feature.properties.amp_code` 
- Subdistricts: `feature.properties.tam_code`

### Color Management
Colors are stored in a Map with area codes as keys. When switching levels, existing colors are preserved using their respective area codes, allowing users to color different administrative levels independently.

### Performance Considerations
- Subdistricts layer (7,367 features) loads but only shows tooltips, no permanent labels
- Dynamic layer switching removes previous layers before adding new ones
- Label display controlled by `shouldShowLabel()` function to prevent overcrowding

## Development Notes

When modifying the application:
- The simple map implementation is currently active - changes to the complex `Map.tsx` won't be visible
- GeoJSON property access should always use `Number()` conversion for numeric values due to TypeScript strict typing
- New administrative levels require updates to both the `AdminLevel` type and the data loading logic
- Label display decisions should consider performance with large datasets (7,367+ features)