'use client'

import { useState, useMemo } from 'react'
import { Zap, TrendingUp, Globe, Target, BarChart3, Save, Trash2, ChevronDown, ChevronUp } from 'lucide-react'
import { useDashboardStore } from '@/lib/store'
import { FilterState } from '@/lib/types'
import { 
  createTopMarketFilters, 
  createGrowthLeadersFilters, 
  createEmergingMarketsFilters 
} from '@/lib/preset-utils'

interface FilterPreset {
  id: string
  name: string
  description: string
  icon: React.ReactNode
  filters: Partial<FilterState>
  isCustom?: boolean
}

// Note: defaultPresets is now computed dynamically in the component
// This array is just for the structure, actual filters are computed based on data

export function FilterPresets() {
  const { filters, updateFilters, data, resetFilters } = useDashboardStore()
  const [customPresets, setCustomPresets] = useState<FilterPreset[]>([])
  const [showSaveDialog, setShowSaveDialog] = useState(false)
  const [presetName, setPresetName] = useState('')
  const [isExpanded, setIsExpanded] = useState(true)

  // Dynamically compute default presets based on actual data
  const defaultPresets = useMemo<FilterPreset[]>(() => {
    // Create dynamic filters based on data
    const topMarketsFilters = createTopMarketFilters(data)
    const growthLeadersFilters = createGrowthLeadersFilters(data)
    const emergingMarketsFilters = createEmergingMarketsFilters(data)

    return [
      {
        id: 'top-markets',
        name: 'Top Markets',
        description: 'Top 3 regions by market value',
        icon: <Zap className="h-4 w-4" />,
        filters: topMarketsFilters
      },
      {
        id: 'growth-leaders',
        name: 'Growth Leaders',
        description: 'Top 2 regions with highest CAGR',
        icon: <TrendingUp className="h-4 w-4" />,
        filters: growthLeadersFilters
      },
      {
        id: 'emerging-markets',
        name: 'Emerging Markets',
        description: 'Top 5 countries with highest CAGR',
        icon: <Target className="h-4 w-4" />,
        filters: emergingMarketsFilters
      },
    ]
  }, [data])

  const applyPreset = (preset: FilterPreset) => {
    console.log('🎯 Applying preset:', preset.name, preset.filters)

    // If Top Markets preset, completely clear all filters first, then apply preset filters
    if (preset.id === 'top-markets') {
      // Get current data to build complete filter state
      const { data: currentData } = useDashboardStore.getState()
      
      // Get default filter structure
      const startYear = currentData?.metadata?.start_year || 2020
      const forecastYear = currentData?.metadata?.forecast_year || 2032
      const firstSegmentType = currentData?.dimensions?.segments 
        ? Object.keys(currentData.dimensions.segments)[0] 
        : 'By End-Use*Product Type'
      
      // First, completely clear all filters (empty arrays)
      const clearedFilters: FilterState = {
        geographies: [],
        segments: [],
        segmentType: firstSegmentType,
        yearRange: [startYear, forecastYear] as [number, number],
        dataType: 'value',
        viewMode: 'geography-mode',
        businessType: 'B2B',
      }
      
      // Clear filters first
      console.log('🧹 Clearing all filters first...')
      useDashboardStore.setState({ filters: clearedFilters })
      
      // Then apply preset filters after a brief delay to ensure clear happens first
      setTimeout(() => {
        const newFilters: FilterState = {
          ...clearedFilters,
          ...preset.filters,
          // Ensure arrays are properly set (not merged)
          geographies: preset.filters.geographies || [],
          segments: preset.filters.segments || [],
        } as FilterState
        
        console.log('🎯 Final filters being applied (after clear):', newFilters)
        useDashboardStore.setState({ filters: newFilters })
        
        // Ensure chart group is set to market-analysis so grouped bar chart is visible
        const { setSelectedChartGroup } = useDashboardStore.getState()
        setSelectedChartGroup('market-analysis')
      }, 10)
      
      return
    }

    // For other presets, merge with current filters
    const newFilters: Partial<FilterState> = { ...preset.filters }

    // If preset doesn't specify certain filters, keep current ones
    if (!newFilters.geographies && filters.geographies.length > 0) {
      newFilters.geographies = filters.geographies
    }
    if (!newFilters.segments && filters.segments.length > 0) {
      newFilters.segments = filters.segments
    }
    if (!newFilters.segmentType && filters.segmentType) {
      newFilters.segmentType = filters.segmentType
    }

    console.log('🎯 Final filters being applied:', newFilters)
    updateFilters(newFilters as FilterState)
    
    // Ensure chart group is set to market-analysis so grouped bar chart is visible
    const { setSelectedChartGroup } = useDashboardStore.getState()
    setSelectedChartGroup('market-analysis')
  }

  const saveCurrentAsPreset = () => {
    if (!presetName.trim()) return

    const newPreset: FilterPreset = {
      id: `custom-${Date.now()}`,
      name: presetName,
      description: `Custom preset: ${filters.geographies.length} geographies, ${filters.segments.length} segments`,
      icon: <Save className="h-4 w-4" />,
      filters: {
        viewMode: filters.viewMode,
        geographies: [...filters.geographies],
        segments: [...filters.segments],
        segmentType: filters.segmentType,
        yearRange: [...filters.yearRange] as [number, number],
        dataType: filters.dataType,
      },
      isCustom: true,
    }

    setCustomPresets([...customPresets, newPreset])
    setPresetName('')
    setShowSaveDialog(false)
    
    // Save to localStorage
    const savedPresets = [...customPresets, newPreset]
    localStorage.setItem('marketAnalysisPresets', JSON.stringify(savedPresets))
  }

  const deleteCustomPreset = (id: string) => {
    const updated = customPresets.filter(p => p.id !== id)
    setCustomPresets(updated)
    localStorage.setItem('marketAnalysisPresets', JSON.stringify(updated))
  }

  // Load custom presets from localStorage on mount
  useState(() => {
    const saved = localStorage.getItem('marketAnalysisPresets')
    if (saved) {
      try {
        setCustomPresets(JSON.parse(saved))
      } catch (e) {
        console.error('Error loading custom presets:', e)
      }
    }
  })

  if (!data) return null

  const allPresets = [...defaultPresets, ...customPresets]

  return (
    <div className="bg-white rounded-lg shadow-sm">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full px-3 py-2 flex items-center justify-between hover:bg-gray-50 transition-colors"
      >
        <h3 className="text-xs font-semibold text-black uppercase tracking-wider flex items-center gap-1">
          <Zap className="h-3 w-3 text-yellow-500" />
          Quick Filters
        </h3>
        <div className="flex items-center gap-2">
          {isExpanded && (
            <div
              onClick={(e) => {
                e.stopPropagation()
                setShowSaveDialog(true)
              }}
              className="text-xs text-blue-600 hover:text-blue-700 cursor-pointer"
              title="Save Current Filters"
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault()
                  e.stopPropagation()
                  setShowSaveDialog(true)
                }
              }}
            >
              <Save className="h-3 w-3" />
            </div>
          )}
          {isExpanded ? (
            <ChevronUp className="h-3 w-3 text-black" />
          ) : (
            <ChevronDown className="h-3 w-3 text-black" />
          )}
        </div>
      </button>

      {isExpanded && (
        <div className="grid grid-cols-2 gap-1 p-2 pt-0">
          {allPresets.map((preset) => (
          <button
            key={preset.id}
            className="group relative flex items-center gap-2 p-2 rounded text-left hover:bg-blue-50 transition-colors"
            onClick={() => applyPreset(preset)}
            title={preset.description}
          >
            <span className="text-blue-500 text-sm">
              {preset.icon}
            </span>
            <span className="text-xs font-medium text-black truncate flex-1">
              {preset.name}
            </span>
            {preset.isCustom && (
              <div
                onClick={(e) => {
                  e.stopPropagation()
                  deleteCustomPreset(preset.id)
                }}
                className="opacity-0 group-hover:opacity-100 transition-opacity hover:text-red-500 cursor-pointer"
                title="Delete preset"
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault()
                    e.stopPropagation()
                    deleteCustomPreset(preset.id)
                  }
                }}
              >
                <Trash2 className="h-3 w-3" />
              </div>
            )}
          </button>
          ))}
        </div>
      )}

      {/* Save Dialog */}
      {showSaveDialog && (
        <div className="fixed inset-0 flex items-center justify-center z-50" style={{ backgroundColor: 'rgba(0, 0, 0, 0.5)' }}>
          <div className="bg-white rounded-lg p-6 w-96">
            <h3 className="text-lg font-semibold mb-4">Save Filter Preset</h3>
            <input
              type="text"
              value={presetName}
              onChange={(e) => setPresetName(e.target.value)}
              placeholder="Enter preset name..."
              className="w-full px-3 py-2 border border-gray-300 rounded-md mb-4 text-black placeholder-gray-400"
              autoFocus
            />
            <div className="flex justify-end gap-2">
              <button
                onClick={() => {
                  setShowSaveDialog(false)
                  setPresetName('')
                }}
                className="px-4 py-2 text-black hover:text-black"
              >
                Cancel
              </button>
              <button
                onClick={saveCurrentAsPreset}
                disabled={!presetName.trim()}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-300"
              >
                Save Preset
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
