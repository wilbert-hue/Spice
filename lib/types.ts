// Type definitions for the Comparative Analysis Dashboard

export interface Metadata {
  market_name: string;
  market_type: string;
  industry: string;
  years: number[];
  start_year: number;
  base_year: number;
  forecast_year: number;
  historical_years: number[];
  forecast_years: number[];
  currency: string;
  value_unit: string;
  volume_unit: string;
  has_value: boolean;
  has_volume: boolean;
}

export interface GeographyDimension {
  global: string[];
  regions: string[];
  countries: Record<string, string[]>;
  all_geographies: string[];
}

export interface SegmentDimension {
  type: 'flat' | 'hierarchical';
  items: string[];
  hierarchy: Record<string, string[]>;
  b2b_hierarchy?: Record<string, string[]>;
  b2c_hierarchy?: Record<string, string[]>;
  b2b_items?: string[]; // B2B-only items
  b2c_items?: string[]; // B2C-only items
}

export interface SegmentHierarchy {
  level_1: string;
  level_2: string;
  level_3: string;
  level_4: string;
}

export interface DataRecord {
  geography: string;
  geography_level: 'global' | 'region' | 'country' | 'unknown';
  parent_geography: string | null;
  segment_type: string;
  segment: string;
  segment_level: 'parent' | 'leaf';
  segment_hierarchy: SegmentHierarchy;
  time_series: Record<number, number>;
  cagr: number;
  market_share: number;
}

export interface ComparisonData {
  metadata: Metadata;
  dimensions: {
    geographies: GeographyDimension;
    segments: Record<string, SegmentDimension>;
  };
  data: {
    value: {
      geography_segment_matrix: DataRecord[];
    };
    volume: {
      geography_segment_matrix: DataRecord[];
    };
  };
}

export interface FilterState {
  geographies: string[];
  segments: string[];
  segmentType: string;
  yearRange: [number, number];
  dataType: 'value' | 'volume';
  viewMode: 'segment-mode' | 'geography-mode' | 'matrix';
  businessType: 'B2B' | 'B2C';
}

export interface ChartDataPoint {
  year: number;
  [key: string]: number | string;
}

export interface HeatmapCell {
  geography: string;
  segment: string;
  value: number;
  displayValue: string;
}

export interface ComparisonTableRow {
  geography: string;
  segment: string;
  baseYear: number;
  forecastYear: number;
  cagr: number;
  growth: number;
  timeSeries: number[];
}

