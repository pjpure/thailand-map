"use client";

import React, { useState, useEffect } from "react";
import dynamic from "next/dynamic";
import {
  Palette,
  Layers,
  RotateCcw,
  Search,
  X,
  ChevronDown,
  Eye,
  EyeOff,
} from "lucide-react";

// Dynamically import Map component to avoid SSR issues with Leaflet
const SimpleMap = dynamic(() => import("@/components/SimpleMap"), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full bg-white flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-800 mx-auto mb-4"></div>
        <p className="text-gray-600">กำลังโหลดแผนที่...</p>
      </div>
    </div>
  ),
});

type AdminLevel = "provinces" | "districts" | "subdistricts";

const ADMIN_LEVELS: { value: AdminLevel; label: string }[] = [
  { value: "provinces", label: "จังหวัด (77)" },
  { value: "districts", label: "อำเภอ (928)" },
  { value: "subdistricts", label: "ตำบล (7,367)" },
];

type ProvinceItem = { code: string; name: string };
type DistrictItem = { code: string; name: string; provinceCode: string };

// localStorage functions
const PALETTE_STORAGE_KEY = "thailand-map-palette";
const SELECTED_COLOR_STORAGE_KEY = "thailand-map-selected-color";

const getStoredPalette = (): string[] => {
  if (typeof window === "undefined")
    return ["#ff3b30", "#34c759", "#007aff", "#ffcc00", "#8e8e93"];
  const stored = localStorage.getItem(PALETTE_STORAGE_KEY);
  if (stored) {
    try {
      return JSON.parse(stored);
    } catch (e) {
      console.warn("Error parsing stored palette:", e);
    }
  }
  return ["#ff3b30", "#34c759", "#007aff", "#ffcc00", "#8e8e93"]; // Default palette
};

const getStoredSelectedColor = (defaultPalette: string[]): string => {
  if (typeof window === "undefined") return defaultPalette[0];
  const stored = localStorage.getItem(SELECTED_COLOR_STORAGE_KEY);
  if (stored && defaultPalette.includes(stored)) {
    return stored;
  }
  return defaultPalette[0];
};

const savePalette = (palette: string[]) => {
  if (typeof window !== "undefined") {
    localStorage.setItem(PALETTE_STORAGE_KEY, JSON.stringify(palette));
  }
};

const saveSelectedColor = (color: string) => {
  if (typeof window !== "undefined") {
    localStorage.setItem(SELECTED_COLOR_STORAGE_KEY, color);
  }
};

export default function Home() {
  // Initialize with default values to avoid hydration mismatch
  const defaultPalette = [
    "#ff3b30",
    "#34c759",
    "#007aff",
    "#ffcc00",
    "#8e8e93",
  ];
  const [palette, setPalette] = useState<string[]>(defaultPalette);
  const [selectedColor, setSelectedColor] = useState(defaultPalette[0]);
  const [isHydrated, setIsHydrated] = useState(false);

  // Load from localStorage after hydration to avoid SSR mismatch
  useEffect(() => {
    const storedPalette = getStoredPalette();
    const storedSelectedColor = getStoredSelectedColor(storedPalette);

    setPalette(storedPalette);
    setSelectedColor(storedSelectedColor);
    setIsHydrated(true);
  }, []);

  const [currentLevel, setCurrentLevel] = useState<AdminLevel>("provinces");
  const [isLoading, setIsLoading] = useState(true);
  const [areaColors, setAreaColors] = useState<Map<string, string>>(new Map());
  const [selectedProvinces, setSelectedProvinces] = useState<string[]>([]);
  const [availableProvinces, setAvailableProvinces] = useState<ProvinceItem[]>(
    []
  );
  const [searchTerm, setSearchTerm] = useState("");
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  // District selection for subdistricts level
  const [selectedDistricts, setSelectedDistricts] = useState<string[]>([]);
  const [availableDistricts, setAvailableDistricts] = useState<DistrictItem[]>(
    []
  );
  const [districtSearchTerm, setDistrictSearchTerm] = useState("");
  const [isDistrictDropdownOpen, setIsDistrictDropdownOpen] = useState(false);

  // === เปลี่ยน 1 ปุ่มเป็น Color Picker ===
  const [borderColor, setBorderColor] = useState("#000000");

  // โหมดแก้ไขพาเล็ต
  const [isEditingPalette, setIsEditingPalette] = useState(false);

  // สถานะแสดง/ซ่อนชื่อพื้นที่
  const [showAreaNames, setShowAreaNames] = useState(true);

  const handleClearColors = () => {
    setAreaColors(new Map());
  };

  // Load provinces and districts list when component mounts
  useEffect(() => {
    const loadProvinces = async () => {
      try {
        const response = await fetch("/data/provinces.geojson");
        const data = (await response.json()) as {
          features: Array<{ properties: { pro_code: string; pro_th: string } }>;
        };
        const provinces: ProvinceItem[] = data.features
          .map((feature) => ({
            code: feature.properties.pro_code,
            name: feature.properties.pro_th,
          }))
          .sort((a, b) => a.name.localeCompare(b.name));
        setAvailableProvinces(provinces);
      } catch (error) {
        console.error("Error loading provinces:", error);
      }
    };

    const loadDistricts = async () => {
      try {
        const response = await fetch("/data/districts.geojson");
        const data = (await response.json()) as {
          features: Array<{
            properties: { amp_code: string; amp_th: string; pro_code: string };
          }>;
        };
        const districts: DistrictItem[] = data.features
          .map((feature) => ({
            code: feature.properties.amp_code,
            name: feature.properties.amp_th,
            provinceCode: feature.properties.pro_code,
          }))
          .sort((a, b) => a.name.localeCompare(b.name));
        setAvailableDistricts(districts);
      } catch (error) {
        console.error("Error loading districts:", error);
      }
    };

    loadProvinces();
    loadDistricts();
  }, []);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Element;
      if (!target.closest(".province-dropdown")) {
        setIsDropdownOpen(false);
      }
      if (!target.closest(".district-dropdown")) {
        setIsDistrictDropdownOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Filter provinces based on search term
  const filteredProvinces = availableProvinces.filter((province) =>
    province.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Filter districts based on search term
  const filteredDistricts = availableDistricts.filter((district) =>
    district.name.toLowerCase().includes(districtSearchTerm.toLowerCase())
  );

  const handleProvinceToggle = (provinceCode: string) => {
    setSelectedProvinces((prev) =>
      prev.includes(provinceCode)
        ? prev.filter((code) => code !== provinceCode)
        : [...prev, provinceCode]
    );
  };

  const handleSelectAll = () => {
    setSelectedProvinces(filteredProvinces.map((p) => p.code));
  };

  const handleClearSelection = () => {
    setSelectedProvinces([]);
  };

  // District selection handlers
  const handleDistrictToggle = (districtCode: string) => {
    setSelectedDistricts((prev) =>
      prev.includes(districtCode)
        ? prev.filter((code) => code !== districtCode)
        : [...prev, districtCode]
    );
  };

  const handleSelectAllDistricts = () => {
    setSelectedDistricts(filteredDistricts.map((d) => d.code));
  };

  const handleClearDistrictSelection = () => {
    setSelectedDistricts([]);
  };

  // อัพเดตสีในพาเล็ตทีละตำแหน่ง
  const updatePaletteColor = (index: number, newColor: string) => {
    setPalette((prev) => {
      const next = [...prev];
      const old = next[index];
      next[index] = newColor;

      // Save updated palette to localStorage
      savePalette(next);

      // ถ้ากำลังเลือกสีเดิมอยู่ ให้ตามไปเป็นสีใหม่ด้วย
      if (selectedColor === old) {
        setSelectedColor(newColor);
        saveSelectedColor(newColor);
      }
      return next;
    });
  };

  return (
    <div className="h-screen flex flex-col bg-white">
      {/* Header */}
      <header className="bg-white border-b-2 border-gray-800 px-2 sm:px-4 py-2 shadow-sm">
        {/* First Row: Title and Clear Button */}
        <div className="flex items-center justify-between mb-2">
          <div className="min-w-0 flex-1">
            <div className="flex items-center space-x-1.5">
              <img src="/favicon.ico" alt="" className="w-6 h-6 sm:w-8 sm:h-8 rounded-md flex-shrink-0" />
              <h1 className="text-base sm:text-lg font-bold text-gray-800 truncate">
                แผนที่ประเทศไทย
              </h1>
            </div>

            <p className="text-xs text-gray-500 leading-none mt-1 sm:mt-2 hidden sm:block">
              คลิก 1 ครั้ง = ลงสี | ดับเบิลคลิก = ลบสี | ลงสีได้หลายพื้นที่
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center space-x-2">
            {/* Toggle Area Names Button */}
            <button
              onClick={() => setShowAreaNames(!showAreaNames)}
              className="flex items-center space-x-1 sm:space-x-1.5 px-2 sm:px-2.5 py-1.5 border border-gray-300 bg-white hover:bg-gray-50 hover:border-gray-400 transition-all duration-200 rounded-sm flex-shrink-0"
              title={showAreaNames ? "ซ่อนชื่อพื้นที่" : "แสดงชื่อพื้นที่"}
            >
              {showAreaNames ? (
                <Eye className="h-3 w-3 sm:h-3.5 sm:w-3.5 text-gray-600" />
              ) : (
                <EyeOff className="h-3 w-3 sm:h-3.5 sm:w-3.5 text-gray-600" />
              )}
              <span className="text-xs font-medium text-gray-600 hidden sm:inline">
                {showAreaNames ? "ซ่อนชื่อ" : "แสดงชื่อ"}
              </span>
            </button>

            {/* Clear Colors Button */}
            <button
              onClick={handleClearColors}
              className="flex items-center space-x-1 sm:space-x-1.5 px-2 sm:px-2.5 py-1.5 border border-gray-300 bg-white hover:bg-red-50 hover:border-red-300 transition-all duration-200 rounded-sm flex-shrink-0"
              title="ล้างสีทั้งหมด"
            >
              <RotateCcw className="h-3 w-3 sm:h-3.5 sm:w-3.5 text-red-600" />
              <span className="text-xs font-medium text-red-600 hidden sm:inline">ล้างสี</span>
            </button>
          </div>
        </div>

        {/* Second Row: Controls - Stack on mobile */}
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between space-y-3 lg:space-y-0">
          {/* Level Selector and Filters */}
          <div className="flex flex-col sm:flex-row sm:items-center space-y-2 sm:space-y-0 sm:space-x-3">
            {/* Level Selector */}
            <div className="flex items-center space-x-1.5">
              <Layers className="h-4 w-4 text-gray-600" />
              <span className="text-sm font-medium text-gray-700">ระดับ:</span>
              <select
                value={currentLevel}
                onChange={(e) => setCurrentLevel(e.target.value as AdminLevel)}
                className="px-2.5 py-1.5 border border-gray-300 bg-white text-sm font-medium focus:outline-none focus:border-blue-400 rounded-sm hover:border-gray-400 transition-colors min-w-0 flex-1 sm:flex-initial"
              >
                {ADMIN_LEVELS.map((level) => (
                  <option key={level.value} value={level.value}>
                    {level.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Province Filter - only show for districts level */}
            {currentLevel === "districts" && (
              <div className="flex items-center space-x-1.5 w-full sm:w-auto">
                <span className="text-sm font-medium text-gray-700 flex-shrink-0">
                  จังหวัด:
                </span>
                <div className="relative province-dropdown flex-1 sm:flex-initial">
                  {/* Selected provinces display and toggle button */}
                  <button
                    onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                    className="w-full sm:w-auto sm:min-w-[180px] px-2.5 py-1.5 border border-gray-300 bg-white text-sm font-medium focus:outline-none focus:border-blue-400 rounded-sm hover:border-gray-400 transition-colors flex items-center justify-between"
                  >
                    <span className="truncate">
                      {selectedProvinces.length === 0
                        ? "เลือกจังหวัด"
                        : selectedProvinces.length === 1
                          ? availableProvinces.find(
                            (p) => p.code === selectedProvinces[0]
                          )?.name
                          : `${selectedProvinces.length} จังหวัด`}
                    </span>
                    <ChevronDown
                      className={`h-4 w-4 transition-transform flex-shrink-0 ${isDropdownOpen ? "rotate-180" : ""
                        }`}
                    />
                  </button>

                  {/* Dropdown */}
                  {isDropdownOpen && (
                    <div className="absolute top-full left-0 right-0 sm:w-80 mt-1 bg-white border border-gray-300 rounded-sm shadow-lg max-h-64 overflow-hidden z-500">
                      {/* Search input */}
                      <div className="p-2 border-b border-gray-200">
                        <div className="relative">
                          <Search className="absolute left-2 top-2 h-4 w-4 text-gray-400" />
                          <input
                            type="text"
                            placeholder="ค้นหาจังหวัด..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-8 pr-2 py-1 border border-gray-300 text-sm focus:outline-none focus:border-gray-500"
                          />
                          {searchTerm && (
                            <X
                              className="absolute right-2 top-2 h-4 w-4 text-gray-400 cursor-pointer hover:text-gray-600"
                              onClick={() => setSearchTerm("")}
                            />
                          )}
                        </div>
                      </div>

                      {/* Action buttons */}
                      <div className="p-2 border-b border-gray-200 flex space-x-2">
                        <button
                          onClick={handleSelectAll}
                          className="px-2 py-1 text-xs border border-gray-300 bg-white hover:bg-gray-100"
                          disabled={filteredProvinces.length === 0}
                        >
                          เลือกทั้งหมด
                        </button>
                        <button
                          onClick={handleClearSelection}
                          className="px-2 py-1 text-xs border border-gray-300 bg-white hover:bg-gray-100"
                        >
                          ล้าง
                        </button>
                      </div>

                      {/* Province list */}
                      <div className="max-h-40 overflow-y-auto">
                        {filteredProvinces.length > 0 ? (
                          filteredProvinces.map((province) => (
                            <label
                              key={province.code}
                              className="flex items-center px-3 py-2 hover:bg-gray-100 cursor-pointer"
                            >
                              <input
                                type="checkbox"
                                checked={selectedProvinces.includes(
                                  province.code
                                )}
                                onChange={() =>
                                  handleProvinceToggle(province.code)
                                }
                                className="mr-2"
                              />
                              <span className="text-sm">{province.name}</span>
                            </label>
                          ))
                        ) : (
                          <div className="px-3 py-2 text-sm text-gray-500">
                            ไม่พบจังหวัดที่ค้นหา
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* District Filter - only show for subdistricts level */}
            {currentLevel === "subdistricts" && (
              <div className="flex items-center space-x-1.5 w-full sm:w-auto">
                <span className="text-sm font-medium text-gray-700 flex-shrink-0">
                  อำเภอ:
                </span>
                <div className="relative district-dropdown flex-1 sm:flex-initial">
                  {/* Selected districts display and toggle button */}
                  <button
                    onClick={() =>
                      setIsDistrictDropdownOpen(!isDistrictDropdownOpen)
                    }
                    className="w-full sm:w-auto sm:min-w-[180px] px-2.5 py-1.5 border border-gray-300 bg-white text-sm font-medium focus:outline-none focus:border-blue-400 rounded-sm hover:border-gray-400 transition-colors flex items-center justify-between"
                  >
                    <span className="truncate">
                      {selectedDistricts.length === 0
                        ? "เลือกอำเภอ"
                        : selectedDistricts.length === 1
                          ? availableDistricts.find(
                            (d) => d.code === selectedDistricts[0]
                          )?.name
                          : `${selectedDistricts.length} อำเภอ`}
                    </span>
                    <ChevronDown
                      className={`h-4 w-4 transition-transform flex-shrink-0 ${isDistrictDropdownOpen ? "rotate-180" : ""
                        }`}
                    />
                  </button>

                  {/* Dropdown */}
                  {isDistrictDropdownOpen && (
                    <div className="absolute top-full left-0 right-0 sm:w-80 mt-1 bg-white border border-gray-300 rounded-sm shadow-lg max-h-64 overflow-hidden z-500">
                      {/* Search input */}
                      <div className="p-2 border-b border-gray-200">
                        <div className="relative">
                          <Search className="absolute left-2 top-2 h-4 w-4 text-gray-400" />
                          <input
                            type="text"
                            placeholder="ค้นหาอำเภอ..."
                            value={districtSearchTerm}
                            onChange={(e) =>
                              setDistrictSearchTerm(e.target.value)
                            }
                            className="w-full pl-8 pr-2 py-1 border border-gray-300 text-sm focus:outline-none focus:border-gray-500"
                          />
                          {districtSearchTerm && (
                            <X
                              className="absolute right-2 top-2 h-4 w-4 text-gray-400 cursor-pointer hover:text-gray-600"
                              onClick={() => setDistrictSearchTerm("")}
                            />
                          )}
                        </div>
                      </div>

                      {/* Action buttons */}
                      <div className="p-2 border-b border-gray-200 flex space-x-2">
                        <button
                          onClick={handleSelectAllDistricts}
                          className="px-2 py-1 text-xs border border-gray-300 bg-white hover:bg-gray-100"
                          disabled={filteredDistricts.length === 0}
                        >
                          เลือกทั้งหมด
                        </button>
                        <button
                          onClick={handleClearDistrictSelection}
                          className="px-2 py-1 text-xs border border-gray-300 bg-white hover:bg-gray-100"
                        >
                          ล้าง
                        </button>
                      </div>

                      {/* District list */}
                      <div className="max-h-40 overflow-y-auto">
                        {filteredDistricts.length > 0 ? (
                          filteredDistricts.map((district) => (
                            <label
                              key={district.code}
                              className="flex items-center px-3 py-2 hover:bg-gray-100 cursor-pointer"
                            >
                              <input
                                type="checkbox"
                                checked={selectedDistricts.includes(
                                  district.code
                                )}
                                onChange={() =>
                                  handleDistrictToggle(district.code)
                                }
                                className="mr-2"
                              />
                              <span className="text-sm">{district.name}</span>
                            </label>
                          ))
                        ) : (
                          <div className="px-3 py-2 text-sm text-gray-500">
                            ไม่พบอำเภอที่ค้นหา
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Color Pickers - Stack on mobile */}
          <div className="flex flex-col sm:flex-row sm:items-center space-y-3 sm:space-y-0 sm:space-x-6">
            {/* Area Color Picker */}
            <div className="flex flex-col sm:flex-row sm:items-center space-y-2 sm:space-y-0 sm:space-x-3">
              <div className="flex items-center space-x-1.5">
                <Palette className="h-4 w-4 text-gray-600" />
                <span className="text-sm font-medium text-gray-700">
                  สีพื้นที่:
                </span>
                {/* ปุ่มสลับโหมดแก้ไขสี - ย้ายมาใกล้ label */}
                <button
                  type="button"
                  onClick={() => setIsEditingPalette((v) => !v)}
                  className={`px-2 py-1 text-xs border rounded-sm transition-colors ${isEditingPalette
                    ? "border-blue-500 text-blue-600 bg-blue-50"
                    : "border-gray-300 text-gray-700 bg-white hover:bg-gray-100"
                    }`}
                  title="แก้ไขชุดสี"
                >
                  {isEditingPalette ? "เสร็จ" : "แก้ไข"}
                </button>
              </div>

              {/* ปุ่มเลือกสี + ช่องแก้ไขสี */}
              <div className="flex space-x-1.5 sm:space-x-2 sm:pb-0  pb-2">
                {palette.map((color, idx) => (
                  <div key={idx} className="flex flex-col items-center flex-shrink-0">
                    <button
                      onClick={() => {
                        setSelectedColor(color);
                        saveSelectedColor(color);
                      }}
                      className={`w-6 h-6 sm:w-7 sm:h-7 border transition-all rounded-sm ${selectedColor === color
                        ? "border-gray-700 ring-2 ring-blue-400 ring-offset-1 scale-105"
                        : "border-gray-300 hover:border-gray-500 hover:scale-105"
                        }`}
                      style={{ backgroundColor: color }}
                      title={color}
                    />
                    {isEditingPalette && (
                      <input
                        type="color"
                        value={color}
                        onChange={(e) =>
                          updatePaletteColor(idx, e.target.value)
                        }
                        className="mt-2 w-7 h-5 sm:w-8 sm:h-6 p-0 border border-gray-300 rounded-sm"
                        aria-label={`แก้ไขสีที่ ${idx + 1}`}
                      />
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Border Color Picker */}
            <div className="flex items-center space-x-3">
              <div className="flex items-center space-x-1.5">
                <div className="h-4 w-4 border-2 border-gray-600 rounded-sm bg-white flex-shrink-0"></div>
                <span className="text-sm font-medium text-gray-700">
                  สีเส้น:
                </span>
              </div>

              {(() => {
                const isCustomBorder = !["#808080", "#000000"].includes(
                  borderColor.toLowerCase()
                );
                return (
                  <label className="inline-flex items-center">
                    <span className="sr-only">เลือกสีเส้นแบบกำหนดเอง</span>
                    <input
                      type="color"
                      value={borderColor}
                      onChange={(e) => setBorderColor(e.target.value)}
                      className={`appearance-none w-6 h-6 sm:w-7 sm:h-7 p-0 border-2 rounded-sm cursor-pointer 
                        ${isCustomBorder
                          ? "border-gray-700 ring-2 ring-green-400 ring-offset-1 scale-105"
                          : "border-gray-300 hover:border-gray-500 hover:scale-105"
                        }`}
                      title={borderColor}
                      aria-label="เลือกสีเส้นแบบกำหนดเอง"
                    />
                  </label>
                );
              })()}
            </div>
          </div>
        </div>
      </header>

      {/* Map Container */}
      <div className="flex-1 relative">
        <SimpleMap
          selectedColor={selectedColor}
          currentLevel={currentLevel}
          areaColors={areaColors}
          onAreaColorsChange={setAreaColors}
          onMapReady={() => setIsLoading(false)}
          selectedProvinces={selectedProvinces}
          selectedDistricts={selectedDistricts}
          borderColor={borderColor}
          showAreaNames={showAreaNames}
        />

        {/* Loading Indicator */}
        {isLoading && (
          <div className="absolute top-4 left-1/2 transform -translate-x-1/2 bg-white border-2 border-gray-800 rounded px-4 py-2 flex items-center space-x-2 z-30">
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-800"></div>
            <span className="text-sm text-gray-600">กำลังโหลดข้อมูล...</span>
          </div>
        )}
      </div>
    </div>
  );
}
