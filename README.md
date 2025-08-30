# Interactive Thailand Map

A comprehensive Next.js application that displays an interactive map of Thailand with multi-level administrative divisions, featuring customizable visualizations and advanced search capabilities.

## Features

### 🗺️ Multi-Level Map Display
- **Provinces** (77 จังหวัด) - Thailand's 77 provinces
- **Districts** (928 อำเภอ) - Administrative districts 
- **Subdistricts** (7,367 ตำบล) - Local subdistricts
- **Regions** - Both ROYIN (7 regions) and NESDB (6 regions) classifications

### 🎨 Interactive Visualization
- **Multiple Color Schemes**:
  - By Region - Different colors for each geographical region
  - By Area Size - Gradient based on area size
  - Custom Colors - Manual color assignment
  - Monochrome - Single color with borders
- **Real-time Style Updates** - Change visualizations on the fly
- **Smooth Transitions** - Animated level switching

### 🔍 Advanced Search & Navigation
- **Intelligent Search** - Find provinces, districts, or subdistricts
- **Auto-complete** - Smart suggestions with keyboard navigation
- **Multi-level Results** - Search across all administrative levels
- **Click to Navigate** - Zoom to selected areas automatically

### 📱 Responsive Design
- **Mobile-First** - Optimized for all screen sizes
- **Touch-Friendly** - Mobile gesture support
- **Adaptive UI** - Different layouts for desktop and mobile
- **Performance Optimized** - Efficient rendering of large datasets

### ℹ️ Rich Information Display
- **Hover Tooltips** - Detailed area information on hover
- **Area Statistics** - Size, perimeter, and administrative codes
- **Bilingual Support** - Thai and English names
- **Region Classification** - Multiple regional groupings

## Technology Stack

- **Framework**: Next.js 14+ with App Router
- **Language**: TypeScript for type safety
- **Mapping**: Leaflet.js for interactive maps
- **Styling**: Tailwind CSS for modern UI
- **Icons**: Lucide React for consistent iconography

## Getting Started

### Prerequisites
- Node.js 18+ 
- npm or yarn package manager

### Installation

1. **Clone and setup**:
   ```bash
   git clone <repository-url>
   cd thailand-map
   npm install
   ```

2. **Ensure data files are in place**:
   ```
   public/data/
   ├── provinces.geojson
   ├── districts.geojson
   ├── subdistricts.geojson
   ├── region_royin.geojson
   └── region_nesdb.geojson
   ```

3. **Start development server**:
   ```bash
   npm run dev
   ```

4. **Open your browser**:
   Navigate to [http://localhost:3000](http://localhost:3000)

## Project Structure

```
thailand-map/
├── app/                    # Next.js App Router
│   ├── page.tsx           # Main application page
│   ├── layout.tsx         # Root layout
│   └── globals.css        # Global styles and Leaflet customization
├── components/            # React components
│   ├── Map.tsx           # Main map component with Leaflet
│   ├── ControlPanel.tsx  # Administrative level and settings controls
│   ├── SearchBar.tsx     # Advanced search with autocomplete
│   ├── ColorPicker.tsx   # Color scheme selection and customization
│   └── Tooltip.tsx       # Information tooltips and mobile display
├── lib/                  # Utilities and types
│   ├── types.ts          # TypeScript type definitions
│   ├── geojson-utils.ts  # GeoJSON data processing utilities
│   └── map-utils.ts      # Map styling and interaction utilities
├── public/data/          # GeoJSON data files
└── package.json          # Dependencies and scripts
```

## Usage Guide

### Navigation
- **Administrative Levels**: Use the dropdown to switch between provinces, districts, subdistricts, and regions
- **Search**: Type to find specific locations across all levels
- **Map Interaction**: Click and drag to pan, scroll to zoom
- **Feature Selection**: Click on any area to select and zoom to it

### Color Customization
- **By Region**: Automatically colors areas by their regional classification
- **By Area Size**: Creates a gradient from smallest to largest areas
- **Custom Colors**: Select colors manually (click features after choosing a color)
- **Monochrome**: Simple single-color display

### Mobile Usage
- **Sidebar Toggle**: Use hamburger menu to show/hide controls
- **Touch Navigation**: Pinch to zoom, drag to pan
- **Bottom Tooltips**: Feature information appears at screen bottom
- **Responsive Controls**: Adapted interface for smaller screens

## Data Format

The application expects GeoJSON files with specific property structures:

### Provinces
```json
{
  "pro_code": "10",
  "pro_th": "กรุงเทพมหานคร",
  "pro_en": "Bangkok",
  "reg_nesdb": "Central",
  "reg_royin": "Central",
  "perimeter": 566.12,
  "area_sqkm": 1568.737
}
```

### Districts
```json
{
  "amp_code": "1001",
  "amp_th": "พระนคร", 
  "amp_en": "Phra Nakhon",
  "pro_code": "10",
  "pro_th": "กรุงเทพมหานคร",
  "pro_en": "Bangkok",
  "reg_nesdb": "Central",
  "reg_royin": "Central",
  "perimeter": 23.45,
  "area_sqkm": 12.348
}
```

### Subdistricts  
```json
{
  "tam_code": "100101",
  "tam_th": "พระบรมมหาราชวัง",
  "tam_en": "Phra Borom Maha Ratchawang",
  "amp_code": "1001",
  "amp_th": "พระนคร",
  "amp_en": "Phra Nakhon", 
  "pro_code": "10",
  "pro_th": "กรุงเทพมหานคร",
  "pro_en": "Bangkok",
  "reg_nesdb": "Central", 
  "reg_royin": "Central",
  "perimeter": 5.19,
  "area_sqkm": 1.375
}
```

## Performance Considerations

### Large Dataset Handling
- **Efficient GeoJSON Processing**: Optimized parsing and indexing
- **Search Index**: Pre-built search index for fast queries
- **Lazy Loading**: Map tiles loaded on demand
- **Memory Management**: Efficient layer switching without memory leaks

### Mobile Optimization
- **Responsive Breakpoints**: Tailored for different screen sizes
- **Touch Interactions**: Optimized gesture handling
- **Battery Efficiency**: Reduced unnecessary re-renders
- **Data Loading**: Progressive enhancement for slower connections

## Customization

### Adding New Data
1. Place GeoJSON files in `public/data/`
2. Update `AdminLevel` type in `lib/types.ts`
3. Add level configuration in `ADMIN_LEVELS` array
4. Update data loading logic in `GeoJSONDataManager`

### Custom Color Schemes
1. Add new scheme to `ColorScheme` type
2. Implement logic in `MapStyleManager`
3. Update UI in `ColorPicker` component

### New Features
- Extend `MapState` interface for new properties
- Add UI components in `components/` directory
- Implement logic in utility files

## API Reference

### Core Components

#### Map Component
```tsx
<Map
  mapState={MapState}
  onFeatureClick={(feature) => void}
  onFeatureHover={(tooltipData) => void}
  onMapReady={() => void}
  onLevelChange={(level) => void}
/>
```

#### GeoJSONDataManager
```typescript
const dataManager = new GeoJSONDataManager();
await dataManager.loadGeoJSONData();
const results = dataManager.search(query, limit);
const bounds = dataManager.getFeatureBounds(feature);
```

#### MapStyleManager  
```typescript
const styleManager = new MapStyleManager();
styleManager.updateRegionColors(regions);
const style = styleManager.getFeatureStyle(feature, level, scheme);
```

## Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/amazing-feature`
3. Commit your changes: `git commit -m 'Add amazing feature'`
4. Push to the branch: `git push origin feature/amazing-feature`
5. Open a Pull Request

## License

This project is open source and available under the [MIT License](LICENSE).

## Support

For questions, issues, or contributions:
- Create an issue on GitHub
- Check existing documentation
- Review the code comments for detailed implementation notes

---

Built with ❤️ for exploring Thailand's administrative geography.