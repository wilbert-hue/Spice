/**
 * Utility functions for Filter Presets
 * Handles dynamic calculation of top regions and segments
 */

import type { ComparisonData, DataRecord, FilterState } from './types'

/**
 * Calculate top regions based on market value for a specific year
 * @param data - The comparison data
 * @param year - The year to evaluate (default 2024)
 * @param topN - Number of top regions to return (default 3)
 * @returns Array of top region names
 */
export function getTopRegionsByMarketValue(
  data: ComparisonData | null,
  year: number = 2024,
  topN: number = 3
): string[] {
  if (!data) return []

  // Get all value data records
  const records = data.data.value.geography_segment_matrix

  // Calculate total market value by region for the specified year
  const regionTotals = new Map<string, number>()

  records.forEach((record: DataRecord) => {
    const geography = record.geography
    const value = record.time_series[year] || 0

    // Skip global level (India)
    if (geography === 'India' || geography === 'Global') return

    // Only consider region-level geographies
    if (record.geography_level === 'region') {
      const currentTotal = regionTotals.get(geography) || 0
      regionTotals.set(geography, currentTotal + value)
    }
  })
  
  // If no regions found, check if we can identify regions from geography names
  if (regionTotals.size === 0 && data) {
    const regions = data.dimensions?.geographies?.regions || []
    // Try to find regions by name matching
    records.forEach((record: DataRecord) => {
      const geography = record.geography
      if (regions.includes(geography)) {
        const value = record.time_series[year] || 0
        const currentTotal = regionTotals.get(geography) || 0
        regionTotals.set(geography, currentTotal + value)
      }
    })
  }

  // Sort regions by total value and get top N
  const sortedRegions = Array.from(regionTotals.entries())
    .sort((a, b) => b[1] - a[1]) // Sort by value descending
    .slice(0, topN)
    .map(([region]) => region)

  // Debug logging
  if (typeof window !== 'undefined') {
    console.log(`📊 Top Markets Preset: Found ${sortedRegions.length} regions`, sortedRegions)
  }

  return sortedRegions
}

/**
 * Get all first-level segments for a given segment type
 * @param data - The comparison data
 * @param segmentType - The segment type to get segments for
 * @returns Array of first-level segment names
 */
export function getFirstLevelSegments(
  data: ComparisonData | null,
  segmentType: string
): string[] {
  if (!data) return []

  const segmentDimension = data.dimensions.segments[segmentType]
  if (!segmentDimension) return []

  // For "By End-Use*Product Type", we need to get segments from actual data records
  // because the hierarchy structure is complex (B2B/B2C > Category > Subcategory > ...)
  if (segmentType === 'By End-Use*Product Type') {
    // Get unique segments from data records
    const records = data.data.value.geography_segment_matrix
    const uniqueSegments = new Set<string>()
    
    records
      .filter(r => r.segment_type === segmentType)
      .forEach(r => {
        // Extract first-level segment (after B2B/B2C prefix)
        const parts = r.segment.split(' > ')
        if (parts.length >= 2) {
          // Skip B2B/B2C prefix and get the first category
          const firstLevel = parts[1] // e.g., "Food & Beverage"
          if (firstLevel) {
            uniqueSegments.add(firstLevel)
          }
        }
      })
    
    return Array.from(uniqueSegments).sort()
  }

  const hierarchy = segmentDimension.hierarchy || {}
  const allSegments = segmentDimension.items || []

  // Find root segments (those that are parents but not children of any other segment)
  const allChildren = new Set(Object.values(hierarchy).flat())
  const firstLevelSegments: string[] = []

  // Add all segments that have children but are not children themselves
  Object.keys(hierarchy).forEach(parent => {
    if (!allChildren.has(parent) && hierarchy[parent].length > 0) {
      firstLevelSegments.push(parent)
    }
  })

  // Also add standalone segments that are neither parents nor children
  allSegments.forEach(segment => {
    if (!allChildren.has(segment) && !hierarchy[segment]) {
      firstLevelSegments.push(segment)
    }
  })

  return firstLevelSegments.length > 0 ? firstLevelSegments.sort() : allSegments.sort()
}

/**
 * Get the first available segment type from the data
 * @param data - The comparison data
 * @returns The first segment type name or null
 */
export function getFirstSegmentType(data: ComparisonData | null): string | null {
  if (!data || !data.dimensions.segments) return null
  
  const segmentTypes = Object.keys(data.dimensions.segments)
  return segmentTypes.length > 0 ? segmentTypes[0] : null
}

/**
 * Calculate top regions based on CAGR (Compound Annual Growth Rate)
 * @param data - The comparison data
 * @param topN - Number of top regions to return (default 2)
 * @returns Array of top region names sorted by CAGR
 */
export function getTopRegionsByCAGR(
  data: ComparisonData | null,
  topN: number = 2
): string[] {
  if (!data) return []

  // Get all value data records
  const records = data.data.value.geography_segment_matrix

  // Calculate average CAGR for each region
  const regionCAGRs = new Map<string, number[]>()

  records.forEach((record: DataRecord) => {
    const geography = record.geography

    // Skip global level (India)
    if (geography === 'India' || geography === 'Global') return

    // Only consider region-level geographies
    if (record.geography_level === 'region' && record.cagr !== undefined && record.cagr !== null) {
      const cagrs = regionCAGRs.get(geography) || []
      cagrs.push(record.cagr)
      regionCAGRs.set(geography, cagrs)
    }
  })
  
  // If no regions found, check if we can identify regions from geography names
  if (regionCAGRs.size === 0 && data) {
    const regions = data.dimensions?.geographies?.regions || []
    records.forEach((record: DataRecord) => {
      const geography = record.geography
      if (regions.includes(geography) && record.cagr !== undefined && record.cagr !== null) {
        const cagrs = regionCAGRs.get(geography) || []
        cagrs.push(record.cagr)
        regionCAGRs.set(geography, cagrs)
      }
    })
  }

  // Calculate average CAGR for each region
  const avgCAGRs = Array.from(regionCAGRs.entries()).map(([region, cagrs]) => ({
    region,
    avgCAGR: cagrs.reduce((a, b) => a + b, 0) / cagrs.length
  }))

  // Sort regions by average CAGR and get top N
  const sortedRegions = avgCAGRs
    .sort((a, b) => b.avgCAGR - a.avgCAGR) // Sort by CAGR descending
    .slice(0, topN)
    .map(item => item.region)

  return sortedRegions
}

/**
 * Calculate top countries based on CAGR (Compound Annual Growth Rate)
 * @param data - The comparison data
 * @param topN - Number of top countries to return (default 5)
 * @returns Array of top country names sorted by CAGR
 */
export function getTopCountriesByCAGR(
  data: ComparisonData | null,
  topN: number = 5
): string[] {
  if (!data) return []

  // Get all value data records
  const records = data.data.value.geography_segment_matrix

  // Calculate average CAGR for each country
  const countryCAGRs = new Map<string, number[]>()

  records.forEach((record: DataRecord) => {
    const geography = record.geography

    // Skip global (India) and region levels
    if (geography === 'India' || geography === 'Global') return

    // Only consider country-level geographies
    if (record.geography_level === 'country' && record.cagr !== undefined && record.cagr !== null) {
      const cagrs = countryCAGRs.get(geography) || []
      cagrs.push(record.cagr)
      countryCAGRs.set(geography, cagrs)
    }
  })
  
  // If no countries found, check if we can identify countries from geography names
  if (countryCAGRs.size === 0 && data) {
    const regions = data.dimensions?.geographies?.regions || []
    const allGeos = data.dimensions?.geographies?.all_geographies || []
    const countries = allGeos.filter(geo => geo !== 'India' && !regions.includes(geo))
    
    records.forEach((record: DataRecord) => {
      const geography = record.geography
      if (countries.includes(geography) && record.cagr !== undefined && record.cagr !== null) {
        const cagrs = countryCAGRs.get(geography) || []
        cagrs.push(record.cagr)
        countryCAGRs.set(geography, cagrs)
      }
    })
  }

  // Calculate average CAGR for each country
  const avgCAGRs = Array.from(countryCAGRs.entries()).map(([country, cagrs]) => ({
    country,
    avgCAGR: cagrs.reduce((a, b) => a + b, 0) / cagrs.length
  }))

  // Sort countries by average CAGR and get top N
  const sortedCountries = avgCAGRs
    .sort((a, b) => b.avgCAGR - a.avgCAGR) // Sort by CAGR descending
    .slice(0, topN)
    .map(item => item.country)

  return sortedCountries
}

/**
 * Create dynamic filter configuration for Top Market preset
 * Completely rewritten to match actual data structure
 * @param data - The comparison data
 * @returns Partial FilterState with dynamic values
 */
export function createTopMarketFilters(data: ComparisonData | null): Partial<FilterState> {
  if (!data) {
    console.warn('⚠️ Top Markets Preset: No data provided')
    return {
      viewMode: 'geography-mode',
      geographies: [],
      segments: [],
      yearRange: [2024, 2028],
      dataType: 'value',
      businessType: 'B2B'
    }
  }

  try {
    const records = data.data?.value?.geography_segment_matrix
    if (!records || !Array.isArray(records) || records.length === 0) {
      console.warn('⚠️ Top Markets Preset: No records found in data')
      return {
        viewMode: 'geography-mode',
        geographies: [],
        segments: [],
        segmentType: 'By End-Use*Product Type',
        yearRange: [2024, 2028],
        dataType: 'value',
        businessType: 'B2B'
      }
    }

    const baseYear = data.metadata?.base_year || 2024
    const segmentType = 'By End-Use*Product Type'
    
    // Step 1: Find top 3 regions by total market value in base year
    // Aggregate all segments for each region
    const regionTotals = new Map<string, number>()
    
    records.forEach(record => {
      try {
        // Only process region-level geographies (with fallback to dimensions)
        const isRegion = record.geography_level === 'region' || 
                        (data.dimensions?.geographies?.regions || []).includes(record.geography)
        
        if (!isRegion) return
        
        // Skip global level
        if (record.geography === 'India' || record.geography === 'Global') return
        
        // Only process B2B segments of the correct type
        if (record.segment_type !== segmentType) return
        if (!record.segment || !record.segment.startsWith('B2B >')) return
        
        // Get value for base year
        const timeSeries = record.time_series || {}
        const value = timeSeries[baseYear] || 0
        if (value <= 0) return // Skip zero values
        
        // Aggregate by geography name (use exact name from data)
        const currentTotal = regionTotals.get(record.geography) || 0
        regionTotals.set(record.geography, currentTotal + value)
      } catch (err) {
        console.warn('⚠️ Error processing record in Top Markets preset:', err, record)
      }
    })
    
    // Sort regions by total value and get top 3
    const sortedRegions = Array.from(regionTotals.entries())
      .sort((a, b) => b[1] - a[1]) // Sort descending by value
      .slice(0, 3)
      .map(([geography]) => geography) // Extract geography names only
    
    // Use actual geography names from data (not normalized)
    let selectedGeographies = sortedRegions.length > 0 ? sortedRegions : []
    
    // Fallback: If no regions found by geography_level, try using dimensions
    if (selectedGeographies.length === 0 && data.dimensions?.geographies?.regions) {
      const regionsFromDimensions = data.dimensions.geographies.regions.slice(0, 3)
      console.log('📊 Top Markets: Using regions from dimensions as fallback:', regionsFromDimensions)
      selectedGeographies = regionsFromDimensions
    }
    
    if (selectedGeographies.length === 0) {
      console.warn('⚠️ No regions with data found for Top Markets preset', {
        totalRecords: records.length,
        sampleRecords: records.slice(0, 3).map(r => ({
          geography: r.geography,
          geography_level: r.geography_level,
          segment: r.segment?.substring(0, 50)
        }))
      })
      return {
        viewMode: 'geography-mode',
        geographies: [],
        segments: [],
        segmentType: segmentType,
        yearRange: [baseYear, baseYear + 4],
        dataType: 'value',
        businessType: 'B2B'
      }
    }
  
    // Step 2: Find segments that exist for the selected regions
    // Collect all unique segments that have data for at least one selected geography
    const segmentValueMap = new Map<string, number>() // segment -> total value across selected geographies
    
    records.forEach(record => {
      try {
        // Must match one of the selected geographies (exact match first, then flexible)
        const geoMatches = selectedGeographies.includes(record.geography) ||
          selectedGeographies.some(geo => 
            record.geography.startsWith(geo) || 
            geo.startsWith(record.geography)
          )
        
        if (!geoMatches) return
        
        // Must be correct segment type and B2B
        if (record.segment_type !== segmentType) return
        if (!record.segment || !record.segment.startsWith('B2B >')) return
        
        // Must have data in base year
        const timeSeries = record.time_series || {}
        const value = timeSeries[baseYear] || 0
        if (value <= 0) return
        
        // Aggregate value for this segment across all selected geographies
        const currentTotal = segmentValueMap.get(record.segment) || 0
        segmentValueMap.set(record.segment, currentTotal + value)
      } catch (err) {
        console.warn('⚠️ Error processing segment in Top Markets preset:', err, record)
      }
    })
    
    // Step 3: Select top 5 segments by total value
    const sortedSegments = Array.from(segmentValueMap.entries())
      .sort((a, b) => b[1] - a[1]) // Sort descending by value
      .slice(0, 5)
      .map(([segment]) => segment) // Extract segment names only
    
    if (sortedSegments.length === 0) {
      console.warn('⚠️ No segments with data found for Top Markets preset', {
        selectedGeographies,
        totalRecords: records.length,
        sampleSegments: Array.from(new Set(records
          .filter(r => selectedGeographies.includes(r.geography))
          .map(r => r.segment)
          .filter(s => s && s.startsWith('B2B >'))
        )).slice(0, 10)
      })
      return {
        viewMode: 'geography-mode',
        geographies: selectedGeographies,
        segments: [],
        segmentType: segmentType,
        yearRange: [baseYear, baseYear + 4],
        dataType: 'value',
        businessType: 'B2B'
      }
    }
    
    // Step 4: Verify data exists for the selected combination
    // Count records that match both selected geographies and segments
    const matchingRecords = records.filter(record => {
      try {
        const geoMatches = selectedGeographies.includes(record.geography) ||
          selectedGeographies.some(geo => 
            record.geography.startsWith(geo) || 
            geo.startsWith(record.geography)
          )
        if (!geoMatches) return false
        if (!sortedSegments.includes(record.segment)) return false
        if (record.segment_type !== segmentType) return false
        const timeSeries = record.time_series || {}
        const value = timeSeries[baseYear] || 0
        return value > 0
      } catch {
        return false
      }
    })
    
    console.log('📊 Top Markets Preset (Rewritten):', {
      selectedGeographies,
      selectedSegments: sortedSegments,
      totalRecords: records.length,
      matchingRecords: matchingRecords.length,
      regionTotals: Array.from(regionTotals.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([geo, val]) => ({ geography: geo, totalValue: val })),
      segmentTotals: Array.from(segmentValueMap.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([seg, val]) => ({ segment: seg.substring(0, 60), totalValue: val }))
    })
    
    return {
      viewMode: 'geography-mode',
      geographies: selectedGeographies,
      segments: sortedSegments,
      segmentType: segmentType,
      yearRange: [baseYear, baseYear + 4] as [number, number],
      dataType: 'value',
      businessType: 'B2B'
    }
  } catch (error) {
    console.error('❌ Error in createTopMarketFilters:', error)
    return {
      viewMode: 'geography-mode',
      geographies: [],
      segments: [],
      segmentType: 'By End-Use*Product Type',
      yearRange: [2024, 2028],
      dataType: 'value',
      businessType: 'B2B'
    }
  }
}

/**
 * Create dynamic filter configuration for Growth Leaders preset
 * Identifies top 2 regions with highest CAGR and uses first segment type with all first-level segments
 */
export function createGrowthLeadersFilters(data: ComparisonData | null): Partial<FilterState> {
  if (!data) {
    return {
      viewMode: 'geography-mode',
      geographies: [],
      segments: [],
      yearRange: [2024, 2032],
      dataType: 'value',
      businessType: 'B2B'
    }
  }

  // Get top 2 regions with highest CAGR
  const topRegions = getTopRegionsByCAGR(data, 2)
  const selectedGeographies = topRegions.length > 0 ? topRegions : ['West India', 'East India']

  // Dynamically find segments that exist for the selected geographies
  const records = data.data.value.geography_segment_matrix
  const segmentsForGeos = new Set<string>()
  
  records.forEach(record => {
    // Handle geography name variations (e.g., "North India" vs "North India (5 states)")
    const geoMatches = selectedGeographies.some(geo => {
      return record.geography === geo || 
             record.geography.startsWith(geo) || 
             geo.startsWith(record.geography) ||
             record.geography.includes(geo) ||
             geo.includes(record.geography)
    })
    
    if (geoMatches && 
        record.segment_type === 'By End-Use*Product Type' &&
        record.segment.startsWith('B2B >')) {
      // Only add segments that have actual data (non-zero values)
      const hasData = record.time_series && Object.values(record.time_series).some(val => val > 0)
      if (hasData) {
        segmentsForGeos.add(record.segment)
      }
    }
  })
  
  // Get top 3 segments by CAGR that actually exist
  const availableSegments = Array.from(segmentsForGeos)
    .map(segment => {
      // Calculate average CAGR for this segment across selected geographies
      const segmentRecords = records.filter(r => {
        if (r.segment !== segment || r.cagr === undefined || r.cagr === null) return false
        // Use flexible geography matching
        return selectedGeographies.some(geo => {
          return r.geography === geo || 
                 r.geography.startsWith(geo) || 
                 geo.startsWith(r.geography) ||
                 r.geography.includes(geo) ||
                 geo.includes(r.geography)
        })
      })
      const avgCAGR = segmentRecords.length > 0
        ? segmentRecords.reduce((sum, r) => sum + (r.cagr || 0), 0) / segmentRecords.length
        : 0
      return { segment, avgCAGR }
    })
    .filter(item => item.avgCAGR > 0) // Only include segments with positive CAGR
    .sort((a, b) => b.avgCAGR - a.avgCAGR)
    .slice(0, 3)
    .map(item => item.segment)
  
  // If no segments found, return empty array to prevent errors
  if (availableSegments.length === 0) {
    console.warn('⚠️ No segments with data found for Growth Leaders preset')
    return {
      viewMode: 'geography-mode',
      geographies: [],
      segments: [],
      segmentType: 'By End-Use*Product Type',
      yearRange: [2024, 2032],
      dataType: 'value',
      businessType: 'B2B'
    }
  }

  console.log('📊 Growth Leaders Preset:', {
    geographies: selectedGeographies,
    segments: availableSegments,
    foundSegments: availableSegments.length
  })

  return {
    viewMode: 'geography-mode',
    geographies: selectedGeographies,
    segments: availableSegments.length > 0 ? availableSegments : [],
    segmentType: 'By End-Use*Product Type',
    yearRange: [2024, 2032],
    dataType: 'value',
    businessType: 'B2B'
  }
}

/**
 * Create dynamic filter configuration for Emerging Markets preset
 * Identifies top 5 countries with highest CAGR and uses first segment type with all first-level segments
 */
export function createEmergingMarketsFilters(data: ComparisonData | null): Partial<FilterState> {
  if (!data) {
    return {
      viewMode: 'geography-mode',
      geographies: [],
      segments: [],
      yearRange: [2024, 2032],
      dataType: 'value',
      businessType: 'B2B'
    }
  }

  // Get top 5 countries with highest CAGR
  const topCountries = getTopCountriesByCAGR(data, 5)
  const selectedGeographies = topCountries.length > 0
    ? topCountries
    : ['Odisha', 'Uttar Pradesh', 'Assam', 'Tamil Nadu', 'Maharashtra']

  // Dynamically find segments that exist for the selected geographies
  const records = data.data.value.geography_segment_matrix
  const segmentsForGeos = new Set<string>()
  
  records.forEach(record => {
    // Handle geography name variations (e.g., "North India" vs "North India (5 states)")
    const geoMatches = selectedGeographies.some(geo => {
      return record.geography === geo || 
             record.geography.startsWith(geo) || 
             geo.startsWith(record.geography) ||
             record.geography.includes(geo) ||
             geo.includes(record.geography)
    })
    
    if (geoMatches && 
        record.segment_type === 'By End-Use*Product Type' &&
        record.segment.startsWith('B2B >')) {
      // Only add segments that have actual data (non-zero values)
      const hasData = record.time_series && Object.values(record.time_series).some(val => val > 0)
      if (hasData) {
        segmentsForGeos.add(record.segment)
      }
    }
  })
  
  // Get top 5 segments by CAGR that actually exist
  const availableSegments = Array.from(segmentsForGeos)
    .map(segment => {
      // Calculate average CAGR for this segment across selected geographies
      const segmentRecords = records.filter(r => {
        if (r.segment !== segment || r.cagr === undefined || r.cagr === null) return false
        // Use flexible geography matching
        return selectedGeographies.some(geo => {
          return r.geography === geo || 
                 r.geography.startsWith(geo) || 
                 geo.startsWith(r.geography) ||
                 r.geography.includes(geo) ||
                 geo.includes(r.geography)
        })
      })
      const avgCAGR = segmentRecords.length > 0
        ? segmentRecords.reduce((sum, r) => sum + (r.cagr || 0), 0) / segmentRecords.length
        : 0
      return { segment, avgCAGR }
    })
    .filter(item => item.avgCAGR > 0) // Only include segments with positive CAGR
    .sort((a, b) => b.avgCAGR - a.avgCAGR)
    .slice(0, 5)
    .map(item => item.segment)
  
  // If no segments found, return empty array to prevent errors
  if (availableSegments.length === 0) {
    console.warn('⚠️ No segments with data found for Emerging Markets preset')
    return {
      viewMode: 'geography-mode',
      geographies: [],
      segments: [],
      segmentType: 'By End-Use*Product Type',
      yearRange: [2024, 2032],
      dataType: 'value',
      businessType: 'B2B'
    }
  }

  console.log('📊 Emerging Markets Preset:', {
    geographies: selectedGeographies,
    segments: availableSegments,
    foundSegments: availableSegments.length
  })

  return {
    viewMode: 'geography-mode',
    geographies: selectedGeographies,
    segments: availableSegments.length > 0 ? availableSegments : [],
    segmentType: 'By End-Use*Product Type',
    yearRange: [2024, 2032],
    dataType: 'value',
    businessType: 'B2B'
  }
}
