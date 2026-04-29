import type { DataRecord, FilterState, ChartDataPoint, HeatmapCell, ComparisonTableRow } from './types'

/**
 * Filter data records based on current filter state
 */
// Helper function to check if a segment matches any of the selected segments
function isSegmentMatch(recordSegment: string, selectedSegments: string[]): boolean {
  if (selectedSegments.length === 0) return true
  
  // Check for direct match
  if (selectedSegments.includes(recordSegment)) {
    return true
  }
  
  // Check if any selected segment is a parent of the record's segment
  return selectedSegments.some(selected => {
    // If the selected segment is a parent in the hierarchy
    return recordSegment.startsWith(selected + ' > ')
  })
}

export function filterData(
  data: DataRecord[],
  filters: FilterState & { advancedSegments?: any[] }
): DataRecord[] {
  console.log('🔍 Filtering data with:', {
    totalRecords: data.length,
    filters: {
      ...filters,
      geographies: filters.geographies.length ? filters.geographies : 'All',
      segments: filters.segments?.length ? filters.segments : 'All',
      segmentType: filters.segmentType
    }
  })

  // Helper function for flexible geography matching
  const isGeographyMatch = (recordGeography: string, selectedGeographies: string[]): boolean => {
    if (selectedGeographies.length === 0) return true
    
    return selectedGeographies.some(geo => {
      // Exact match
      if (recordGeography === geo) return true
      // Record geography starts with selected (e.g., "West India (5 states)" matches "West India")
      if (recordGeography.startsWith(geo)) return true
      // Selected starts with record (e.g., "West India" matches "West India (5 states)")
      if (geo.startsWith(recordGeography)) return true
      // Contains check (bidirectional)
      if (recordGeography.includes(geo) || geo.includes(recordGeography)) return true
      return false
    })
  }

  const filtered = data.filter((record) => {
    // Geography filter - if no geographies selected, show all
    // Use flexible matching to handle geography name variations
    const geoMatch = isGeographyMatch(record.geography, filters.geographies)
    
    if (!geoMatch) {
      return false
    }
    
    // Segment type filter - must match
    const segTypeMatch = record.segment_type === filters.segmentType
    if (!segTypeMatch) {
      return false
    }
    
    // Business type filter - apply to all segment types
    let businessTypeMatch = true
    // Check if record's level_1 matches the selected business type
    const recordBusinessType = record.segment_hierarchy?.level_1
    if (recordBusinessType === 'B2B' || recordBusinessType === 'B2C') {
      businessTypeMatch = recordBusinessType === filters.businessType
    } else if (filters.segmentType === 'By End-Use*Product Type') {
      // For "By End-Use*Product Type", check if the segment path starts with B2B or B2C
      const segmentParts = record.segment.split(' > ')
      if (segmentParts.length > 0 && (segmentParts[0] === 'B2B' || segmentParts[0] === 'B2C')) {
        businessTypeMatch = segmentParts[0] === filters.businessType
      }
    }
    
    if (!businessTypeMatch) {
      return false
    }
    
    // For multi-type segment selection, check if we have advancedSegments
    if (filters.advancedSegments && filters.advancedSegments.length > 0) {
      // Check if this record matches any of the selected segment+type combinations
      const segmentMatch = filters.advancedSegments.some(seg => {
        // Match segment type first
        if (seg.type !== record.segment_type) return false
        
        // Direct match - exact segment name
        if (seg.segment === record.segment) return true
        
        // Check if selected segment is a parent of this record's segment
        if (record.segment.startsWith(seg.segment + ' > ')) return true
        
        // Check if this record's segment is a parent of the selected segment
        if (seg.segment.startsWith(record.segment + ' > ')) return true
        
        return false
      })
      
      return geoMatch && segmentMatch
    }
    
    // Segment filter - check for matches (exact or partial)
    // If no segments selected, show all segments of the selected type
    let segMatch = filters.segments.length === 0
    
    if (filters.segments.length > 0) {
      // Check for direct match or hierarchical match
      segMatch = filters.segments.some(selectedSegment => {
        // Exact match
        if (selectedSegment === record.segment) return true
        
        // Check if selected segment is a parent of this record's segment
        if (record.segment.startsWith(selectedSegment + ' > ')) return true
        
        // Check if this record's segment is a parent of the selected segment
        if (selectedSegment.startsWith(record.segment + ' > ')) return true
        
        // Check hierarchy levels
        const recordHierarchy = record.segment_hierarchy || {}
        const selectedParts = selectedSegment.split(' > ')
        
        // Check if any level in the hierarchy matches the selected segment
        return Object.values(recordHierarchy).some(level => 
          level && selectedParts.includes(level)
        )
      })
    }
    
    return segMatch
  })
  
  // Debug logging
  if (typeof window !== 'undefined') {
    // Get unique segments from filtered data
    const uniqueSegmentsInData = Array.from(new Set(filtered.map(r => r.segment)))
    
    console.log('🔍 Filter Debug:', {
      totalRecords: data.length,
      filteredRecords: filtered.length,
      filters: {
        segmentType: filters.segmentType,
        businessType: filters.businessType,
        geographies: filters.geographies,
        segments: filters.segments,
        segmentsCount: filters.segments?.length || 0
      },
      uniqueSegmentsInFilteredData: uniqueSegmentsInData,
      selectedSegments: filters.segments,
      segmentMatching: filters.segments?.map(selectedSeg => {
        const matches = filtered.filter(r => {
          // Check various matching conditions
          if (r.segment === selectedSeg) return true
          if (r.segment.startsWith(selectedSeg + ' > ')) return true
          if (selectedSeg.includes(' > ') && r.segment.startsWith(selectedSeg)) return true
          
          // Normalize and check
          const normalizePath = (path: string) => {
            const parts = path.split(' > ')
            if (parts[0] === 'B2B' || parts[0] === 'B2C') {
              return parts.slice(1).join(' > ')
            }
            return path
          }
          const normalizedRecord = normalizePath(r.segment)
          const normalizedSelected = normalizePath(selectedSeg)
          if (normalizedRecord === normalizedSelected) return true
          if (normalizedRecord.startsWith(normalizedSelected + ' > ')) return true
          
          return false
        })
        return {
          selectedSegment: selectedSeg,
          matchedRecords: matches.length,
          sampleMatches: matches.slice(0, 3).map(m => m.segment)
        }
      }),
      sampleFiltered: filtered.slice(0, 5).map(r => ({
        geography: r.geography,
        segment: r.segment,
        segment_type: r.segment_type,
        value: r.time_series?.[filters.yearRange[1]] || 0,
        hierarchy: r.segment_hierarchy
      }))
    })
    
    // Log sample of filtered records for deeper inspection
    if (filtered.length > 0) {
      console.log('📊 Sample filtered records:', filtered.slice(0, 5).map(r => ({
        geography: r.geography,
        segment: r.segment,
        segment_type: r.segment_type,
        businessType: r.segment_hierarchy?.level_1,
        year2025: r.time_series[2025]
      })))
    } else {
      console.warn('⚠️ No filtered records found! Check filters and data generation.')
      // Log sample of all records to debug
      console.log('📋 Sample of all records:', data.slice(0, 5).map(r => ({
        geography: r.geography,
        segment: r.segment,
        segmentType: r.segment_type,
        businessType: r.segment_hierarchy?.level_1
      })))
    }
  }
  
  return filtered
}

/**
 * Prepare data for grouped bar chart (Recharts format) with stacking support
 */
export function prepareGroupedBarData(
  records: DataRecord[],
  filters: FilterState & { advancedSegments?: any[] }
): ChartDataPoint[] {
  const { yearRange, viewMode, geographies, segments } = filters
  const [startYear, endYear] = yearRange
  
  // Check if India is selected and aggregate child geographies
  const hasIndia = geographies.includes('India')
  const childGeographies = new Set<string>()
  
  if (hasIndia) {
    // Find all child geographies of India (regions and states)
    records.forEach(record => {
      if (record.parent_geography === 'India' || 
          (record.geography_level === 'region' || record.geography_level === 'country')) {
        childGeographies.add(record.geography)
      }
    })
  }
  
  // Generate year range
  const years: number[] = []
  for (let year = startYear; year <= endYear; year++) {
    years.push(year)
  }
  
  // Determine if we need stacked bars
  const needsStacking = (viewMode === 'segment-mode' && geographies.length > 1) ||
                        (viewMode === 'geography-mode' && segments.length > 1)
  
  // Transform into Recharts format
  return years.map(year => {
    const dataPoint: ChartDataPoint = { year }
    const yearStr = year.toString()
    
    // Aggregate India's value from all child geographies if India is selected
    // IMPORTANT: Only aggregate if India is explicitly selected, don't mix with other geographies
    if (hasIndia && childGeographies.size > 0) {
      // Group by segment (for segment-mode) or just aggregate (for geography-mode)
      const indiaAggregated = new Map<string, number>() // segment -> total value
      
      records.forEach(record => {
        // Only aggregate child geographies, and only if they match the selected segments
        if (childGeographies.has(record.geography)) {
          // Check if this record matches selected segments (if any)
          const matchesSegment = segments.length === 0 || segments.some(seg => {
            return record.segment === seg || record.segment.startsWith(seg + ' > ')
          })
          
          if (matchesSegment) {
            const value = record.time_series[year] || 0
            
            if (viewMode === 'segment-mode') {
              // Aggregate by segment - each segment is aggregated separately
              const segment = record.segment
              const current = indiaAggregated.get(segment) || 0
              indiaAggregated.set(segment, current + value)
            } else {
              // For geography-mode, aggregate all segments for India
              // But only if segments are selected, otherwise skip (to avoid mixing)
              if (segments.length > 0) {
                const key = 'India'
                const current = indiaAggregated.get(key) || 0
                indiaAggregated.set(key, current + value)
              }
            }
          }
        }
      })
      
      // Add India aggregated values to dataPoint (only if we have data)
      indiaAggregated.forEach((value, key) => {
        if (viewMode === 'segment-mode') {
          // For segment-mode, add India as a separate geography entry per segment
          // Don't mix with other geographies' values for the same segment
          dataPoint[key] = (dataPoint[key] as number || 0) + value
        } else {
          // For geography-mode, add India as a separate geography
          dataPoint['India'] = (dataPoint['India'] as number || 0) + value
        }
      })
    }
    
    if (needsStacking) {
      // Stacked bar chart logic
      if (viewMode === 'segment-mode') {
        // Stack segments within each geography bar
        // Primary grouping: geographies (each becomes a bar)
        // Secondary grouping: segments (stacked within each bar)
        
        const geoMap = new Map<string, Map<string, number>>()
        
        // Initialize geoMap with all selected geographies (or all unique geographies from records)
        const allGeographies = geographies.length > 0 
          ? geographies 
          : Array.from(new Set(records.map(r => r.geography)))
        
        allGeographies.forEach(geo => {
          if (!geoMap.has(geo)) {
            geoMap.set(geo, new Map())
          }
        })
    
        records.forEach(record => {
          // Skip child geographies if India is selected (will aggregate separately)
          if (hasIndia && childGeographies.has(record.geography)) {
            return
          }
          
          const geography = record.geography
          const segment = record.segment
          
          // Find which selected segment this record belongs to (for matching)
          // Use the same simple matching logic as filterData uses
          let matchingSegment = segment
          let recordMatched = false
          if (segments.length > 0) {
            const found = segments.find(seg => {
              // Exact match
              if (record.segment === seg) return true
              
              // Check if selected segment is a parent of this record's segment
              if (record.segment.startsWith(seg + ' > ')) return true
              
              // Check if this record's segment is a parent of the selected segment
              if (seg.startsWith(record.segment + ' > ')) return true
              
              return false
            })
            if (found) {
              matchingSegment = found
              recordMatched = true
            }
          } else {
            // If no segments selected, include all records
            recordMatched = true
          }
          
          // Only process if record matched a selected segment (or no segments selected)
          if (!recordMatched) {
            return
          }
          
          if (!geoMap.has(geography)) {
            geoMap.set(geography, new Map())
          }
          
          const segmentMap = geoMap.get(geography)!
          const currentValue = segmentMap.get(matchingSegment) || 0
          const recordValue = record.time_series[year] || 0
          segmentMap.set(matchingSegment, currentValue + recordValue)
        })
        
        // Ensure all selected segments are included for all geographies (even if no data)
        // This ensures the chart shows all segments, even if some have 0 values
        if (segments.length > 0) {
          // Make sure all geographies are in the map
          allGeographies.forEach(geo => {
            if (!geoMap.has(geo)) {
              geoMap.set(geo, new Map())
            }
          })
          
          // Add all selected segments to all geographies
          Array.from(geoMap.keys()).forEach(geo => {
            const segMap = geoMap.get(geo)!
            segments.forEach(selectedSeg => {
              // If this segment doesn't exist for this geography, add it with 0 value
              if (!segMap.has(selectedSeg)) {
                segMap.set(selectedSeg, 0)
              }
            })
          })
        }
        
        // Debug: Log which segments have data
        if (typeof window !== 'undefined' && year === startYear) {
          console.log('📊 Stacked Data Debug:', {
            year,
            selectedSegments: segments,
            geoMapEntries: Array.from(geoMap.entries()).map(([geo, segMap]) => ({
              geography: geo,
              segments: Array.from(segMap.keys()),
              values: Array.from(segMap.entries()).map(([seg, val]) => ({ segment: seg, value: val }))
            }))
          })
        }
        
        // Add India aggregated values if India is selected
        // IMPORTANT: Only aggregate if segments are selected, to avoid mixing different entities
        if (hasIndia && childGeographies.size > 0 && segments.length > 0) {
          const indiaSegmentMap = new Map<string, number>() // segment -> total value
          
          records.forEach(record => {
            if (childGeographies.has(record.geography)) {
              // Only aggregate if this record matches selected segments
              const matchesSegment = segments.some(seg => {
                return record.segment === seg || record.segment.startsWith(seg + ' > ')
              })
              
              if (matchesSegment) {
                // Find which selected segment this record belongs to
                const found = segments.find(seg => {
                  if (record.segment === seg) return true
                  if (record.segment.startsWith(seg + ' > ')) return true
                  if (seg.includes(' > ') && record.segment.startsWith(seg)) return true
                  return false
                })
                
                if (found) {
                  const segment = found
                  const value = record.time_series[year] || 0
                  const current = indiaSegmentMap.get(segment) || 0
                  indiaSegmentMap.set(segment, current + value)
                }
              }
            }
          })
          
          // Add India to geography map with all segments
          if (!geoMap.has('India')) {
            geoMap.set('India', new Map())
          }
          const indiaSegments = geoMap.get('India')!
          indiaSegmentMap.forEach((value, segment) => {
            // India's segments are added separately, not mixed with other geographies' segments
            const current = indiaSegments.get(segment) || 0
            indiaSegments.set(segment, current + value)
          })
        }
        
        // Create stacked data keys: geography::segment
        geoMap.forEach((segmentMap, geography) => {
          segmentMap.forEach((value, segment) => {
            const key = `${geography}::${segment}`
            dataPoint[key] = value
          })
        })
        
      } else if (viewMode === 'geography-mode') {
        // In geography-mode with stacking:
        // Primary grouping: segments (each segment becomes a bar group)
        // Secondary grouping: geographies (stacked within each bar)
        // Key format: segment::geography (to match chart component)
        
        const geoMap = new Map<string, Map<string, number>>()
        
        // Initialize geoMap with all selected geographies (or all unique geographies from records)
        const allGeographies = geographies.length > 0 
          ? geographies 
          : Array.from(new Set(records.map(r => r.geography)))
        
        allGeographies.forEach(geo => {
          if (!geoMap.has(geo)) {
            geoMap.set(geo, new Map())
          }
        })
        
        records.forEach(record => {
          // Skip child geographies if India is selected (will aggregate separately)
          if (hasIndia && childGeographies.has(record.geography)) {
            return
          }
          
          // Normalize geography name to match selected geographies
          let normalizedGeography = record.geography
          if (geographies.length > 0) {
            const matchingGeo = geographies.find(geo => {
              const recordGeo = record.geography
              if (recordGeo === geo) return true
              if (recordGeo.startsWith(geo)) return true
              if (geo.startsWith(recordGeo)) return true
              if (recordGeo.includes(geo) || geo.includes(recordGeo)) return true
              return false
            })
            if (matchingGeo) {
              normalizedGeography = matchingGeo
            }
          }
          
          // Only process if this geography is in our map (matches selected geographies)
          if (!geoMap.has(normalizedGeography)) {
            return
          }
          
          const segment = record.segment
          
          // Find which selected segment this record belongs to (for matching)
          let matchingSegment = segment
          let recordMatched = false
          if (segments.length > 0) {
            const found = segments.find(seg => {
              // Exact match
              if (record.segment === seg) return true
              // Check if selected segment is a parent of this record's segment
              if (record.segment.startsWith(seg + ' > ')) return true
              // Check if this record's segment is a parent of the selected segment
              if (seg.startsWith(record.segment + ' > ')) return true
              return false
            })
            if (found) {
              matchingSegment = found
              recordMatched = true
            }
          } else {
            // If no segments selected, include all records
            recordMatched = true
          }
          
          // Only process if record matched a selected segment (or no segments selected)
          if (!recordMatched) {
            return
          }
          
          const segmentMap = geoMap.get(normalizedGeography)!
          const currentValue = segmentMap.get(matchingSegment) || 0
          const recordValue = record.time_series[year] || 0
          segmentMap.set(matchingSegment, currentValue + recordValue)
          })
          
          // Ensure all selected segments are included for all geographies (even if no data)
          if (segments.length > 0) {
            Array.from(geoMap.keys()).forEach(geo => {
              const segMap = geoMap.get(geo)!
              segments.forEach(selectedSeg => {
                // If this segment doesn't exist for this geography, add it with 0 value
                if (!segMap.has(selectedSeg)) {
                  segMap.set(selectedSeg, 0)
                }
              })
            })
          }
          
          // Add India aggregated values if India is selected
          // IMPORTANT: Only aggregate if segments are selected, to avoid mixing different entities
          if (hasIndia && childGeographies.size > 0 && segments.length > 0) {
            const indiaSegmentMap = new Map<string, number>() // segment -> total value
            
            records.forEach(record => {
              if (childGeographies.has(record.geography)) {
                // Only aggregate if this record matches selected segments
                const matchesSegment = segments.some(seg => {
                  return record.segment === seg || record.segment.startsWith(seg + ' > ')
                })
                
                if (matchesSegment) {
                  const segment = record.segment
                  const value = record.time_series[year] || 0
                  const current = indiaSegmentMap.get(segment) || 0
                  indiaSegmentMap.set(segment, current + value)
                }
              }
            })
            
            // Add India with all segments (as a separate geography, not mixed)
            if (!geoMap.has('India')) {
              geoMap.set('India', new Map())
            }
            const indiaSegments = geoMap.get('India')!
            indiaSegmentMap.forEach((value, segment) => {
              // India's segments are added separately, not mixed with other geographies' segments
              const current = indiaSegments.get(segment) || 0
              indiaSegments.set(segment, current + value)
            })
          }
          
        // Create stacked data keys: segment::geography (to match chart component series format)
        geoMap.forEach((segmentMap, geography) => {
          segmentMap.forEach((value, segment) => {
            // In geography-mode, primary is segment, secondary is geography
            // So key format should be: segment::geography
            const key = `${segment}::${geography}`
            dataPoint[key] = value
          })
        })
          }
      } else {
      // Original non-stacked logic
      const aggregatedData: Record<string, number> = {}
      
      records.forEach(record => {
        // Skip child geographies if India is selected (already aggregated above)
        if (hasIndia && childGeographies.has(record.geography)) {
          return
        }
        
        let key: string
        
        if (viewMode === 'segment-mode') {
          // In segment-mode, aggregate by segment name
          // If segments are selected, use the selected segment name as key (for matching with series)
          if (segments.length > 0) {
            // Find which selected segment this record belongs to
            const matchingSegment = segments.find(seg => {
              // Exact match
              if (record.segment === seg) return true
              // Record is a child of selected segment
              if (record.segment.startsWith(seg + ' > ')) return true
              // Selected segment is a parent of record
              if (seg.includes(' > ') && record.segment.startsWith(seg)) return true
              return false
            })
            
            if (matchingSegment) {
              // Use the selected segment name as key to match with series
              key = matchingSegment
            } else {
              // Use the actual record segment name
              key = record.segment
            }
          } else {
            key = record.segment
          }
        } else if (viewMode === 'geography-mode') {
          // In geography-mode, aggregate by geography name
          // Normalize geography name to match selected geographies (handle name variations)
          if (geographies.length > 0) {
            // Find which selected geography this record matches
            const matchingGeo = geographies.find(geo => {
              const recordGeo = record.geography
              if (recordGeo === geo) return true
              if (recordGeo.startsWith(geo)) return true
              if (geo.startsWith(recordGeo)) return true
              if (recordGeo.includes(geo) || geo.includes(recordGeo)) return true
              return false
            })
            // Use the selected geography name as key (normalized) to match with series
            key = matchingGeo || record.geography
          } else {
            key = record.geography
          }
        } else if (viewMode === 'matrix') {
         key = `${record.geography}::${record.segment}`
       } else {
         key = record.geography
       }
       
       if (!aggregatedData[key]) {
         aggregatedData[key] = 0
       }
        aggregatedData[key] += record.time_series[year] || 0
     })
      
     Object.entries(aggregatedData).forEach(([key, value]) => {
       dataPoint[key] = (dataPoint[key] as number || 0) + value
     })
      }
    
    return dataPoint
  })
}

/**
 * Prepare data for line chart (multi-series)
 */
export function prepareLineChartData(
  records: DataRecord[],
  filters: FilterState
): ChartDataPoint[] {
  const { yearRange, viewMode, geographies, segments } = filters
  const [startYear, endYear] = yearRange
  
  // Check if India is selected and aggregate child geographies
  const hasIndia = geographies.includes('India')
  const childGeographies = new Set<string>()
  
  if (hasIndia) {
    records.forEach(record => {
      if (record.parent_geography === 'India' || 
          (record.geography_level === 'region' || record.geography_level === 'country')) {
        childGeographies.add(record.geography)
      }
    })
  }
  
  // Generate year range
  const years: number[] = []
  for (let year = startYear; year <= endYear; year++) {
    years.push(year)
  }
  
  // Transform into Recharts format for line charts
  // Line charts always aggregate data by the primary dimension
  return years.map(year => {
    const dataPoint: ChartDataPoint = { year }
    const yearStr = year.toString()
    
    // Group data by the dimension we want to show as lines
    const aggregated = new Map<string, number>()
    
    records.forEach(record => {
      // Skip child geographies if India is selected (will aggregate separately)
      if (hasIndia && childGeographies.has(record.geography)) {
        return
      }
      
      let key: string
      
      if (viewMode === 'segment-mode') {
        // Lines represent segments (aggregate across geographies)
        key = record.segment
      } else if (viewMode === 'geography-mode') {
        // Lines represent geographies (aggregate across segments)
        key = record.geography
      } else if (viewMode === 'matrix') {
        // Lines represent geography-segment combinations
        key = `${record.geography}::${record.segment}`
      } else {
        // Default to geography
        key = record.geography
      }
      
      const currentValue = aggregated.get(key) || 0
      const recordValue = record.time_series[year] || 0
      aggregated.set(key, currentValue + recordValue)
    })
    
    // Aggregate India's value from all child geographies if India is selected
    // IMPORTANT: Only aggregate if segments are selected, to avoid mixing different entities
    if (hasIndia && childGeographies.size > 0 && segments.length > 0) {
      const indiaAggregated = new Map<string, number>() // segment or geography -> total value
      
      records.forEach(record => {
        if (childGeographies.has(record.geography)) {
          // Only aggregate if this record matches selected segments
          const matchesSegment = segments.some(seg => {
            return record.segment === seg || record.segment.startsWith(seg + ' > ')
          })
          
          if (matchesSegment) {
            const value = record.time_series[year] || 0
            
            if (viewMode === 'segment-mode') {
              const segment = record.segment
              const current = indiaAggregated.get(segment) || 0
              indiaAggregated.set(segment, current + value)
            } else {
              const key = 'India'
              const current = indiaAggregated.get(key) || 0
              indiaAggregated.set(key, current + value)
            }
          }
        }
      })
      
      // Add India aggregated values (as a separate entity, not mixed)
      indiaAggregated.forEach((value, key) => {
        const current = aggregated.get(key) || 0
        aggregated.set(key, current + value)
      })
    }
    
    // Add aggregated values to dataPoint
    aggregated.forEach((value, key) => {
      dataPoint[key] = value
    })
    
    return dataPoint
  })
}

/**
 * Prepare data for heatmap
 */
export function prepareHeatmapData(
  records: DataRecord[],
  year: number
): HeatmapCell[] {
  const cells: HeatmapCell[] = []
  
  records.forEach(record => {
    // JSON keys are strings
    const yearStr = year.toString()
    const value = record.time_series[year] || 0
    
    cells.push({
      geography: record.geography,
      segment: record.segment,
      value,
      displayValue: value.toFixed(2)
    })
  })
  
  return cells
}

/**
 * Prepare data for comparison table
 */
export function prepareTableData(
  records: DataRecord[],
  filters: FilterState
): ComparisonTableRow[] {
  const { yearRange } = filters
  const [startYear, endYear] = yearRange
  
  return records.map(record => {
    // JSON keys are strings
    const startYearStr = filters.yearRange[0].toString()
    const endYearStr = filters.yearRange[1].toString()
    const baseValue = record.time_series[filters.yearRange[0]] || 0
    const forecastValue = record.time_series[filters.yearRange[1]] || 0
    const growth = baseValue > 0 
      ? ((forecastValue - baseValue) / baseValue) * 100
      : 0
    
    // Extract time series for sparkline
    const timeSeries: number[] = []
    for (let year = startYear; year <= endYear; year++) {
      const yearStr = year.toString()
      timeSeries.push(record.time_series[year] || 0)
    }
    
    return {
      geography: record.geography,
      segment: record.segment,
      baseYear: baseValue,
      forecastYear: forecastValue,
      cagr: record.cagr,
      growth,
      timeSeries
    }
  })
}

/**
 * Get unique geographies from filtered data
 */
export function getUniqueGeographies(records: DataRecord[]): string[] {
  const geos = new Set<string>()
  records.forEach(record => geos.add(record.geography))
  return Array.from(geos)
}

/**
 * Get unique segments from filtered data
 * Returns only parent segments if they exist, otherwise returns leaf segments
 */
export function getUniqueSegments(records: DataRecord[]): string[] {
  const segments = new Set<string>()
  const parentSegments = new Set<string>()
  const childSegments = new Map<string, string[]>() // parent -> children mapping
  
  // First pass: identify all parent and leaf segments
  records.forEach(record => {
    if (record.segment_level === 'parent') {
      parentSegments.add(record.segment)
    } else {
      // Check if this leaf has a parent in the hierarchy
      const parentInHierarchy = record.segment_hierarchy.level_2
      if (parentInHierarchy && parentInHierarchy !== record.segment) {
        if (!childSegments.has(parentInHierarchy)) {
          childSegments.set(parentInHierarchy, [])
        }
        childSegments.get(parentInHierarchy)!.push(record.segment)
      }
    }
  })
  
  // Second pass: add segments to the result
  records.forEach(record => {
    // If this is a parent segment, always include it
    if (record.segment_level === 'parent') {
      segments.add(record.segment)
    } else {
      // For leaf segments, only add if their parent is NOT in the parent segments set
      const parentInHierarchy = record.segment_hierarchy.level_2
      if (!parentSegments.has(parentInHierarchy)) {
        segments.add(record.segment)
      }
    }
  })
  
  return Array.from(segments)
}

/**
 * Prepare data for waterfall chart
 * Shows contribution breakdown from start to end value
 */
export function prepareWaterfallData(
  records: DataRecord[],
  filters: FilterState
): Array<{ name: string; value: number; type: 'start' | 'positive' | 'negative' | 'end' }> {
  const [startYear, endYear] = filters.yearRange
  
  // Group records by the dimension we're analyzing
  const groupKey = filters.viewMode === 'segment-mode' ? 'segment' : 'geography'
  
  // Calculate starting total
  let startTotal = 0
  const startYearStr = startYear.toString()
  const endYearStr = endYear.toString()
  records.forEach(record => {
    startTotal += record.time_series[startYear] || 0
  })
  
  // Group and calculate contributions
  const grouped = new Map<string, number>()
  records.forEach(record => {
    const key = record[groupKey]
    const startValue = record.time_series[startYear] || 0
    const endValue = record.time_series[endYear] || 0
    const change = endValue - startValue
    
    grouped.set(key, (grouped.get(key) || 0) + change)
  })
  
  // Build waterfall data
  const waterfallData: Array<{ name: string; value: number; type: 'start' | 'positive' | 'negative' | 'end' }> = []
  
  // Starting value
  waterfallData.push({
    name: `Start (${startYear})`,
    value: startTotal,
    type: 'start'
  })
  
  // Sort contributions by absolute value (largest first)
  const sortedContributions = Array.from(grouped.entries())
    .sort((a, b) => Math.abs(b[1]) - Math.abs(a[1]))
  
  // Add positive contributions
  sortedContributions.forEach(([name, change]) => {
    if (change > 0) {
      waterfallData.push({
        name,
        value: change,
        type: 'positive'
      })
    }
  })
  
  // Add negative contributions
  sortedContributions.forEach(([name, change]) => {
    if (change < 0) {
      waterfallData.push({
        name,
        value: Math.abs(change),
        type: 'negative'
      })
    }
  })
  
  // Calculate ending total
  let endTotal = 0
  records.forEach(record => {
    endTotal += record.time_series[endYear] || 0
  })
  
  // Ending value
  waterfallData.push({
    name: `End (${endYear})`,
    value: endTotal,
    type: 'end'
  })
  
  return waterfallData
}

/**
 * Calculate aggregated totals
 */
export function calculateTotals(
  records: DataRecord[],
  year: number
): { total: number; count: number; average: number } {
  let total = 0
  let count = 0
  const yearStr = year.toString()
  
  records.forEach(record => {
    const value = record.time_series[year] || 0
    total += value
    count++
  })
  
  return {
    total,
    count,
    average: count > 0 ? total / count : 0
  }
}

/**
 * Find top performers
 */
export function findTopPerformers(
  records: DataRecord[],
  year: number,
  limit: number = 5
): Array<{ name: string; value: number }> {
  const yearStr = year.toString()
  const performers = records.map(record => ({
    name: `${record.geography} - ${record.segment}`,
    value: record.time_series[year] || 0
  }))
  
  return performers
    .sort((a, b) => b.value - a.value)
    .slice(0, limit)
}

/**
 * Find fastest growing
 */
export function findFastestGrowing(
  records: DataRecord[],
  limit: number = 5
): Array<{ name: string; cagr: number }> {
  const growing = records.map(record => ({
    name: `${record.geography} - ${record.segment}`,
    cagr: record.cagr
  }))
  
  return growing
    .sort((a, b) => b.cagr - a.cagr)
    .slice(0, limit)
}

