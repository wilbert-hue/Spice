'use client'

import { useDashboardStore } from '@/lib/store'
import { YearRangeSlider } from './YearRangeSlider'
import { CascadingSegmentFilter } from './CascadingSegmentFilter'
import { EnhancedGeographyFilter } from './EnhancedGeographyFilter'

export function EnhancedFilterPanel() {
  const { filters, updateFilters } = useDashboardStore()

  return (
    <div className="bg-white rounded-lg shadow-sm p-2.5 space-y-4">
      {/* Data Type Selection */}
      <div>
        <label className="text-xs font-medium text-black uppercase">
          Data Type
        </label>
        <div className="flex gap-1 mt-1">
          <button
            onClick={() => updateFilters({ dataType: 'value' })}
            className={`flex-1 px-3 py-1.5 text-sm rounded ${
              filters.dataType === 'value'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-black hover:bg-gray-200'
            }`}
          >
            Value
          </button>
          <button
            onClick={() => updateFilters({ dataType: 'volume' })}
            className={`flex-1 px-3 py-1.5 text-sm rounded ${
              filters.dataType === 'volume'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-black hover:bg-gray-200'
            }`}
          >
            Volume
          </button>
        </div>
      </div>

      {/* View Mode */}
      <div>
        <label className="text-xs font-medium text-black uppercase">
          View Mode
        </label>
        <select
          value={filters.viewMode}
          onChange={(e) => updateFilters({ viewMode: e.target.value as any })}
          className="w-full px-2 py-1.5 text-sm text-black border border-gray-300 rounded mt-1"
        >
          <option value="segment-mode">Segment Mode</option>
          <option value="geography-mode">Geography Mode</option>
          <option value="matrix">Matrix View</option>
        </select>
      </div>

      {/* Geography Selection - Enhanced Hierarchical View */}
      <div>
        <EnhancedGeographyFilter
          selectedGeographies={filters.geographies}
          onGeographiesChange={(geographies) => updateFilters({ geographies })}
        />
      </div>

      {/* Cascading Segment Filter */}
      <div className="border-t pt-4">
        <CascadingSegmentFilter />
      </div>

      {/* Year Range */}
      <div className="border-t pt-4">
        <YearRangeSlider />
      </div>

      {/* Summary */}
      {(filters.geographies.length > 0 || (filters.segments && filters.segments.length > 0)) && (
        <div className="border-t pt-4">
          <div className="p-3 bg-gray-100 rounded-lg">
            <div className="text-sm font-medium text-black mb-2">
              Comparison Summary
            </div>
            <div className="text-xs text-black space-y-1">
              <div>📍 {filters.geographies.length} geographies</div>
              <div>📊 {filters.segments?.length || 0} segments selected</div>
              <div>📅 Years: {filters.yearRange[0]} - {filters.yearRange[1]}</div>
              <div>📈 Data: {filters.dataType}</div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
