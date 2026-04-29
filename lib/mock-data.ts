import type { ComparisonData, DataRecord } from './types'
import { generateRealisticData } from './generate-realistic-data'

/**
 * Generate guaranteed working data for Top Markets preset
 * Creates simple data that definitely works with preset filters
 */
function generateGuaranteedWorkingData(): ComparisonData {
  const startYear = 2020
  const baseYear = 2024
  const forecastYear = 2032
  const years = Array.from({ length: forecastYear - startYear + 1 }, (_, i) => startYear + i)
  
  // Simple geographies that match preset expectations
  const regions = ['North India', 'South India', 'West India', 'East India']
  const countries = ['Maharashtra', 'Tamil Nadu', 'Uttar Pradesh', 'Gujarat', 'Karnataka']
  
  // Comprehensive segments that cover all major categories to prevent "no data" errors
  const segments = [
    // Food & Beverage segments
    'B2B > Food & Beverage > Foodservice / HoReCa > Single / Individual Spices > Chilli',
    'B2B > Food & Beverage > Foodservice / HoReCa > Single / Individual Spices > Turmeric',
    'B2B > Food & Beverage > Foodservice / HoReCa > Single / Individual Spices > Cumin',
    'B2B > Food & Beverage > Foodservice / HoReCa > Single / Individual Spices > Black Pepper',
    'B2B > Food & Beverage > Foodservice / HoReCa > Single / Individual Spices > Coriander',
    'B2B > Food & Beverage > Foodservice / HoReCa > Blended / Mixed Spices > Garam Masala Blends',
    'B2B > Food & Beverage > Foodservice / HoReCa > Blended / Mixed Spices > Generic Curry Masala Blends',
    // Food & Beverage Processing segments
    'B2B > Food & Beverage Processing > Packaged Foods > Single / Individual Spices > Chilli Powder',
    'B2B > Food & Beverage Processing > Packaged Foods > Single / Individual Spices > Turmeric Powder',
    'B2B > Food & Beverage Processing > Packaged Foods > Blended / Mixed Spices > Snack Masala Blends',
    // Non-Food Industrial segments
    'B2B > Non-Food Industrial > Pharmaceuticals & Ayurveda > Single / Individual Spices > Turmeric Powder',
    'B2B > Non-Food Industrial > Pharmaceuticals & Ayurveda > Single / Individual Spices > Dry Ginger Powder',
    'B2B > Non-Food Industrial > Pharmaceuticals & Ayurveda > Single / Individual Spices > Cinnamon Powder',
    'B2B > Non-Food Industrial > Nutraceuticals & Dietary Supplements > Single / Individual Spices > Turmeric Powder',
    'B2B > Non-Food Industrial > Nutraceuticals & Dietary Supplements > Single / Individual Spices > Dry Ginger Powder',
  ]
  
  const allGeographies = ['India', ...regions, ...countries]
  
  // Generate time series helper
  const generateTimeSeries = (baseValue: number, cagr: number): Record<number, number> => {
    const timeSeries: Record<number, number> = {}
    years.forEach((year, index) => {
      const yearsFromStart = year - startYear
      const growthFactor = Math.pow(1 + cagr / 100, yearsFromStart)
      timeSeries[year] = Math.max(0, baseValue * growthFactor)
    })
    return timeSeries
  }
  
  // Generate records
  const valueRecords: DataRecord[] = []
  const volumeRecords: DataRecord[] = []
  
  allGeographies.forEach(geography => {
    const geographyLevel: 'global' | 'region' | 'country' = 
      geography === 'India' ? 'global' :
      regions.includes(geography) ? 'region' : 'country'
    
    const parentGeography = 
      geography === 'India' ? null :
      regions.includes(geography) ? 'India' : null
    
    segments.forEach(segment => {
      // Parse segment to determine hierarchy
      const segmentParts = segment.split(' > ')
      const level1 = segmentParts[0] || 'B2B'
      const level2 = segmentParts[1] || ''
      const level3 = segmentParts[2] || ''
      const level4 = segmentParts[3] || segmentParts[4] || ''
      
      // Generate values that ensure data exists
      const geoMultiplier = geography === 'India' ? 10 : regions.includes(geography) ? 3 : 1
      // Non-Food Industrial segments typically have lower values
      const segmentMultiplier = segment.includes('Non-Food Industrial') ? 0.5 : 1
      const baseValue = 100 * geoMultiplier * segmentMultiplier
      const baseVolume = 200 * geoMultiplier * segmentMultiplier
      const cagr = 5 + Math.random() * 3 // 5-8% CAGR
      
      // Value record
      valueRecords.push({
        geography,
        geography_level: geographyLevel,
        parent_geography: parentGeography,
        segment_type: 'By End-Use*Product Type',
        segment,
        segment_level: 'leaf',
        segment_hierarchy: {
          level_1: level1,
          level_2: level2,
          level_3: level3,
          level_4: level4
        },
        time_series: generateTimeSeries(baseValue, cagr),
        cagr: cagr,
        market_share: Math.random() * 20 + 5
      })
      
      // Volume record
      volumeRecords.push({
        geography,
        geography_level: geographyLevel,
        parent_geography: parentGeography,
        segment_type: 'By End-Use*Product Type',
        segment,
        segment_level: 'leaf',
        segment_hierarchy: {
          level_1: level1,
          level_2: level2,
          level_3: level3,
          level_4: level4
        },
        time_series: generateTimeSeries(baseVolume, cagr * 0.8),
        cagr: cagr * 0.8,
        market_share: Math.random() * 20 + 5
      })
    })
  })
  
  return {
    metadata: {
      market_name: 'India Spices Market',
      market_type: 'Country',
      industry: 'CMFE',
      years,
      start_year: startYear,
      base_year: baseYear,
      forecast_year: forecastYear,
      historical_years: [2020, 2021, 2022, 2023, 2024],
      forecast_years: [2025, 2026, 2027, 2028, 2029, 2030, 2031, 2032],
      currency: 'INR',
      value_unit: 'Cr.',
      volume_unit: 'Kilo Tons',
      has_value: true,
      has_volume: true
    },
    dimensions: {
      geographies: {
        global: ['India'],
        regions: regions,
        countries: {},
        all_geographies: allGeographies
      },
      segments: {
        'By End-Use*Product Type': {
          type: 'hierarchical',
          items: segments,
          hierarchy: {},
          b2b_hierarchy: {},
          b2c_hierarchy: {},
          b2b_items: segments,
          b2c_items: []
        }
      }
    },
    data: {
      value: {
        geography_segment_matrix: valueRecords
      },
      volume: {
        geography_segment_matrix: volumeRecords
      }
    }
  }
}

/**
 * Creates realistic mock data for the India Spices Market
 * Loads dimensions and generates comprehensive data for all charts
 * Uses guaranteed working data to ensure preset filters work correctly
 */
export async function createMockData(): Promise<ComparisonData> {
  // Always use guaranteed working data to ensure preset filters work
  console.log('🔄 Using guaranteed working data for reliable preset filter functionality')
  const guaranteedData = generateGuaranteedWorkingData()
  
  try {
    // Try to load and merge with dimensions data for richer structure
    const response = await fetch('/jsons/india-spices-dimensions.json', {
      cache: 'no-cache',
      headers: {
        'Accept': 'application/json',
      }
    })
    
    if (response.ok) {
      const text = await response.text()
      if (!text.startsWith('<!DOCTYPE') && !text.startsWith('<html')) {
        const dimensionsData = JSON.parse(text)
        // Update metadata from dimensions if available
        if (dimensionsData.metadata) {
          guaranteedData.metadata = {
            ...guaranteedData.metadata,
            ...dimensionsData.metadata,
            market_name: 'India Spices Market',
            start_year: 2020,
            base_year: 2024,
            forecast_year: 2032,
          }
        }
        // Update geography dimensions if available
        if (dimensionsData.dimensions?.geographies) {
          guaranteedData.dimensions.geographies = {
            ...guaranteedData.dimensions.geographies,
            ...dimensionsData.dimensions.geographies,
            // Ensure our guaranteed regions are included
            regions: [...new Set([...guaranteedData.dimensions.geographies.regions, ...(dimensionsData.dimensions.geographies.regions || [])])],
            all_geographies: [...new Set([...guaranteedData.dimensions.geographies.all_geographies, ...(dimensionsData.dimensions.geographies.all_geographies || [])])]
          }
        }
      }
    }
  } catch (error) {
    console.warn('Could not load dimensions data, using guaranteed data only:', error)
  }
  
  console.log('✅ Guaranteed working data generated:', {
    totalRecords: guaranteedData.data.value.geography_segment_matrix.length,
    geographies: guaranteedData.dimensions.geographies.all_geographies.length,
    regions: guaranteedData.dimensions.geographies.regions,
    segments: guaranteedData.data.value.geography_segment_matrix
      .filter((r: DataRecord) => r.geography === 'North India')
      .map((r: DataRecord) => r.segment)
      .slice(0, 3)
  })
  
  return guaranteedData
}

