'use client'

import { useState, useMemo, useEffect, useRef } from 'react'
import { useDashboardStore } from '@/lib/store'
import { Check, ChevronDown } from 'lucide-react'

export function GeographyMultiSelect() {
  const { data, filters, updateFilters } = useDashboardStore()
  const [isOpen, setIsOpen] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const dropdownRef = useRef<HTMLDivElement>(null)

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isOpen])

  const geographyOptions = useMemo(() => {
    if (!data) return { regions: [], countries: {} }
    
    const { regions, countries } = data.dimensions.geographies
    
    // Filter based on search
    if (!searchTerm) {
      return { regions, countries }
    }
    
    const search = searchTerm.toLowerCase()
    const filteredCountries: Record<string, string[]> = {}
    
    regions.forEach(region => {
      const matchingCountries = (countries[region] || []).filter(country =>
        country.toLowerCase().includes(search)
      )
      if (matchingCountries.length > 0 || region.toLowerCase().includes(search)) {
        filteredCountries[region] = matchingCountries
      }
    })
    
    return {
      regions: regions.filter(r => r in filteredCountries),
      countries: filteredCountries
    }
  }, [data, searchTerm])

  const handleToggle = (geography: string) => {
    const current = filters.geographies
    const updated = current.includes(geography)
      ? current.filter(g => g !== geography)
      : [...current, geography]
    
    updateFilters({ geographies: updated })
  }

  const handleSelectAll = () => {
    if (!data) return
    // Include all geographies (Global, regions, and countries)
    updateFilters({ 
      geographies: data.dimensions.geographies.all_geographies
    })
  }

  const handleClearAll = () => {
    updateFilters({ geographies: [] })
  }

  if (!data) return null

  const selectedCount = filters.geographies.length

  return (
    <div className="relative" ref={dropdownRef}>
      <label className="block text-sm font-medium text-black mb-2">
        Geography Selection
      </label>
      
      {/* Dropdown Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full px-4 py-2 text-left bg-white border border-gray-300 rounded-md shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 flex items-center justify-between"
      >
        <span className="text-sm text-black">
          {selectedCount === 0 
            ? 'Select geographies...' 
            : `${selectedCount} selected`}
        </span>
        <ChevronDown className={`h-4 w-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {/* Dropdown Panel */}
      {isOpen && (
        <div className="absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-96 overflow-hidden">
          {/* Search */}
          <div className="p-3 border-b">
            <input
              type="text"
              placeholder="Search geographies..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm text-black placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Actions */}
          <div className="px-3 py-2 bg-gray-50 border-b flex gap-2">
            <button
              onClick={handleSelectAll}
              className="px-3 py-1 text-xs bg-blue-100 text-blue-700 rounded hover:bg-blue-200"
            >
              Select All
            </button>
            <button
              onClick={handleClearAll}
              className="px-3 py-1 text-xs bg-gray-100 text-black rounded hover:bg-gray-200"
            >
              Clear All
            </button>
          </div>

          {/* Geography List */}
          <div className="overflow-y-auto max-h-64">
            {/* Global Option - Use actual global geography from data */}
            {data.dimensions.geographies.global && data.dimensions.geographies.global.length > 0 && (
              <label className="flex items-center px-3 py-2 hover:bg-blue-50 cursor-pointer border-b">
                <input
                  type="checkbox"
                  checked={filters.geographies.includes(data.dimensions.geographies.global[0])}
                  onChange={() => handleToggle(data.dimensions.geographies.global[0])}
                  className="mr-3 h-4 w-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
                />
                <span className="text-sm font-semibold text-black">{data.dimensions.geographies.global[0]}</span>
                {filters.geographies.includes(data.dimensions.geographies.global[0]) && (
                  <Check className="ml-auto h-4 w-4 text-blue-600" />
                )}
              </label>
            )}

            {/* Regions and Countries */}
            {geographyOptions.regions.map(region => (
              <div key={region} className="border-b last:border-b-0">
                {/* Region as selectable option */}
                <label className="flex items-center px-3 py-2 bg-gray-50 hover:bg-blue-50 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={filters.geographies.includes(region)}
                    onChange={() => handleToggle(region)}
                    className="mr-3 h-4 w-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
                  />
                  <span className="text-sm font-medium text-black">{region}</span>
                  {filters.geographies.includes(region) && (
                    <Check className="ml-auto h-4 w-4 text-blue-600" />
                  )}
                </label>
                
                {/* Countries under this region */}
                {geographyOptions.countries[region]?.map(country => (
                  <label
                    key={country}
                    className="flex items-center px-6 py-2 hover:bg-blue-50 cursor-pointer"
                  >
                    <input
                      type="checkbox"
                      checked={filters.geographies.includes(country)}
                      onChange={() => handleToggle(country)}
                      className="mr-3 h-4 w-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
                    />
                    <span className="text-sm text-black">{country}</span>
                    {filters.geographies.includes(country) && (
                      <Check className="ml-auto h-4 w-4 text-blue-600" />
                    )}
                  </label>
                ))}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Selected Count Badge */}
      {selectedCount > 0 && (
        <div className="mt-2 flex flex-wrap gap-2">
          <span className="text-xs text-black">
            {selectedCount} {selectedCount === 1 ? 'geography' : 'geographies'} selected
          </span>
        </div>
      )}
    </div>
  )
}

