'use client'

import { useMemo, useState } from 'react'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from 'recharts'
import { CHART_THEME, getChartColor, CHART_COLORS } from '@/lib/chart-theme'
import { filterData, prepareGroupedBarData, getUniqueGeographies, getUniqueSegments } from '@/lib/data-processor'
import { useDashboardStore } from '@/lib/store'
import type { DataRecord } from '@/lib/types'

interface GroupedBarChartProps {
  title?: string
  height?: number
  segmentFilter?: string // Optional: filter to a specific segment
}

function GroupedBarChartSingle({ title, height = 400, segmentFilter }: GroupedBarChartProps) {
  const { data, filters } = useDashboardStore()
  const [hoveredBar, setHoveredBar] = useState<string | null>(null)
  
  // Create modified filters for this specific segment
  const modifiedFilters = segmentFilter 
    ? { ...filters, segments: [segmentFilter] }
    : filters

  const chartData = useMemo(() => {
    if (!data) return { data: [], series: [], stackedSeries: null }

    // Get the appropriate dataset
    const dataset = modifiedFilters.dataType === 'value'
      ? data.data.value.geography_segment_matrix
      : data.data.volume.geography_segment_matrix

    console.log('📊 Chart Data Debug:', {
      totalDataset: dataset.length,
      filters: modifiedFilters,
      segmentFilter,
      sampleData: dataset.slice(0, 2)
    })

    // Filter data
    const filtered = filterData(dataset, modifiedFilters)

    console.log('📊 After filtering:', {
      filteredCount: filtered.length,
      sampleFiltered: filtered.slice(0, 2)
    })

    // Prepare chart data
    const prepared = prepareGroupedBarData(filtered, modifiedFilters)

    console.log('📊 Prepared chart data:', {
      preparedLength: prepared.length,
      samplePrepared: prepared.slice(0, 2)
    })

    // Determine if we're using stacked bars
    // When showing a single segment, we don't stack (just show geographies)
    // Stack when we have multiple segments in segment-mode (to show segment breakdown per geography)
    // or multiple geographies in geography-mode (to show geography breakdown per segment)
    const isStacked = !segmentFilter && (
      (modifiedFilters.viewMode === 'segment-mode' && modifiedFilters.segments.length > 1 && modifiedFilters.geographies.length > 1) ||
      (modifiedFilters.viewMode === 'geography-mode' && modifiedFilters.geographies.length > 1 && modifiedFilters.segments.length > 1)
    )

    let series: string[] = []
    let stackedSeries: { primary: string[], secondary: string[] } | null = null

    if (isStacked) {
      // Stacked bar logic
      if (modifiedFilters.viewMode === 'segment-mode') {
        // Primary: geographies (bar groups), Secondary: segments (stacks within each bar)
        const uniqueGeographies = getUniqueGeographies(filtered)
        const uniqueSegments = getUniqueSegments(filtered)
        
        // Use selected geographies if available
        const primaryGeos = modifiedFilters.geographies.length > 0 
          ? modifiedFilters.geographies.filter(geo => uniqueGeographies.includes(geo))
          : uniqueGeographies
        
        // Use selected segments if available - always use selected segments for stacking
        const secondarySegs = modifiedFilters.segments.length > 0
          ? modifiedFilters.segments // Use selected segments directly - data preparation will match them
          : uniqueSegments
        
        stackedSeries = {
          primary: primaryGeos,
          secondary: secondarySegs
        }
        
        // Create series for each geography::segment combination
        series = []
        primaryGeos.forEach(geo => {
          secondarySegs.forEach(segment => {
            series.push(`${geo}::${segment}`)
          })
        })
      } else if (modifiedFilters.viewMode === 'geography-mode') {
        // Primary: segments (bar groups), Secondary: geographies (stacks within each bar)
        const uniqueSegments = getUniqueSegments(filtered)
        const uniqueGeographies = getUniqueGeographies(filtered)
        
        // Use selected segments if available
        const primarySegs = modifiedFilters.segments.length > 0
          ? modifiedFilters.segments.filter(seg => {
              return uniqueSegments.some(us => us === seg || us.startsWith(seg + ' > ') || seg.startsWith(us + ' > '))
            })
          : uniqueSegments
        
        // Use selected geographies if available
        const secondaryGeos = modifiedFilters.geographies.length > 0
          ? modifiedFilters.geographies.filter(geo => uniqueGeographies.includes(geo))
          : uniqueGeographies
        
        stackedSeries = {
          primary: primarySegs,
          secondary: secondaryGeos
        }
        
        // Create series for each segment::geography combination
        series = []
        primarySegs.forEach(segment => {
          secondaryGeos.forEach(geo => {
            series.push(`${segment}::${geo}`)
          })
        })
      }
    } else {
      // Non-stacked bars
      if (modifiedFilters.viewMode === 'segment-mode') {
        // Show each selected segment as a separate bar
        // If segments are explicitly selected, use those directly
        if (modifiedFilters.segments && modifiedFilters.segments.length > 0) {
          // Use selected segments directly - the data preparation will aggregate child segments under the parent
          series = modifiedFilters.segments
          
          // Verify that we have data for these segments by checking the prepared data
          const availableKeys = new Set<string>()
          prepared.forEach(dp => {
            Object.keys(dp).forEach(key => {
              if (key !== 'year') {
                availableKeys.add(key)
              }
            })
          })
          
          // Filter series to only include those that have data
          series = series.filter(seg => {
            // Check for exact match
            if (availableKeys.has(seg)) return true
            // Check if any key starts with this segment (child segments aggregated under parent)
            return Array.from(availableKeys).some(key => key.startsWith(seg + ' > ') || seg.startsWith(key + ' > '))
          })
          
          // If no matches, try to use keys from prepared data
          if (series.length === 0 && availableKeys.size > 0) {
            series = Array.from(availableKeys)
          }
        } else {
          // No segments selected - use unique segments from filtered data
          series = getUniqueSegments(filtered)
        }
      } else if (modifiedFilters.viewMode === 'geography-mode') {
        // Show each selected geography as a separate bar
        // If geographies are explicitly selected, use those; otherwise use unique geographies from filtered data
        if (modifiedFilters.geographies && modifiedFilters.geographies.length > 0) {
          // Use selected geographies, but only include those that exist in filtered data
          const filteredGeographies = getUniqueGeographies(filtered)
          series = modifiedFilters.geographies.filter(geo => filteredGeographies.includes(geo))
          // If no matches, fall back to filtered geographies
          if (series.length === 0) {
            series = filteredGeographies
          }
        } else {
          series = getUniqueGeographies(filtered)
        }
      } else {
        // Default: use segments
        series = getUniqueSegments(filtered)
      }
      
      // Remove duplicates
      series = Array.from(new Set(series))
    }
    
    // Log for debugging
    console.log('📊 Final Series:', series)
    console.log('📊 Prepared Data Keys:', prepared.length > 0 ? Object.keys(prepared[0]).filter(k => k !== 'year') : [])

    console.log('📊 Series:', series)
    console.log('📊 Stacked Series:', stackedSeries)

    return { data: prepared, series, stackedSeries, isStacked }
  }, [data, modifiedFilters, segmentFilter])

  // Check if too many segments (likely means no filter applied)
  const hasTooManySegments = chartData.series.length > 50
  
  // Check if we have no geographies selected
  const hasNoGeographies = modifiedFilters.geographies.length === 0
  
  if (!data || chartData.data.length === 0) {
    return (
      <div className="flex items-center justify-center h-96 bg-gray-50 rounded-lg">
        <div className="text-center">
          <p className="text-gray-500">No data to display</p>
          <p className="text-sm text-gray-400 mt-1">
            {hasNoGeographies 
              ? 'Please select at least one geography from the filter panel'
              : 'Try adjusting your filters'
            }
          </p>
        </div>
      </div>
    )
  }
  
  // Check if we have series but no data values
  const hasDataValues = chartData.data.some(dp => {
    return chartData.series.some(seriesName => {
      const value = dp[seriesName]
      if (value === undefined || value === null) return false
      const numValue = typeof value === 'number' ? value : Number(value)
      return !isNaN(numValue) && numValue > 0
    })
  })
  
  if (!hasDataValues && chartData.series.length > 0) {
    return (
      <div className="flex items-center justify-center h-96 bg-yellow-50 rounded-lg border border-yellow-200">
        <div className="text-center max-w-md">
          <p className="text-yellow-800 font-medium mb-2">
            No data found for selected filters
          </p>
          <p className="text-sm text-yellow-700 mb-4">
            The selected segment "{modifiedFilters.segments[0]}" may not have data for the selected geographies.
          </p>
          <p className="text-xs text-yellow-600">
            💡 Tip: Try selecting different geographies or segments from the filter panel
          </p>
        </div>
      </div>
    )
  }
  
  if (hasTooManySegments) {
    return (
      <div className="flex items-center justify-center h-96 bg-yellow-50 rounded-lg border border-yellow-200">
        <div className="text-center max-w-md">
          <p className="text-yellow-800 font-medium mb-2">
            Too many segments to display ({chartData.series.length})
          </p>
          <p className="text-sm text-yellow-700 mb-4">
            Please select specific segments from the filter panel to visualize the data.
          </p>
          <p className="text-xs text-yellow-600">
            💡 Tip: Use the segment filter to select up to 10-20 segments for better visualization
          </p>
        </div>
      </div>
    )
  }

  const yAxisLabel = modifiedFilters.dataType === 'value'
    ? `Market Value (${data.metadata.currency} ${data.metadata.value_unit})`
    : `Market Volume (${data.metadata.volume_unit})`

  // Matrix view should use heatmap instead
  if (modifiedFilters.viewMode === 'matrix') {
    return (
      <div className="flex items-center justify-center h-96 bg-gray-50 rounded-lg">
        <div className="text-center">
          <p className="text-gray-500 text-lg font-medium">Matrix View Active</p>
          <p className="text-sm text-gray-400 mt-2">
            Please switch to the Heatmap tab to see the matrix visualization
          </p>
          <p className="text-xs text-gray-400 mt-1">
            Bar charts work best with Segment Mode or Geography Mode
          </p>
        </div>
      </div>
    )
  }

  // Custom tooltip for stacked bars
  const CustomTooltip = ({ active, payload, label, coordinate }: any) => {
    if (!active || !payload || !payload.length) return null

    const year = label
    const unit = modifiedFilters.dataType === 'value'
      ? `${data.metadata.currency} ${data.metadata.value_unit}`
      : data.metadata.volume_unit

    if (chartData.isStacked && chartData.stackedSeries) {
      // Stacked tooltip - show all segments/geographies for the hovered bar
      // Group payload by primary dimension (geography in segment-mode, segment in geography-mode)
      const groupedByPrimary = new Map<string, Array<{name: string, value: number, color: string}>>()
      
      payload.forEach((entry: any) => {
        if (!entry.value || entry.value === 0) return
        
        const [primary, secondary] = entry.dataKey.split('::')
        if (!primary || !secondary) return
        
        if (!groupedByPrimary.has(primary)) {
          groupedByPrimary.set(primary, [])
        }
        
        groupedByPrimary.get(primary)!.push({
          name: secondary,
          value: entry.value,
          color: entry.color
        })
      })
      
      // Show all primary groups (geographies or segments) with their breakdowns
      const primaryGroups = Array.from(groupedByPrimary.entries())
      
      if (primaryGroups.length === 0) return null
      
      return (
        <div className="bg-white p-4 border border-gray-200 rounded-lg shadow-lg min-w-[280px] max-w-[400px]">
          <p className="font-semibold text-gray-900 mb-3 pb-2 border-b border-gray-200">
            Year: <span className="text-blue-600">{year}</span>
          </p>
          
          {primaryGroups.map(([primaryName, items], groupIdx) => {
            const total = items.reduce((sum, item) => sum + item.value, 0)
            
            return (
              <div key={groupIdx} className={groupIdx > 0 ? "mt-4 pt-4 border-t border-gray-200" : ""}>
                <div className="font-semibold text-gray-800 mb-2">{primaryName}</div>
                {items.map((item, idx) => (
                  <div key={idx} className="flex items-center justify-between gap-4 ml-2 mb-1.5">
                    <div className="flex items-center gap-2">
                      <div 
                        className="w-3 h-3 rounded" 
                        style={{ backgroundColor: item.color }}
                      />
                      <span className="text-sm text-gray-700">{item.name}</span>
                    </div>
                    <span className="text-sm font-medium text-gray-900">
                      {item.value.toLocaleString(undefined, { 
                        minimumFractionDigits: 2, 
                        maximumFractionDigits: 2 
                      })} {unit}
                    </span>
                  </div>
                ))}
                {items.length > 1 && (
                  <div className="flex items-center justify-between gap-4 mt-2 pt-2 border-t border-gray-100">
                    <span className="text-sm font-semibold text-gray-800 ml-2">Total</span>
                    <span className="text-sm font-bold text-gray-900">
                      {total.toLocaleString(undefined, { 
                        minimumFractionDigits: 2, 
                        maximumFractionDigits: 2 
                      })} {unit}
                    </span>
                  </div>
                )}
              </div>
            )
          })}
          
          <div className="mt-3 pt-2 border-t border-gray-200 space-y-1">
            <div className="text-xs text-gray-500">
              {modifiedFilters.viewMode === 'segment-mode' 
                ? `Showing segment breakdown for ${primaryGroups.length} geograph${primaryGroups.length !== 1 ? 'ies' : 'y'}`
                : `Showing geography breakdown for ${primaryGroups.length} segment${primaryGroups.length !== 1 ? 's' : ''}`
              }
            </div>
            {modifiedFilters.segments && modifiedFilters.segments.length > 0 && (
              <div className="text-xs text-gray-600 mt-2">
                <div className="font-medium text-gray-700 mb-1">Selected Segments:</div>
                <div className="flex flex-wrap gap-1">
                  {modifiedFilters.segments.slice(0, 3).map((segment, idx) => (
                    <span key={idx} className="px-2 py-0.5 bg-blue-50 text-blue-700 rounded text-xs" title={segment}>
                      {segment.length > 30 ? segment.substring(0, 30) + '...' : segment}
                    </span>
                  ))}
                  {modifiedFilters.segments.length > 3 && (
                    <span className="px-2 py-0.5 bg-gray-100 text-gray-600 rounded text-xs">
                      +{modifiedFilters.segments.length - 3} more
                    </span>
                  )}
                </div>
              </div>
            )}
            {modifiedFilters.geographies && modifiedFilters.geographies.length > 0 && (
              <div className="text-xs text-gray-600 mt-2">
                <div className="font-medium text-gray-700 mb-1">Selected Geographies:</div>
                <div className="flex flex-wrap gap-1">
                  {modifiedFilters.geographies.slice(0, 3).map((geo, idx) => (
                    <span key={idx} className="px-2 py-0.5 bg-green-50 text-green-700 rounded text-xs">
                      {geo}
                    </span>
                  ))}
                  {modifiedFilters.geographies.length > 3 && (
                    <span className="px-2 py-0.5 bg-gray-100 text-gray-600 rounded text-xs">
                      +{modifiedFilters.geographies.length - 3} more
                    </span>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      )
    }

    // Non-stacked tooltip (original)
    return (
      <div className="bg-white p-4 border border-gray-200 rounded-lg shadow-lg min-w-[250px]">
        <p className="font-semibold text-gray-900 mb-3 pb-2 border-b border-gray-200">
          Year: <span className="text-blue-600">{year}</span>
        </p>
        <div className="space-y-2">
          {payload.map((entry: any, index: number) => {
            // Get the actual name from the dataKey or name
            const displayName = entry.dataKey || entry.name || 'Unknown'
            
            return (
              <div key={index} className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-2">
                  <div 
                    className="w-3 h-3 rounded" 
                    style={{ backgroundColor: entry.color }}
                  />
                  <span className="text-sm font-medium text-gray-700" title={displayName}>
                    {displayName.length > 40 ? displayName.substring(0, 40) + '...' : displayName}
                  </span>
                </div>
                <div className="text-right">
                  <span className="text-sm font-semibold text-gray-900">
                    {entry.value?.toLocaleString(undefined, { 
                      minimumFractionDigits: 2, 
                      maximumFractionDigits: 2 
                    }) || '0.00'}
                  </span>
                  <span className="text-xs text-gray-500 ml-1">
                    {unit}
                  </span>
                </div>
              </div>
            )
          })}
        </div>
        <div className="mt-3 pt-2 border-t border-gray-200 space-y-1">
          <div className="text-xs text-gray-500">
            {modifiedFilters.viewMode === 'segment-mode' 
              ? `Comparing ${payload.length} segment${payload.length !== 1 ? 's' : ''} across selected geographies`
              : `Comparing ${payload.length} geograph${payload.length !== 1 ? 'ies' : 'y'} for selected segments`
            }
          </div>
          {modifiedFilters.segments && modifiedFilters.segments.length > 0 && (
            <div className="text-xs text-gray-600 mt-2">
              <div className="font-medium text-gray-700 mb-1">Selected Segments:</div>
              <div className="flex flex-wrap gap-1">
                {modifiedFilters.segments.slice(0, 3).map((segment, idx) => (
                  <span key={idx} className="px-2 py-0.5 bg-blue-50 text-blue-700 rounded text-xs" title={segment}>
                    {segment.length > 30 ? segment.substring(0, 30) + '...' : segment}
                  </span>
                ))}
                {modifiedFilters.segments.length > 3 && (
                  <span className="px-2 py-0.5 bg-gray-100 text-gray-600 rounded text-xs">
                    +{modifiedFilters.segments.length - 3} more
                  </span>
                )}
              </div>
            </div>
          )}
          {modifiedFilters.geographies && modifiedFilters.geographies.length > 0 && (
            <div className="text-xs text-gray-600 mt-2">
              <div className="font-medium text-gray-700 mb-1">Selected Geographies:</div>
              <div className="flex flex-wrap gap-1">
                {modifiedFilters.geographies.slice(0, 3).map((geo, idx) => (
                  <span key={idx} className="px-2 py-0.5 bg-green-50 text-green-700 rounded text-xs">
                    {geo}
                  </span>
                ))}
                {modifiedFilters.geographies.length > 3 && (
                  <span className="px-2 py-0.5 bg-gray-100 text-gray-600 rounded text-xs">
                    +{modifiedFilters.geographies.length - 3} more
                  </span>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    )
  }

  // If this is a single segment chart, add segment name to title
  const displayTitle = segmentFilter 
    ? `${title || 'Comparative Analysis'} - ${segmentFilter.split(' > ').pop() || segmentFilter}`
    : title

  return (
    <div className="w-full">
      {displayTitle && (
        <h3 className="text-lg font-semibold mb-4 text-gray-900">{displayTitle}</h3>
      )}
      
      <ResponsiveContainer width="100%" height={height}>
        <BarChart data={chartData.data}>
          <CartesianGrid {...CHART_THEME.grid} />
          <XAxis
            dataKey="year"
            tick={{ fontSize: 12, fill: '#000000' }}
            label={{ value: 'Year', position: 'insideBottom', offset: -5, fill: '#000000' }}
          />
          <YAxis
            tick={{ fontSize: 12, fill: '#000000' }}
            label={{ value: yAxisLabel, angle: -90, position: 'insideLeft', fill: '#000000' }}
          />
          <Tooltip 
            content={<CustomTooltip />} 
            trigger="hover"
            isAnimationActive={false}
            wrapperStyle={{ zIndex: 1000 }}
          />
          <Legend 
            {...CHART_THEME.legend}
            content={(props) => {
              const { payload } = props
              if (!payload || !chartData.isStacked || !chartData.stackedSeries) {
                // Default legend for non-stacked
                return (
                  <ul className="flex flex-wrap justify-center gap-4 mt-4">
                    {payload?.map((entry: any, index: number) => (
                      <li key={`item-${index}`} className="flex items-center gap-2">
                        <span
                          className="inline-block w-3 h-3 rounded"
                          style={{ backgroundColor: entry.color }}
                        />
                        <span className="text-sm text-black font-medium">{entry.value}</span>
                      </li>
                    ))}
                  </ul>
                )
              }

              // Custom legend for stacked bars - show secondary dimension (segments in segment-mode, geographies in geography-mode)
              const uniqueSecondary = new Set<string>()
              const legendItems: Array<{name: string, color: string}> = []
              
              payload.forEach((entry: any) => {
                const [, secondary] = entry.value.split('::')
                if (secondary && !uniqueSecondary.has(secondary)) {
                  uniqueSecondary.add(secondary)
                  // Get color from the first entry with this secondary value
                  const firstEntry = payload.find((e: any) => {
                    const [, sec] = e.value.split('::')
                    return sec === secondary
                  })
                  legendItems.push({
                    name: secondary,
                    color: firstEntry?.color || entry.color
                  })
                }
              })
                        
              return (
                <ul className="flex flex-wrap justify-center gap-4 mt-4">
                  {legendItems.map((item, index) => (
                    <li key={`item-${index}`} className="flex items-center gap-2">
                      <span
                        className="inline-block w-3 h-3 rounded"
                        style={{ backgroundColor: item.color }}
                      />
                      <span className="text-sm text-black font-medium" title={item.name}>
                        {item.name.length > 40 ? item.name.substring(0, 40) + '...' : item.name}
                      </span>
                    </li>
                  ))}
                </ul>
              )
            }}
          />
          
          {chartData.isStacked && chartData.stackedSeries ? (
            // Render stacked bars
            chartData.stackedSeries.primary.map((primary, primaryIdx) => {
              // Get all series for this primary dimension
              const primarySeries = chartData.series.filter(s => {
                if (modifiedFilters.viewMode === 'segment-mode') {
                  // In segment-mode: primary is geography, format is "geo::segment"
                  return s.startsWith(`${primary}::`)
                } else {
                  // In geography-mode: primary is segment, format is "segment::geo"
                  return s.startsWith(`${primary}::`)
                }
              })
              
              return primarySeries.map((seriesName, secondaryIdx) => {
                const [, secondary] = seriesName.split('::')
                // Get the index of this secondary item in the stackedSeries.secondary array for consistent coloring
                const secondaryIndex = chartData.stackedSeries?.secondary.indexOf(secondary) ?? secondaryIdx
                return (
                  <Bar
                    key={seriesName}
                    dataKey={seriesName}
                    stackId={primary}
                    fill={getChartColor(primaryIdx, secondaryIndex)}
                    name={seriesName}
                  />
                )
              })
            }).flat()
          ) : (
            // Render non-stacked bars
            chartData.series.map((seriesName, index) => (
            <Bar
              key={seriesName}
              dataKey={seriesName}
              fill={getChartColor(index)}
              name={seriesName}
            />
            ))
          )}
        </BarChart>
      </ResponsiveContainer>

      {chartData.series.length > 0 && (
        <div className="mt-4 text-sm text-black font-medium text-center">
          {chartData.isStacked ? (
            <>
              Comparing {chartData.stackedSeries?.primary.length} {modifiedFilters.viewMode === 'segment-mode' ? 'segments' : 'geographies'}
              {' '}with {chartData.stackedSeries?.secondary.length} {modifiedFilters.viewMode === 'segment-mode' ? 'geography' : 'segment'} breakdown
            </>
          ) : (
            <>
        Comparing {chartData.series.length} {modifiedFilters.viewMode === 'segment-mode' ? 'segments' : 'geographies'} 
            </>
          )}
        {' '}from {modifiedFilters.yearRange[0]} to {modifiedFilters.yearRange[1]}
        </div>
      )}
    </div>
  )
}

// Main export - always renders a single combined chart
export function GroupedBarChart({ title, height = 400 }: Omit<GroupedBarChartProps, 'segmentFilter'>) {
  // Always render a single combined chart to compare all segments/geographies together
  return <GroupedBarChartSingle title={title} height={height} />
}