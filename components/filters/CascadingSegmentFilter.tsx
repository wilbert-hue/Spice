'use client'

import { useState, useEffect } from 'react'
import { useDashboardStore } from '@/lib/store'
import { ChevronDown, X, Plus, Tag, Filter } from 'lucide-react'

interface SegmentationStructure {
  [key: string]: SegmentationStructure | string[]
}

interface SegmentDimension {
  type: 'flat' | 'hierarchical'
  items: string[]
  hierarchy: Record<string, string[]>
  b2b_hierarchy?: Record<string, string[]>
  b2c_hierarchy?: Record<string, string[]>
}

interface DimensionsData {
  segments: Record<string, SegmentDimension>
}

interface SelectedPath {
  level: number
  value: string
  key: string
}

export function CascadingSegmentFilter() {
  const { filters, updateFilters } = useDashboardStore()
  const [dimensionsData, setDimensionsData] = useState<DimensionsData | null>(null)
  const [selectedSegmentType, setSelectedSegmentType] = useState<string>('By End-Use*Product Type')
  const [segmentationData, setSegmentationData] = useState<SegmentationStructure | null>(null)
  const [selectedPath, setSelectedPath] = useState<SelectedPath[]>([])

  // Load dimensions data to get available segmentation types
  useEffect(() => {
    async function loadDimensions() {
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
        setDimensionsData({ segments: data.dimensions.segments })
      } catch (error) {
        console.error('Failed to load dimensions data:', error)
      }
    }
    loadDimensions()
  }, [])

  // Load segmentation data based on selected type
  useEffect(() => {
    async function loadSegmentationData() {
      if (!dimensionsData || !selectedSegmentType) return

      const segmentDef = dimensionsData.segments[selectedSegmentType]
      if (!segmentDef) return

      // Update filter state with selected segment type
      updateFilters({ segmentType: selectedSegmentType })

      // Reset path when segment type changes
      setSelectedPath([])

      // For "By End-Use*Product Type", load from segmentation-structure.json
      if (selectedSegmentType === 'By End-Use*Product Type') {
        try {
          const response = await fetch('/jsons/segmentation-structure.json', {
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
            console.error('Received HTML instead of JSON.')
            return
          }
          
          const data = JSON.parse(text)
          // Store the full structure (both B2B and B2C)
          setSegmentationData(data)
        } catch (error) {
          console.error('Failed to load segmentation data:', error)
        }
      } else {
        // For other types, convert the hierarchy/items structure to SegmentationStructure format
        let structure: SegmentationStructure = {}
        
        if (segmentDef.type === 'hierarchical' && segmentDef.hierarchy) {
          // Convert hierarchy to nested structure
          structure = convertHierarchyToStructure(segmentDef.hierarchy)
        } else if (segmentDef.type === 'flat' && segmentDef.items) {
          // For flat structures, create a simple object with items as array
          structure = { items: segmentDef.items }
        }
        
        setSegmentationData(structure)
      }
    }
    loadSegmentationData()
  }, [dimensionsData, selectedSegmentType, updateFilters])

  // Helper to convert hierarchy to nested structure
  function convertHierarchyToStructure(hierarchy: Record<string, string[]>): SegmentationStructure {
    const structure: SegmentationStructure = {}
    
    // Helper to recursively build structure
    function buildStructure(key: string, visited: Set<string> = new Set()): SegmentationStructure | string[] {
      if (visited.has(key)) {
        // Prevent infinite loops
        return []
      }
      visited.add(key)
      
      const values = hierarchy[key]
      if (!values || values.length === 0) {
        return []
      }
      
      // Check if any value is a key in hierarchy (nested)
      const nested: SegmentationStructure = {}
      const leafItems: string[] = []
      
      values.forEach(v => {
        if (hierarchy[v] !== undefined) {
          // This is a nested key
          nested[v] = buildStructure(v, new Set(visited))
        } else {
          // This is a leaf item
          leafItems.push(v)
        }
      })
      
      // If we have both nested and leaf items, combine them
      if (Object.keys(nested).length > 0 && leafItems.length > 0) {
        return { ...nested, _items: leafItems }
      } else if (Object.keys(nested).length > 0) {
        return nested
      } else {
        return leafItems
      }
    }
    
    // Build structure for each top-level key
    Object.keys(hierarchy).forEach(key => {
      // Only process top-level keys (keys that aren't values of other keys)
      const isTopLevel = !Object.values(hierarchy).some(values => values.includes(key))
      if (isTopLevel) {
        structure[key] = buildStructure(key)
      }
    })
    
    return structure
  }

  // Reset path when segment type changes
  useEffect(() => {
    setSelectedPath([])
  }, [selectedSegmentType])

  // Get current segment definition
  const currentSegmentDef = dimensionsData?.segments[selectedSegmentType]
  const isFlat = currentSegmentDef?.type === 'flat'
  const isHierarchical = currentSegmentDef?.type === 'hierarchical'

  // Get current data - filter by businessType if it's "By End-Use*Product Type"
  const currentData = isHierarchical && selectedSegmentType === 'By End-Use*Product Type' && segmentationData
    ? (segmentationData[filters.businessType] as SegmentationStructure | undefined)
    : segmentationData

  // Get options for current level
  const getCurrentLevelOptions = (): string[] => {
    if (!currentData) return []
    
    let currentLevelData: SegmentationStructure | string[] | undefined = currentData
    
    // Navigate through selected path
    for (const pathItem of selectedPath) {
      if (typeof currentLevelData === 'object' && !Array.isArray(currentLevelData)) {
        currentLevelData = currentLevelData[pathItem.value]
      } else {
        return []
      }
    }
    
    // If we've reached an array, return empty (leaf level)
    if (Array.isArray(currentLevelData)) {
      return []
    }
    
    // Return keys of current level
    if (currentLevelData && typeof currentLevelData === 'object') {
      return Object.keys(currentLevelData)
    }
    
    return []
  }

  // Check if current level is leaf (array of items)
  const isCurrentLevelLeaf = (): boolean => {
    if (!currentData) return false
    
    let currentLevelData: SegmentationStructure | string[] | undefined = currentData
    
    for (const pathItem of selectedPath) {
      if (typeof currentLevelData === 'object' && !Array.isArray(currentLevelData)) {
        currentLevelData = currentLevelData[pathItem.value]
      } else {
        return false
      }
    }
    
    return Array.isArray(currentLevelData)
  }

  // Get leaf items (final array)
  const getLeafItems = (): string[] => {
    if (!currentData) return []
    
    let currentLevelData: SegmentationStructure | string[] | undefined = currentData
    
    for (const pathItem of selectedPath) {
      if (typeof currentLevelData === 'object' && !Array.isArray(currentLevelData)) {
        currentLevelData = currentLevelData[pathItem.value]
      } else {
        return []
      }
    }
    
    if (Array.isArray(currentLevelData)) {
      return currentLevelData
    }
    
    return []
  }

  // Handle selection at a level
  const handleLevelSelection = (level: number, value: string) => {
    // Remove all selections after this level
    const newPath = selectedPath.slice(0, level)
    newPath.push({ level, value, key: `${level}-${value}` })
    setSelectedPath(newPath)
  }

  // Handle leaf item selection - add to selected segments list
  const handleLeafItemSelection = (item: string) => {
    const fullPath = [...selectedPath.map(p => p.value), item].join(' > ')
    const currentSegments = filters.segments || []
    
    if (!currentSegments.includes(fullPath)) {
      updateFilters({ 
        segments: [...currentSegments, fullPath],
        segmentType: selectedSegmentType
      })
    }
  }

  // Add current complete path as a segment (for parent levels)
  const handleAddCurrentPath = () => {
    if (selectedPath.length === 0) return
    
    const fullPath = selectedPath.map(p => p.value).join(' > ')
    const currentSegments = filters.segments || []
    
    if (!currentSegments.includes(fullPath)) {
      updateFilters({ 
        segments: [...currentSegments, fullPath],
        segmentType: selectedSegmentType
      })
    }
  }

  // Check if current path is already selected (either as exact path or as parent of any selected segment)
  const isCurrentPathSelected = (): boolean => {
    if (selectedPath.length === 0) return false
    const currentPath = selectedPath.map(p => p.value).join(' > ')
    
    // Check if exact path is selected
    if (filters.segments?.includes(currentPath)) {
      return true
    }
    
    // Check if any selected segment starts with this path (meaning items from this path are selected)
    if (filters.segments) {
      const hasChildSelected = filters.segments.some(segment => {
        // Check if segment starts with current path followed by ' > '
        return segment.startsWith(currentPath + ' > ')
      })
      if (hasChildSelected) {
        return true
      }
    }
    
    return false
  }
  
  // Check if any items from current path are selected
  const hasItemsSelected = (): boolean => {
    if (selectedPath.length === 0 || !isLeaf) return false
    const currentPath = selectedPath.map(p => p.value).join(' > ')
    
    if (filters.segments) {
      return filters.segments.some(segment => segment.startsWith(currentPath + ' > '))
    }
    return false
  }

  // Clear a level and all below it
  const clearFromLevel = (level: number) => {
    setSelectedPath(selectedPath.slice(0, level))
  }

  // Get current level number
  const getCurrentLevelNumber = (): number => {
    return selectedPath.length
  }

  // Get display label for a level
  const getLevelLabel = (level: number): string => {
    if (level === 0) {
      return 'Category'
    } else if (level === 1) {
      return 'Subcategory'
    } else if (level === 2) {
      return 'Product Type'
    } else {
      return `Level ${level + 1}`
    }
  }

  const currentOptions = getCurrentLevelOptions()
  const isLeaf = isCurrentLevelLeaf()
  const leafItems = getLeafItems()
  const currentLevel = getCurrentLevelNumber()

  if (!segmentationData) {
    return (
      <div className="bg-white rounded-lg shadow-sm p-4">
        <div className="text-sm text-gray-600">Loading segmentation data...</div>
      </div>
    )
  }

  // Get available segmentation types
  const availableSegmentTypes = dimensionsData ? Object.keys(dimensionsData.segments) : []

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200">
      {/* Header with Segmentation Type Selector */}
      <div className="border-b border-gray-200 p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-gray-600" />
            <h3 className="text-sm font-semibold text-gray-900">Segment Filter</h3>
          </div>
        </div>
        
        {/* Segmentation Type Selector */}
        <div className="mb-3">
          <label className="block text-xs font-medium text-gray-700 mb-2">
            Select Segmentation Type
          </label>
          <select
            value={selectedSegmentType}
            onChange={(e) => setSelectedSegmentType(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {availableSegmentTypes.map(type => (
              <option key={type} value={type}>
                {type}
              </option>
            ))}
          </select>
        </div>

        {/* B2B/B2C Filter - Available for all segmentation types */}
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-2">
            Business Type
          </label>
          <div className="flex gap-2">
            <button
              onClick={() => updateFilters({ businessType: 'B2B' })}
              className={`flex-1 px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                filters.businessType === 'B2B'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              B2B
            </button>
            <button
              onClick={() => updateFilters({ businessType: 'B2C' })}
              className={`flex-1 px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                filters.businessType === 'B2C'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              B2C
            </button>
          </div>
        </div>
      </div>

      {/* Cascading Filters */}
      <div className="p-4 space-y-4">
        {/* Flat Structure - Show all items at once */}
        {isFlat && currentSegmentDef && (
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-2">
              Select Items
            </label>
            <div className="max-h-64 overflow-y-auto border border-gray-300 rounded-md">
              {currentSegmentDef.items.map(item => {
                const fullPath = item
                const isSelected = filters.segments?.includes(fullPath) || false
                
                return (
                  <label
                    key={item}
                    className={`flex items-center px-3 py-2 hover:bg-gray-50 cursor-pointer border-b border-gray-100 last:border-b-0 ${
                      isSelected ? 'bg-blue-50' : ''
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => {
                        const currentSegments = filters.segments || []
                        if (isSelected) {
                          updateFilters({
                            segments: currentSegments.filter(s => s !== fullPath)
                          })
                        } else {
                          updateFilters({
                            segments: [...currentSegments, fullPath],
                            segmentType: selectedSegmentType
                          })
                        }
                      }}
                      className="mr-2 h-4 w-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
                    />
                    <span className="text-sm text-gray-700">{item}</span>
                  </label>
                )
              })}
            </div>
          </div>
        )}

        {/* Hierarchical Structure - Cascading filters */}
        {isHierarchical && (
          <>
            {/* Level 0 - Category (always show if no selection) */}
            {currentLevel === 0 && (
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-2">
                  {getLevelLabel(0)}
                </label>
                <select
                  value=""
                  onChange={(e) => {
                    if (e.target.value) {
                      handleLevelSelection(0, e.target.value)
                    }
                  }}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Select {getLevelLabel(0)}...</option>
                  {currentOptions.map(option => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </>
        )}

        {/* Dynamic Levels - Show each selected level and next level (only for hierarchical) */}
        {isHierarchical && selectedPath.map((pathItem, index) => (
          <div key={pathItem.key} className="space-y-2">
            {/* Selected Level Display */}
            <div className="flex items-center gap-2 p-2 bg-blue-50 rounded-md border border-blue-200">
              <span className="text-xs font-medium text-blue-900">
                {getLevelLabel(index)}:
              </span>
              <span className="text-sm text-blue-800 flex-1">{pathItem.value}</span>
              <button
                onClick={() => clearFromLevel(index)}
                className="text-blue-600 hover:text-blue-800"
                title="Remove this selection"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Next Level Selector */}
            {index === selectedPath.length - 1 && (
              <div className="space-y-2">
                {isLeaf ? (
                  // Leaf level - show items
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-2">
                      Items
                    </label>
                    <div className="max-h-48 overflow-y-auto border border-gray-300 rounded-md">
                      {leafItems.map(item => {
                        const fullPath = [...selectedPath.map(p => p.value), item].join(' > ')
                        const isSelected = filters.segments?.includes(fullPath) || false
                        
                        return (
                          <label
                            key={item}
                            className={`flex items-center px-3 py-2 hover:bg-gray-50 cursor-pointer border-b border-gray-100 last:border-b-0 ${
                              isSelected ? 'bg-blue-50' : ''
                            }`}
                          >
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => {
                                const currentSegments = filters.segments || []
                                if (isSelected) {
                                  updateFilters({
                                    segments: currentSegments.filter(s => s !== fullPath)
                                  })
                                } else {
                                  updateFilters({
                                    segments: [...currentSegments, fullPath],
                                    segmentType: 'By End-Use*Product Type'
                                  })
                                }
                              }}
                              className="mr-2 h-4 w-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
                            />
                            <span className="text-sm text-gray-700">{item}</span>
                          </label>
                        )
                      })}
                    </div>
                  </div>
                ) : (
                  // Next level selector
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-2">
                      {getLevelLabel(index + 1)}
                    </label>
                    <select
                      value=""
                      onChange={(e) => {
                        if (e.target.value) {
                          handleLevelSelection(index + 1, e.target.value)
                        }
                      }}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">Select {getLevelLabel(index + 1)}...</option>
                      {currentOptions.map(option => (
                        <option key={option} value={option}>
                          {option}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
                
                {/* Add Current Path Button - Always visible when path is selected and not already added */}
                {selectedPath.length > 0 && !isCurrentPathSelected() && (
                  <button
                    onClick={handleAddCurrentPath}
                    className="w-full px-3 py-2 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700 flex items-center justify-center gap-2"
                  >
                    <Plus className="h-4 w-4" />
                    <span>Add "{selectedPath.map(p => p.value).join(' > ')}" to Comparison</span>
                  </button>
                )}
                
                {/* Info message when items are selected but path itself isn't */}
                {isLeaf && hasItemsSelected() && !isCurrentPathSelected() && (
                  <div className="p-2 bg-blue-50 rounded-md border border-blue-200">
                    <p className="text-xs text-blue-700">
                      💡 Individual items are selected. Click above to add the parent category to comparison.
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>
        ))}

        {/* Selected Segments for Cross-Segmental Analysis */}
        {filters.segments && filters.segments.length > 0 && (
          <div className="mt-4 p-3 bg-green-50 rounded-md border border-green-200">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <Tag className="h-4 w-4 text-green-700" />
                <span className="text-xs font-medium text-green-900">
                  Selected Segments for Analysis ({filters.segments.length})
                </span>
              </div>
              <button
                onClick={() => updateFilters({ segments: [] })}
                className="text-xs text-green-600 hover:text-green-800 font-medium"
              >
                Clear All
              </button>
            </div>
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {filters.segments.map((segment, idx) => (
                <div
                  key={idx}
                  className="flex items-center justify-between p-2 bg-white rounded border border-green-200 hover:border-green-300"
                >
                  <div className="flex-1">
                    <span className="text-xs font-medium text-gray-900">{idx + 1}.</span>
                    <span className="text-xs text-gray-700 ml-2">{segment}</span>
                  </div>
                  <button
                    onClick={() => {
                      const updated = filters.segments?.filter(s => s !== segment) || []
                      updateFilters({ segments: updated })
                    }}
                    className="ml-2 text-green-600 hover:text-green-800 p-1"
                    title="Remove segment"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              ))}
            </div>
            <div className="mt-2 pt-2 border-t border-green-200">
              <p className="text-xs text-green-700">
                💡 These segments will be compared across all charts for cross-segmental analysis
              </p>
            </div>
          </div>
        )}

        {/* Instructions when no segments selected */}
        {(!filters.segments || filters.segments.length === 0) && selectedPath.length > 0 && (
          <div className="mt-4 p-3 bg-blue-50 rounded-md border border-blue-200">
            <p className="text-xs text-blue-700">
              💡 Navigate through the hierarchy and select items to add segments for cross-segmental analysis. 
              You can also add intermediate levels by clicking "Add to Comparison" button.
            </p>
          </div>
        )}
      </div>
    </div>
  )
}

