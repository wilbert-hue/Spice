'use client'

import { useMemo } from 'react'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Cell
} from 'recharts'
import { CHART_THEME, getChartColor } from '@/lib/chart-theme'
import { filterData, prepareWaterfallData } from '@/lib/data-processor'
import { useDashboardStore } from '@/lib/store'

interface WaterfallChartProps {
  title?: string
  height?: number
  segmentFilter?: string // Optional: filter to a specific segment
}

interface WaterfallDataPoint {
  name: string
  value: number
  type: 'start' | 'positive' | 'negative' | 'end'
  cumulative?: number
  start?: number
  end?: number
}

function WaterfallChartSingle({ title, height = 400, segmentFilter }: WaterfallChartProps) {
  const { data, filters } = useDashboardStore()
  
  // Create modified filters for this specific segment
  const modifiedFilters = segmentFilter 
    ? { ...filters, segments: [segmentFilter] }
    : filters

  const chartData = useMemo(() => {
    if (!data) return { data: [], totalChange: 0 }

    const dataset = modifiedFilters.dataType === 'value'
      ? data.data.value.geography_segment_matrix
      : data.data.volume.geography_segment_matrix

    const filtered = filterData(dataset, modifiedFilters)
    const waterfallData = prepareWaterfallData(filtered, modifiedFilters)

    // Calculate cumulative values for waterfall effect
    const processedData: WaterfallDataPoint[] = []
    let cumulative = 0
    let startValue = 0

    waterfallData.forEach((point, index) => {
      if (point.type === 'start') {
        startValue = point.value
        cumulative = point.value
        processedData.push({
          ...point,
          cumulative: point.value,
          start: 0,
          end: point.value
        })
      } else if (point.type === 'end') {
        // End bar: positioned at cumulative (which should equal endTotal)
        // The bar value should be the end total, starting from 0 for visual clarity
        processedData.push({
          ...point,
          cumulative: point.value,
          start: 0,
          end: point.value
        })
      } else if (point.type === 'positive') {
        const start = cumulative
        cumulative += point.value
        processedData.push({
          ...point,
          cumulative,
          start,
          end: cumulative
        })
      } else if (point.type === 'negative') {
        const start = cumulative
        cumulative -= point.value
        processedData.push({
          ...point,
          cumulative,
          start,
          end: cumulative
        })
      }
    })

    const totalChange = (processedData[processedData.length - 1]?.cumulative || 0) - 
                       (processedData[0]?.cumulative || 0)

    return { data: processedData, totalChange }
  }, [data, modifiedFilters, segmentFilter])

  if (!data || chartData.data.length === 0) {
    return (
      <div className="flex items-center justify-center h-96 bg-gray-50 rounded-lg">
        <div className="text-center">
          <p className="text-gray-500">No data to display</p>
          <p className="text-sm text-gray-400 mt-1">
            Select filters to view the waterfall chart
          </p>
        </div>
      </div>
    )
  }

  // Matrix view doesn't work well with waterfall
  if (modifiedFilters.viewMode === 'matrix') {
    return (
      <div className="flex items-center justify-center h-96 bg-gray-50 rounded-lg">
        <div className="text-center">
          <p className="text-gray-500 text-lg font-medium">Matrix View Active</p>
          <p className="text-sm text-gray-400 mt-2">
            Waterfall charts work best with Segment Mode or Geography Mode
          </p>
        </div>
      </div>
    )
  }

  const yAxisLabel = modifiedFilters.dataType === 'value'
    ? `Market Value (${data.metadata.currency} ${data.metadata.value_unit})`
    : `Market Volume (${data.metadata.volume_unit})`

  // Custom tooltip for waterfall
  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length && data) {
      const pointData = payload[0].payload as WaterfallDataPoint
      const unit = modifiedFilters.dataType === 'value'
        ? `${data.metadata.currency} ${data.metadata.value_unit}`
        : data.metadata.volume_unit
      
      return (
        <div className="bg-white p-4 border border-gray-200 rounded-lg shadow-lg min-w-[280px]">
          <p className="font-semibold text-gray-900 mb-3 pb-2 border-b border-gray-200">
            {pointData.name}
          </p>
          
          {pointData.type === 'start' || pointData.type === 'end' ? (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Type:</span>
                <span className="text-sm font-medium text-gray-900">
                  {pointData.type === 'start' ? 'Starting Value' : 'Ending Value'}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Total Value:</span>
                <div className="text-right">
                  <span className="text-sm font-semibold text-gray-900">
                    {pointData.value.toLocaleString(undefined, { 
                      minimumFractionDigits: 2, 
                      maximumFractionDigits: 2 
                    })}
                  </span>
                  <span className="text-xs text-gray-500 ml-1">{unit}</span>
                </div>
              </div>
              {pointData.type === 'end' && chartData.totalChange !== 0 && (
                <div className="mt-3 pt-2 border-t border-gray-200">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Net Change:</span>
                    <span className={`text-sm font-semibold ${
                      chartData.totalChange > 0 ? 'text-green-600' : 'text-red-600'
                    }`}>
                      {chartData.totalChange > 0 ? '+' : ''}
                      {chartData.totalChange.toLocaleString(undefined, { 
                        minimumFractionDigits: 2, 
                        maximumFractionDigits: 2 
                      })} {unit}
                    </span>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Type:</span>
                <span className={`text-sm font-medium ${
                  pointData.type === 'positive' ? 'text-green-600' : 'text-red-600'
                }`}>
                  {pointData.type === 'positive' ? 'Positive Contribution' : 'Negative Contribution'}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Change Amount:</span>
                <div className="text-right">
                  <span className={`text-sm font-semibold ${
                    pointData.type === 'positive' ? 'text-green-600' : 'text-red-600'
                  }`}>
                    {pointData.type === 'positive' ? '+' : '-'}
                    {pointData.value.toLocaleString(undefined, { 
                      minimumFractionDigits: 2, 
                      maximumFractionDigits: 2 
                    })}
                  </span>
                  <span className="text-xs text-gray-500 ml-1">{unit}</span>
                </div>
              </div>
              <div className="mt-3 pt-2 border-t border-gray-200 space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-gray-500">From:</span>
                  <span className="text-gray-700 font-medium">
                    {pointData.start?.toLocaleString(undefined, { 
                      minimumFractionDigits: 2, 
                      maximumFractionDigits: 2 
                    })} {unit}
                  </span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-gray-500">To:</span>
                  <span className="text-gray-700 font-medium">
                    {pointData.end?.toLocaleString(undefined, { 
                      minimumFractionDigits: 2, 
                      maximumFractionDigits: 2 
                    })} {unit}
                  </span>
                </div>
              </div>
            </div>
          )}
          
          <div className="mt-3 pt-2 border-t border-gray-200 text-xs text-gray-500">
            {modifiedFilters.viewMode === 'segment-mode' 
              ? 'Segment contribution to total market'
              : 'Geography contribution to segment total'
            }
          </div>
        </div>
      )
    }
    return null
  }

  // Get color based on type - using custom gradient theme
  const getColor = (type: string) => {
    switch (type) {
      case 'start':
      case 'end':
        return '#1E6091' // Deep Blue for totals
      case 'positive':
        return '#52B69A' // Teal for positive
      case 'negative':
        return '#D9ED92' // Yellow Green for negative
      default:
        return '#168AAD'
    }
  }

  // If this is a single segment chart, add segment name to title
  const displayTitle = segmentFilter 
    ? `${title || 'Contribution Analysis'} - ${segmentFilter.split(' > ').pop() || segmentFilter}`
    : title

  return (
    <div className="w-full">
      {displayTitle && (
        <h3 className="text-lg font-semibold mb-4 text-gray-900">{displayTitle}</h3>
      )}
      
      <ResponsiveContainer width="100%" height={height}>
        <BarChart
          data={chartData.data}
          margin={{ top: 20, right: 30, left: 20, bottom: 60 }}
        >
          <CartesianGrid {...CHART_THEME.grid} />
          <XAxis
            dataKey="name"
            angle={-45}
            textAnchor="end"
            height={100}
            tick={{ fontSize: 12, fill: '#000000' }}
          />
          <YAxis
            tick={{ fontSize: 12, fill: '#000000' }}
            label={{ value: yAxisLabel, angle: -90, position: 'insideLeft', fill: '#000000' }}
          />
          <Tooltip content={<CustomTooltip />} />
          <Legend />
          
          {/* Base bar (invisible, positions the visible bar) */}
          <Bar 
            dataKey="start" 
            stackId="waterfall" 
            fill="transparent"
            stroke="none"
          />
          
          {/* Value bar (visible contribution) */}
          <Bar 
            dataKey="value" 
            stackId="waterfall"
            fill="#8884d8"
          >
            {chartData.data.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={getColor(entry.type)} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>

      <div className="mt-4 space-y-2">
        <div className="flex items-center justify-center gap-6 text-sm">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded" style={{ backgroundColor: '#1E6091' }}></div>
            <span className="text-gray-600">Start/End Total</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded" style={{ backgroundColor: '#52B69A' }}></div>
            <span className="text-gray-600">Positive Contribution</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded" style={{ backgroundColor: '#D9ED92' }}></div>
            <span className="text-gray-600">Negative Contribution</span>
          </div>
        </div>
        
        <div className="text-center text-sm text-gray-600">
          {modifiedFilters.viewMode === 'segment-mode' 
            ? `Showing contribution breakdown by segments from ${modifiedFilters.yearRange[0]} to ${modifiedFilters.yearRange[1]}`
            : `Showing contribution breakdown by geographies from ${modifiedFilters.yearRange[0]} to ${modifiedFilters.yearRange[1]}`
          }
        </div>
        
        {chartData.totalChange !== 0 && (
          <div className="text-center">
            <span className={`text-sm font-semibold ${
              chartData.totalChange > 0 ? 'text-green-600' : 'text-red-600'
            }`}>
              Net Change: {chartData.totalChange > 0 ? '+' : ''}
              {chartData.totalChange.toLocaleString(undefined, { maximumFractionDigits: 2 })}
            </span>
          </div>
        )}
      </div>
    </div>
  )
}

// Main export - renders multiple charts if multiple segments are selected
export function WaterfallChart({ title, height = 400 }: Omit<WaterfallChartProps, 'segmentFilter'>) {
  const { filters } = useDashboardStore()
  
  // If multiple segments are selected and in segment-mode, render one chart per segment
  if (filters.viewMode === 'segment-mode' && filters.segments.length > 1) {
    return (
      <div className="w-full space-y-8">
        {filters.segments.map((segment, index) => (
          <WaterfallChartSingle
            key={`segment-${index}-${segment}`}
            title={title}
            height={height}
            segmentFilter={segment}
          />
        ))}
      </div>
    )
  }
  
  // Otherwise, render single chart
  return <WaterfallChartSingle title={title} height={height} />
}
