'use client'

import { useMemo, useState } from 'react'
import { useDashboardStore } from '@/lib/store'
import { filterData } from '@/lib/data-processor'

interface MatrixHeatmapProps {
  title?: string
  height?: number
}

export function MatrixHeatmap({ title, height = 600 }: MatrixHeatmapProps) {
  const { data, filters } = useDashboardStore()
  const [hoveredCell, setHoveredCell] = useState<{ geo: string; segment: string; value: number; x: number; y: number } | null>(null)

  const matrixData = useMemo(() => {
    if (!data) return { matrix: [], geographies: [], segments: [], maxValue: 0, minValue: 0 }

    // Get the appropriate dataset
    const dataset = filters.dataType === 'value'
      ? data.data.value.geography_segment_matrix
      : data.data.volume.geography_segment_matrix

    // Filter data
    const filtered = filterData(dataset, filters)

    // Get unique geographies and segments
    const geographies = [...new Set(filtered.map(r => r.geography))].sort()
    const segments = [...new Set(filtered.map(r => r.segment))].sort()

    // Get the selected year (use base year or middle of range)
    const year = filters.yearRange[0] + Math.floor((filters.yearRange[1] - filters.yearRange[0]) / 2)

    // Build matrix
    const matrix: number[][] = []
    let maxValue = 0
    let minValue = Infinity

    geographies.forEach((geo, geoIndex) => {
      matrix[geoIndex] = []
      segments.forEach((seg, segIndex) => {
        const record = filtered.find(r => r.geography === geo && r.segment === seg)
        const value = record?.time_series[year] || 0
        matrix[geoIndex][segIndex] = value
        maxValue = Math.max(maxValue, value)
        if (value > 0) minValue = Math.min(minValue, value)
      })
    })

    if (minValue === Infinity) minValue = 0

    return { matrix, geographies, segments, maxValue, minValue }
  }, [data, filters])

  if (!data || matrixData.matrix.length === 0) {
    return (
      <div className="flex items-center justify-center h-96 bg-gray-50 rounded-lg">
        <div className="text-center">
          <p className="text-gray-500">No data to display</p>
          <p className="text-sm text-gray-400 mt-1">
            Select multiple geographies and segments for matrix view
          </p>
        </div>
      </div>
    )
  }

  // Calculate color intensity using palette colors
  const getColor = (value: number) => {
    if (value === 0) return 'bg-gray-50'
    const { maxValue, minValue } = matrixData
    const range = maxValue - minValue
    if (range === 0) return 'bg-[#52B69A]'
    
    const intensity = ((value - minValue) / range) * 100
    
    if (intensity < 20) return 'bg-[#D9ED92]'  // Yellow Green
    if (intensity < 40) return 'bg-[#B5E48C]'  // Light Lime
    if (intensity < 60) return 'bg-[#52B69A]'  // Teal
    if (intensity < 80) return 'bg-[#168AAD]'  // Deep Teal
    return 'bg-[#1A759F]'  // Blue Teal
  }

  const formatValue = (value: number) => {
    if (value === 0) return '-'
    if (value >= 1000) return `${(value / 1000).toFixed(1)}K`
    return value.toFixed(1)
  }

  const year = filters.yearRange[0] + Math.floor((filters.yearRange[1] - filters.yearRange[0]) / 2)
  const valueUnit = filters.dataType === 'value' 
    ? `${data.metadata.currency} ${data.metadata.value_unit}`
    : data.metadata.volume_unit

  return (
    <div className="w-full">
      <div className="mb-4">
        <h3 className="text-lg font-semibold text-gray-900">
          {title || 'Matrix View - Geography × Segment Comparison'}
        </h3>
        <p className="text-sm text-gray-500 mt-1">
          Year: {year} | Values in {valueUnit}
        </p>
      </div>

      <div className="overflow-auto" style={{ maxHeight: height }}>
        <div className="inline-block min-w-full">
          {/* Header row with segments */}
          <div className="flex">
            <div className="w-32 p-2 bg-gray-100 border border-gray-300 font-medium text-sm text-gray-900">
              Geo \ Segment
            </div>
            {matrixData.segments.map(segment => (
              <div
                key={segment}
                className="w-32 p-2 bg-gray-100 border border-gray-300 text-xs font-medium text-center truncate text-gray-900"
                title={segment}
              >
                {segment}
              </div>
            ))}
          </div>

          {/* Data rows */}
          {matrixData.geographies.map((geo, geoIndex) => (
            <div key={geo} className="flex">
              <div className="w-32 p-2 bg-gray-100 border border-gray-300 font-medium text-sm truncate text-gray-900" title={geo}>
                {geo}
              </div>
              {matrixData.segments.map((segment, segIndex) => {
                const value = matrixData.matrix[geoIndex][segIndex]
                
                return (
                  <div
                    key={`${geo}-${segment}`}
                    className={`w-32 p-2 border border-gray-300 text-center cursor-pointer transition-all hover:opacity-80 ${getColor(value)}`}
                    onMouseEnter={(e) => {
                      const rect = e.currentTarget.getBoundingClientRect()
                      setHoveredCell({
                        geo,
                        segment,
                        value,
                        x: rect.left + rect.width / 2,
                        y: rect.top - 10
                      })
                    }}
                    onMouseLeave={() => setHoveredCell(null)}
                  >
                    <span className={`text-xs font-medium ${value > matrixData.maxValue * 0.5 ? 'text-white' : 'text-gray-800'}`}>
                      {formatValue(value)}
                    </span>
                  </div>
                )
              })}
            </div>
          ))}
        </div>
      </div>

      {/* Custom Tooltip */}
      {hoveredCell && (
        <div
          className="fixed bg-white p-4 border border-gray-200 rounded-lg shadow-xl z-50 pointer-events-none min-w-[280px]"
          style={{
            left: `${hoveredCell.x}px`,
            top: `${hoveredCell.y}px`,
            transform: 'translate(-50%, -100%)'
          }}
        >
          <p className="font-semibold text-gray-900 mb-3 pb-2 border-b border-gray-200">
            Matrix Cell Details
          </p>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Geography:</span>
              <span className="text-sm font-medium text-gray-900">{hoveredCell.geo}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Segment:</span>
              <span className="text-sm font-medium text-gray-900">{hoveredCell.segment}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Year:</span>
              <span className="text-sm font-medium text-gray-900">{year}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Value:</span>
              <div className="text-right">
                <span className="text-sm font-semibold text-gray-900">
                  {hoveredCell.value.toLocaleString(undefined, { 
                    minimumFractionDigits: 2, 
                    maximumFractionDigits: 2 
                  })}
                </span>
                <span className="text-xs text-gray-500 ml-1">{valueUnit}</span>
              </div>
            </div>
            {matrixData.maxValue > 0 && (
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Market Share:</span>
                <span className="text-sm font-semibold text-blue-600">
                  {((hoveredCell.value / matrixData.maxValue) * 100).toFixed(2)}%
                </span>
              </div>
            )}
          </div>
          <div className="mt-3 pt-2 border-t border-gray-200 text-xs text-gray-500">
            Matrix comparison view
          </div>
        </div>
      )}

      {/* Legend */}
      <div className="mt-4 flex items-center justify-center space-x-4">
        <span className="text-xs text-black font-medium">Low</span>
        <div className="flex space-x-1">
          <div className="w-6 h-6 bg-[#D9ED92] rounded"></div>
          <div className="w-6 h-6 bg-[#B5E48C] rounded"></div>
          <div className="w-6 h-6 bg-[#52B69A] rounded"></div>
          <div className="w-6 h-6 bg-[#168AAD] rounded"></div>
          <div className="w-6 h-6 bg-[#1A759F] rounded"></div>
        </div>
        <span className="text-xs text-black font-medium">High</span>
      </div>

      <div className="mt-4 text-center text-sm text-black font-medium">
        Comparing {matrixData.geographies.length} geographies × {matrixData.segments.length} segments
      </div>
    </div>
  )
}
