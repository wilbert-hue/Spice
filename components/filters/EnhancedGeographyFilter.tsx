'use client'

import { useState, useEffect } from 'react'
import { ChevronRight, ChevronDown, X, Check, MapPin } from 'lucide-react'

interface GeographyDimension {
  global: string[]
  regions: string[]
  countries: Record<string, string[]>
  all_geographies: string[]
}

interface DimensionsData {
  geographies: GeographyDimension
}

interface EnhancedGeographyFilterProps {
  selectedGeographies: string[]
  onGeographiesChange: (geographies: string[]) => void
}

export function EnhancedGeographyFilter({ 
  selectedGeographies, 
  onGeographiesChange 
}: EnhancedGeographyFilterProps) {
  const [dimensionsData, setDimensionsData] = useState<DimensionsData | null>(null)
  const [expandedRegions, setExpandedRegions] = useState<Set<string>>(new Set())
  const [expandedGlobal, setExpandedGlobal] = useState<boolean>(false)

  // Load dimensions data
  useEffect(() => {
    async function loadData() {
      try {
        const response = await fetch('/jsons/india-spices-dimensions.json', {
          cache: 'no-cache',
          headers: {
            'Accept': 'application/json',
          }
        })
        
        if (!response.ok) {
          console.error(`Failed to fetch: ${response.status} ${response.statusText}`)
          return
        }
        
        const text = await response.text()
        if (text.startsWith('<!DOCTYPE') || text.startsWith('<html')) {
          console.error('Received HTML instead of JSON. File may not exist or path is incorrect.')
          return
        }
        
        const data = JSON.parse(text)
        setDimensionsData({ geographies: data.dimensions.geographies })
      } catch (error) {
        console.error('Failed to load geography data:', error)
      }
    }
    loadData()
  }, [])

  // Toggle region expansion
  const toggleRegion = (region: string) => {
    const newExpanded = new Set(expandedRegions)
    if (newExpanded.has(region)) {
      newExpanded.delete(region)
    } else {
      newExpanded.add(region)
    }
    setExpandedRegions(newExpanded)
  }

  // Toggle geography selection
  const toggleGeography = (geography: string) => {
    const updated = selectedGeographies.includes(geography)
      ? selectedGeographies.filter(g => g !== geography)
      : [...selectedGeographies, geography]
    
    onGeographiesChange(updated)
  }

  // Check if geography is selected
  const isGeographySelected = (geography: string): boolean => {
    return selectedGeographies.includes(geography)
  }

  // Check if all countries in a region are selected
  const areAllCountriesSelected = (region: string): boolean => {
    if (!dimensionsData) return false
    const countries = dimensionsData.geographies.countries[region] || []
    if (countries.length === 0) return false
    return countries.every(country => isGeographySelected(country))
  }

  // Check if some countries in a region are selected (partial)
  const areSomeCountriesSelected = (region: string): boolean => {
    if (!dimensionsData) return false
    const countries = dimensionsData.geographies.countries[region] || []
    if (countries.length === 0) return false
    const selectedCount = countries.filter(country => isGeographySelected(country)).length
    return selectedCount > 0 && selectedCount < countries.length
  }

  // Toggle all countries in a region
  const toggleRegionWithCountries = (region: string) => {
    if (!dimensionsData) return
    
    const countries = dimensionsData.geographies.countries[region] || []
    const allSelected = areAllCountriesSelected(region)
    
    if (allSelected) {
      // Deselect region and all countries
      const updated = selectedGeographies.filter(
        g => g !== region && !countries.includes(g)
      )
      onGeographiesChange(updated)
    } else {
      // Select region and all countries
      const updated = [...selectedGeographies]
      if (!updated.includes(region)) {
        updated.push(region)
      }
      countries.forEach(country => {
        if (!updated.includes(country)) {
          updated.push(country)
        }
      })
      onGeographiesChange(updated)
    }
  }

  // Clear all selections
  const clearAll = () => {
    onGeographiesChange([])
  }

  // Select all geographies
  const selectAll = () => {
    if (!dimensionsData) return
    onGeographiesChange(dimensionsData.geographies.all_geographies)
  }

  if (!dimensionsData) {
    return (
      <div className="bg-white rounded-lg shadow-sm p-4">
        <div className="text-sm text-gray-600">Loading geography data...</div>
      </div>
    )
  }

  const { global, regions, countries } = dimensionsData.geographies
  const selectedCount = selectedGeographies.length

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200">
      {/* Header */}
      <div className="border-b border-gray-200 p-3 bg-gray-50">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <MapPin className="h-4 w-4 text-gray-600" />
            <h3 className="text-sm font-semibold text-gray-900">
              Geography Selection
            </h3>
          </div>
          {selectedCount > 0 && (
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 text-xs bg-blue-600 text-white rounded-full">
                {selectedCount} selected
              </span>
              <button
                onClick={clearAll}
                className="text-xs text-blue-600 hover:text-blue-800 flex items-center gap-1"
              >
                <X className="h-3 w-3" />
                Clear All
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Actions */}
      <div className="p-2 border-b border-gray-200 bg-white flex gap-2">
        <button
          onClick={selectAll}
          className="px-3 py-1.5 text-xs bg-blue-100 text-blue-700 rounded hover:bg-blue-200"
        >
          Select All
        </button>
        <button
          onClick={clearAll}
          className="px-3 py-1.5 text-xs bg-gray-100 text-gray-700 rounded hover:bg-gray-200"
        >
          Clear All
        </button>
      </div>

      {/* Geography Tree */}
      <div className="p-3 max-h-[500px] overflow-y-auto">
        {/* Global Level */}
        {global && global.length > 0 && (
          <div className="mb-3 border border-gray-200 rounded-md">
            <div className="flex items-center p-2 bg-gray-50 hover:bg-gray-100">
              <button
                onClick={() => setExpandedGlobal(!expandedGlobal)}
                className="mr-2 text-gray-500 hover:text-gray-700"
              >
                {expandedGlobal ? (
                  <ChevronDown className="h-4 w-4" />
                ) : (
                  <ChevronRight className="h-4 w-4" />
                )}
              </button>
              <button
                onClick={() => toggleGeography(global[0])}
                className="flex-1 flex items-center gap-2 text-left"
              >
                <div className={`w-4 h-4 border-2 rounded flex items-center justify-center ${
                  isGeographySelected(global[0])
                    ? 'bg-blue-600 border-blue-600'
                    : 'border-gray-300'
                }`}>
                  {isGeographySelected(global[0]) && <Check className="h-3 w-3 text-white" />}
                </div>
                <span className="text-sm font-semibold text-gray-900">{global[0]}</span>
              </button>
            </div>
            {expandedGlobal && (
              <div className="p-2 bg-white text-xs text-gray-600">
                Global geography level - includes all regions and countries
              </div>
            )}
          </div>
        )}

        {/* Regions and Countries */}
        <div className="space-y-2">
          {regions.map(region => {
            const regionCountries = countries[region] || []
            const isRegionExpanded = expandedRegions.has(region)
            const isRegionSelected = isGeographySelected(region)
            const allCountriesSelected = areAllCountriesSelected(region)
            const someCountriesSelected = areSomeCountriesSelected(region)

            return (
              <div key={region} className="border border-gray-200 rounded-md">
                {/* Region Level */}
                <div className="flex items-center p-2 bg-gray-50 hover:bg-gray-100">
                  <button
                    onClick={() => toggleRegion(region)}
                    className="mr-2 text-gray-500 hover:text-gray-700"
                  >
                    {isRegionExpanded ? (
                      <ChevronDown className="h-4 w-4" />
                    ) : (
                      <ChevronRight className="h-4 w-4" />
                    )}
                  </button>
                  <button
                    onClick={() => toggleRegionWithCountries(region)}
                    className="flex-1 flex items-center gap-2 text-left"
                  >
                    <div className={`w-4 h-4 border-2 rounded flex items-center justify-center ${
                      isRegionSelected || allCountriesSelected
                        ? 'bg-blue-600 border-blue-600'
                        : someCountriesSelected
                        ? 'bg-blue-200 border-blue-600'
                        : 'border-gray-300'
                    }`}>
                      {(isRegionSelected || allCountriesSelected) && (
                        <Check className="h-3 w-3 text-white" />
                      )}
                    </div>
                    <span className="text-sm font-medium text-gray-900">{region}</span>
                    <span className="text-xs text-gray-500">
                      ({regionCountries.length} {regionCountries.length === 1 ? 'selection' : 'selections'})
                    </span>
                  </button>
                </div>

                {/* Countries Level */}
                {isRegionExpanded && regionCountries.length > 0 && (
                  <div className="border-t border-gray-200 bg-white">
                    {regionCountries.map(country => {
                      const isCountrySelected = isGeographySelected(country)
                      return (
                        <div
                          key={country}
                          className="flex items-center p-2 pl-8 hover:bg-gray-50"
                        >
                          <button
                            onClick={() => toggleGeography(country)}
                            className="flex-1 flex items-center gap-2 text-left"
                          >
                            <div className={`w-4 h-4 border-2 rounded flex items-center justify-center ${
                              isCountrySelected
                                ? 'bg-blue-600 border-blue-600'
                                : 'border-gray-300'
                            }`}>
                              {isCountrySelected && <Check className="h-3 w-3 text-white" />}
                            </div>
                            <span className="text-sm text-gray-700">{country}</span>
                          </button>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>

      {/* Summary */}
      {selectedCount > 0 && (
        <div className="border-t border-gray-200 p-3 bg-blue-50">
          <div className="text-xs font-medium text-blue-900 mb-1">
            Selected Geographies Summary
          </div>
          <div className="text-xs text-blue-700">
            {selectedCount} {selectedCount === 1 ? 'geography' : 'geographies'} selected
          </div>
          {selectedCount > 0 && selectedCount <= 10 && (
            <div className="mt-2 flex flex-wrap gap-1">
              {selectedGeographies.map(geo => (
                <span
                  key={geo}
                  className="px-2 py-0.5 text-xs bg-white text-blue-800 rounded border border-blue-200"
                >
                  {geo}
                </span>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}



