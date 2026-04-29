import { create } from 'zustand'
import type { FilterState, ComparisonData } from './types'
import type { ChartGroupId } from './chart-groups'
import { DEFAULT_CHART_GROUP } from './chart-groups'

interface DashboardStore {
  data: ComparisonData | null
  filteredData: any[] // Will hold filtered records
  filters: FilterState
  isLoading: boolean
  error: string | null
  selectedChartGroup: ChartGroupId
  
  // Actions
  setData: (data: ComparisonData) => void
  updateFilters: (filters: Partial<FilterState>) => void
  setLoading: (loading: boolean) => void
  setError: (error: string | null) => void
  resetFilters: () => void
  setSelectedChartGroup: (groupId: ChartGroupId) => void
}

// Helper function to get default filters based on data
function getDefaultFilters(data: ComparisonData | null): FilterState {
  // Get first segment type from dimensions, or use fallback
  const firstSegmentType = data?.dimensions?.segments 
    ? Object.keys(data.dimensions.segments)[0] 
    : 'By Drug Class'
  
  // Get year range from metadata, or use defaults
  const startYear = data?.metadata?.start_year || 2020
  const baseYear = data?.metadata?.base_year || 2024
  const forecastYear = data?.metadata?.forecast_year || 2032
  
  // Set default geographies - empty for segment-mode, Delhi and Haryana for geography-mode
  let defaultGeographies: string[] = []
  // For segment-mode, we want to focus on segments across time, not specific geographies
  // So we keep geographies empty by default
  
  // Set default segments based on segment type
  let defaultSegments: string[] = []
  if (data?.dimensions?.segments && firstSegmentType) {
    const segmentDef = data.dimensions.segments[firstSegmentType]
    
    if (segmentDef) {
      if (segmentDef.type === 'flat' && segmentDef.items && segmentDef.items.length > 0) {
        // For flat structures, select only the first item (lowest level)
        defaultSegments = [segmentDef.items[0]]
      } else if (segmentDef.type === 'hierarchical' && firstSegmentType === 'By End-Use*Product Type') {
        // Set default to just B2B > Food & Beverage to ensure we match data
        defaultSegments = [
          'B2B > Food & Beverage'
        ]
      } else if (segmentDef.type === 'hierarchical' && segmentDef.hierarchy) {
        // For other hierarchical structures, get first few leaf items
        const hierarchy = segmentDef.hierarchy
        const allItems: string[] = []
        
        // Get all leaf items from hierarchy
        Object.entries(hierarchy).forEach(([key, values]) => {
          values.forEach(value => {
            if (!hierarchy[value]) {
              // This is a leaf item
              allItems.push(`${key} > ${value}`)
            }
          })
        })
        
        // Select only the first leaf item (lowest level)
        defaultSegments = allItems.length > 0 ? [allItems[0]] : []
      }
    }
  }
  
  return {
    geographies: [], // Show all geographies by default
    segments: ['B2B > Food & Beverage'], // Start with a broader segment
    segmentType: firstSegmentType,
    yearRange: [startYear, forecastYear], // Show all years
    dataType: 'value',
    viewMode: 'segment-mode',
    businessType: 'B2B',
  }
}

export const useDashboardStore = create<DashboardStore>((set, get) => ({
  data: null,
  filteredData: [],
  filters: getDefaultFilters(null),
  isLoading: false,
  error: null,
  selectedChartGroup: DEFAULT_CHART_GROUP,
  
  setData: (data) => {
    // Update filters when data is set with default selections
    const defaultFilters = getDefaultFilters(data)
    
    // If we have data, try to get actual segments from the data records
    let finalSegments = defaultFilters.segments
    if (data && data.data && data.data.value && data.data.value.geography_segment_matrix) {
      const records = data.data.value.geography_segment_matrix
      const segmentType = defaultFilters.segmentType
      const businessType = defaultFilters.businessType
      
      // Filter records by segment type and business type
      const matchingRecords = records.filter(record => {
        if (record.segment_type !== segmentType) return false
        
        // Check business type
        if (segmentType === 'By End-Use*Product Type') {
          const segmentParts = record.segment.split(' > ')
          if (segmentParts.length > 0 && (segmentParts[0] === 'B2B' || segmentParts[0] === 'B2C')) {
            return segmentParts[0] === businessType
          }
        } else {
          const recordBusinessType = record.segment_hierarchy?.level_1
          if (recordBusinessType === 'B2B' || recordBusinessType === 'B2C') {
            return recordBusinessType === businessType
          }
        }
        
        return true
      })
      
      // Get unique segments, select TWO at the lowest (leaf) level for segment-mode
      const uniqueSegments = Array.from(new Set(matchingRecords.map(r => r.segment)))

      if (uniqueSegments.length > 0) {
        // Filter to only leaf-level segments (those with the longest path depth)
        const leafSegments = uniqueSegments.filter(segment => {
          // Check if this segment is a leaf (has the maximum depth in the hierarchy)
          const segmentDepth = segment.split(' > ').length
          // A leaf segment should have at least 4-5 levels (B2B > Category > Subcategory > ProductType > Item)
          // or be the deepest segment available
          return segmentDepth >= 4
        })

        if (leafSegments.length > 0) {
          // Select the first TWO leaf segments for segment-mode comparison
          finalSegments = leafSegments.slice(0, 2)
        } else {
          // If no deep segments found, get the deepest ones available
          const sortedByDepth = uniqueSegments.sort((a, b) => {
            const depthA = a.split(' > ').length
            const depthB = b.split(' > ').length
            return depthB - depthA // Sort descending by depth
          })
          finalSegments = sortedByDepth.slice(0, 2)
        }
      }
    }
    
    set({ 
      data, 
      error: null,
      filters: {
        ...get().filters,
        segmentType: defaultFilters.segmentType,
        yearRange: defaultFilters.yearRange,
        geographies: defaultFilters.geographies,
        segments: finalSegments,
        businessType: defaultFilters.businessType,
      }
    })
  },
  
  updateFilters: (newFilters) => 
    set((state) => ({
      filters: { ...state.filters, ...newFilters }
    })),
  
  setLoading: (loading) => set({ isLoading: loading }),
  
  setError: (error) => set({ error, isLoading: false }),
  
  resetFilters: () => {
    const currentData = get().data
    set({ filters: getDefaultFilters(currentData) })
  },
  
  setSelectedChartGroup: (groupId) => set({ selectedChartGroup: groupId }),
}))

