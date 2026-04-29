'use client'

import { useMemo } from 'react'
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from 'recharts'
import { CHART_THEME, getChartColor } from '@/lib/chart-theme'
import { filterData, prepareLineChartData, getUniqueGeographies, getUniqueSegments } from '@/lib/data-processor'
import { useDashboardStore } from '@/lib/store'

interface MultiLineChartProps {
  title?: string
  height?: number
  segmentFilter?: string // Optional: filter to a specific segment
}

function MultiLineChartSingle({ title, height = 400, segmentFilter }: MultiLineChartProps) {
  const { data, filters } = useDashboardStore()
  
  // Create modified filters for this specific segment
  const modifiedFilters = segmentFilter 
    ? { ...filters, segments: [segmentFilter] }
    : filters

  const chartData = useMemo(() => {
    if (!data) return { data: [], series: [] }

    const dataset = modifiedFilters.dataType === 'value'
      ? data.data.value.geography_segment_matrix
      : data.data.volume.geography_segment_matrix

    const filtered = filterData(dataset, modifiedFilters)
    const prepared = prepareLineChartData(filtered, modifiedFilters)

    // Determine series based on view mode and selections
    let series: string[] = []
    
    if (modifiedFilters.viewMode === 'segment-mode') {
      // When multiple geographies are selected, each line represents a segment
      // aggregating all selected geographies
      series = getUniqueSegments(filtered)
    } else if (modifiedFilters.viewMode === 'geography-mode') {
      // When multiple segments are selected, each line represents a geography
      // aggregating all selected segments
      series = getUniqueGeographies(filtered)
    } else if (modifiedFilters.viewMode === 'matrix') {
      // Matrix view - combine geography and segment
      const uniquePairs = new Set<string>()
      filtered.forEach(record => {
        uniquePairs.add(`${record.geography}::${record.segment}`)
      })
      series = Array.from(uniquePairs)
    }

    // Log for debugging
    console.log('📈 Line Chart Data:', {
      filteredCount: filtered.length,
      preparedLength: prepared.length,
      series: series,
      viewMode: modifiedFilters.viewMode,
      geographies: modifiedFilters.geographies,
      segments: modifiedFilters.segments,
      segmentFilter
    })

    return { data: prepared, series }
  }, [data, modifiedFilters, segmentFilter])

  // Check if too many series (likely means no filter applied)
  const hasTooManySeries = chartData.series.length > 20
  
  if (!data || chartData.data.length === 0) {
    return (
      <div className="flex items-center justify-center h-96 bg-gray-50 rounded-lg">
        <div className="text-center">
          <p className="text-gray-500">No data to display</p>
          <p className="text-sm text-gray-400 mt-1">
            Try adjusting your filters
          </p>
        </div>
      </div>
    )
  }
  
  if (hasTooManySeries) {
    return (
      <div className="flex items-center justify-center h-96 bg-yellow-50 rounded-lg border border-yellow-200">
        <div className="text-center max-w-md">
          <p className="text-yellow-800 font-medium mb-2">
            Too many series to display ({chartData.series.length})
          </p>
          <p className="text-sm text-yellow-700 mb-4">
            Please select specific segments or geographies from the filter panel to visualize the data.
          </p>
          <p className="text-xs text-yellow-600">
            💡 Tip: Use the filters to select up to 10-15 items for better visualization
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
            Line charts work best with Segment Mode or Geography Mode
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="w-full">
      {title && (
        <h3 className="text-lg font-semibold mb-4 text-gray-900">{title}</h3>
      )}
      
      <ResponsiveContainer width="100%" height={height}>
        <LineChart data={chartData.data}>
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
            content={({ active, payload, label }) => {
              if (active && payload && payload.length) {
                const year = label
                const unit = modifiedFilters.dataType === 'value'
                  ? `${data.metadata.currency} ${data.metadata.value_unit}`
                  : data.metadata.volume_unit
                
                return (
                  <div className="bg-white p-4 border border-gray-200 rounded-lg shadow-lg min-w-[250px]">
                    <p className="font-semibold text-gray-900 mb-3 pb-2 border-b border-gray-200">
                      Year: <span className="text-blue-600">{year}</span>
                    </p>
                    <div className="space-y-2">
                      {payload.map((entry: any, index: number) => {
                        const value = entry.value as number
                        // Get the actual name from dataKey or name
                        const displayName = entry.dataKey || entry.name || 'Unknown'
                        const color = entry.color
                        
                        return (
                          <div key={index} className="flex items-center justify-between gap-4">
                            <div className="flex items-center gap-2">
                              <div 
                                className="w-3 h-3 rounded-full" 
                                style={{ backgroundColor: color }}
                              ></div>
                              <span className="text-sm font-medium text-gray-700" title={displayName}>
                                {displayName.length > 40 ? displayName.substring(0, 40) + '...' : displayName}
                              </span>
                            </div>
                            <div className="text-right">
                              <span className="text-sm font-semibold text-gray-900">
                                {value?.toLocaleString(undefined, { 
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
                          ? `Trend comparison of ${payload.length} segment${payload.length !== 1 ? 's' : ''}`
                          : `Trend comparison of ${payload.length} geograph${payload.length !== 1 ? 'ies' : 'y'}`
                        }
                      </div>
                      {modifiedFilters.segments && modifiedFilters.segments.length > 0 && (
                        <div className="text-xs text-gray-600 mt-2">
                          <div className="font-medium text-gray-700 mb-1">Selected Segments:</div>
                          <div className="flex flex-wrap gap-1">
                            {modifiedFilters.segments.slice(0, 2).map((segment, idx) => (
                              <span key={idx} className="px-2 py-0.5 bg-blue-50 text-blue-700 rounded text-xs" title={segment}>
                                {segment.length > 25 ? segment.substring(0, 25) + '...' : segment}
                              </span>
                            ))}
                            {modifiedFilters.segments.length > 2 && (
                              <span className="px-2 py-0.5 bg-gray-100 text-gray-600 rounded text-xs">
                                +{modifiedFilters.segments.length - 2} more
                              </span>
                            )}
                          </div>
                        </div>
                      )}
                      {modifiedFilters.geographies && modifiedFilters.geographies.length > 0 && (
                        <div className="text-xs text-gray-600 mt-2">
                          <div className="font-medium text-gray-700 mb-1">Selected Geographies:</div>
                          <div className="flex flex-wrap gap-1">
                            {modifiedFilters.geographies.slice(0, 2).map((geo, idx) => (
                              <span key={idx} className="px-2 py-0.5 bg-green-50 text-green-700 rounded text-xs">
                                {geo}
                              </span>
                            ))}
                            {modifiedFilters.geographies.length > 2 && (
                              <span className="px-2 py-0.5 bg-gray-100 text-gray-600 rounded text-xs">
                                +{modifiedFilters.geographies.length - 2} more
                              </span>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )
              }
              return null
            }}
          />
          <Legend {...CHART_THEME.legend} />
          
          {chartData.series.map((seriesName, index) => (
            <Line
              key={seriesName}
              type="monotone"
              dataKey={seriesName}
              stroke={getChartColor(index)}
              strokeWidth={2}
              dot={{ r: 3 }}
              activeDot={{ r: 5 }}
              name={seriesName}
              connectNulls={true}
            />
          ))}
        </LineChart>
      </ResponsiveContainer>

      {chartData.series.length > 0 && (
        <div className="mt-4 text-sm text-gray-600 text-center">
          {modifiedFilters.viewMode === 'segment-mode' && modifiedFilters.geographies.length > 1 ? (
            <>
              Trend comparison of {chartData.series.length} segments
              {' '}(aggregated across {modifiedFilters.geographies.length} geographies)
              {' '}from {modifiedFilters.yearRange[0]} to {modifiedFilters.yearRange[1]}
            </>
          ) : modifiedFilters.viewMode === 'geography-mode' && modifiedFilters.segments.length > 1 ? (
            <>
              Trend comparison of {chartData.series.length} geographies
              {' '}(aggregated across {modifiedFilters.segments.length} segments)
              {' '}from {modifiedFilters.yearRange[0]} to {modifiedFilters.yearRange[1]}
            </>
          ) : (
            <>
              Trend comparison of {chartData.series.length} {modifiedFilters.viewMode === 'segment-mode' ? 'segments' : 'geographies'}
          {' '}from {modifiedFilters.yearRange[0]} to {modifiedFilters.yearRange[1]}
            </>
          )}
        </div>
      )}
    </div>
  )
}

// Main export - always renders a single combined chart
export function MultiLineChart({ title, height = 400 }: Omit<MultiLineChartProps, 'segmentFilter'>) {
  // Always render a single combined chart to compare all segments/geographies together
  return <MultiLineChartSingle title={title} height={height} />
}

