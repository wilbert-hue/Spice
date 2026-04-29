'use client'

import { useState, useEffect } from 'react'
import { ChevronRight, ChevronDown, X, Check, Filter } from 'lucide-react'

interface SegmentDimension {
  type: 'flat' | 'hierarchical'
  items: string[]
  hierarchy: Record<string, string[]>
  b2b_hierarchy?: Record<string, string[]>
  b2c_hierarchy?: Record<string, string[]>
  b2b_items?: string[]
  b2c_items?: string[]
}

interface DimensionsData {
  segments: Record<string, SegmentDimension>
}

interface SelectedSegments {
  [segmentType: string]: Set<string>
}

interface AllSegmentationFiltersProps {
  onFiltersChange?: (filters: SelectedSegments) => void
}

export function AllSegmentationFilters({ onFiltersChange }: AllSegmentationFiltersProps) {
  const [dimensionsData, setDimensionsData] = useState<DimensionsData | null>(null)
  const [selectedSegments, setSelectedSegments] = useState<SelectedSegments>({})
  const [expandedTypes, setExpandedTypes] = useState<Set<string>>(new Set())
  const [expandedHierarchies, setExpandedHierarchies] = useState<Set<string>>(new Set())

  // Load dimensions data
  useEffect(() => {
    async function loadData() {
      try {
        // Try fetching from public folder
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
    loadData()
  }, [])

  // Toggle segment type expansion
  const toggleTypeExpansion = (segmentType: string) => {
    const newExpanded = new Set(expandedTypes)
    if (newExpanded.has(segmentType)) {
      newExpanded.delete(segmentType)
    } else {
      newExpanded.add(segmentType)
    }
    setExpandedTypes(newExpanded)
  }

  // Toggle hierarchy node expansion
  const toggleHierarchyExpansion = (key: string) => {
    const newExpanded = new Set(expandedHierarchies)
    if (newExpanded.has(key)) {
      newExpanded.delete(key)
    } else {
      newExpanded.add(key)
    }
    setExpandedHierarchies(newExpanded)
  }

  // Toggle segment selection
  const toggleSegmentSelection = (segmentType: string, segment: string) => {
    const newSelected = { ...selectedSegments }
    if (!newSelected[segmentType]) {
      newSelected[segmentType] = new Set()
    }
    
    if (newSelected[segmentType].has(segment)) {
      newSelected[segmentType].delete(segment)
    } else {
      newSelected[segmentType].add(segment)
    }
    
    setSelectedSegments(newSelected)
    if (onFiltersChange) {
      onFiltersChange(newSelected)
    }
  }

  // Check if segment is selected
  const isSegmentSelected = (segmentType: string, segment: string): boolean => {
    return selectedSegments[segmentType]?.has(segment) || false
  }

  // Check if any child is selected (for partial selection indicator)
  const hasSelectedChildren = (segmentType: string, parent: string, hierarchy: Record<string, string[]>): boolean => {
    const children = hierarchy[parent] || []
    return children.some(child => {
      if (isSegmentSelected(segmentType, child)) return true
      // Recursively check nested children
      return hasSelectedChildren(segmentType, child, hierarchy)
    })
  }

  // Clear all segments for a type
  const clearSegmentsForType = (segmentType: string) => {
    const newSelected = { ...selectedSegments }
    delete newSelected[segmentType]
    setSelectedSegments(newSelected)
    if (onFiltersChange) {
      onFiltersChange(newSelected)
    }
  }

  // Render flat segmentation (simple list)
  const renderFlatSegmentation = (segmentType: string, dimension: SegmentDimension) => {
    const isExpanded = expandedTypes.has(segmentType)
    const selectedCount = selectedSegments[segmentType]?.size || 0

    return (
      <div key={segmentType} className="border border-gray-200 rounded-md mb-3">
        <div className="flex items-center p-2 bg-gray-50 hover:bg-gray-100">
          <button
            onClick={() => toggleTypeExpansion(segmentType)}
            className="mr-2 text-gray-500 hover:text-gray-700"
          >
            {isExpanded ? (
              <ChevronDown className="h-4 w-4" />
            ) : (
              <ChevronRight className="h-4 w-4" />
            )}
          </button>
          <div className="flex-1 flex items-center justify-between">
            <span className="text-sm font-medium text-gray-900">{segmentType}</span>
            {selectedCount > 0 && (
              <span className="px-2 py-0.5 text-xs bg-blue-600 text-white rounded-full">
                {selectedCount}
              </span>
            )}
          </div>
          {selectedCount > 0 && (
            <button
              onClick={() => clearSegmentsForType(segmentType)}
              className="ml-2 text-xs text-blue-600 hover:text-blue-800"
            >
              <X className="h-3 w-3" />
            </button>
          )}
        </div>

        {isExpanded && (
          <div className="p-2 bg-white space-y-1">
            {dimension.items.map(item => {
              const isSelected = isSegmentSelected(segmentType, item)
              return (
                <div
                  key={item}
                  className="flex items-center p-2 hover:bg-gray-50 rounded"
                >
                  <button
                    onClick={() => toggleSegmentSelection(segmentType, item)}
                    className="flex-1 flex items-center gap-2 text-left"
                  >
                    <div className={`w-4 h-4 border-2 rounded flex items-center justify-center ${
                      isSelected 
                        ? 'bg-blue-600 border-blue-600' 
                        : 'border-gray-300'
                    }`}>
                      {isSelected && <Check className="h-3 w-3 text-white" />}
                    </div>
                    <span className="text-sm text-gray-700">{item}</span>
                  </button>
                </div>
              )
            })}
          </div>
        )}
      </div>
    )
  }

  // Render hierarchical segmentation
  const renderHierarchicalSegmentation = (segmentType: string, dimension: SegmentDimension) => {
    const isExpanded = expandedTypes.has(segmentType)
    const selectedCount = selectedSegments[segmentType]?.size || 0
    const hierarchy = dimension.hierarchy || {}

    // Find root nodes (nodes that are not children of any other node)
    const allChildren = new Set(Object.values(hierarchy).flat())
    const rootNodes = dimension.items.filter(item => !allChildren.has(item))

    // Recursive function to render hierarchy nodes
    const renderHierarchyNode = (node: string, level: number = 0, parentPath: string[] = []) => {
      const nodeKey = parentPath.length > 0 ? `${parentPath.join('::')}::${node}` : node
      const isNodeExpanded = expandedHierarchies.has(nodeKey)
      const children = hierarchy[node] || []
      const isSelected = isSegmentSelected(segmentType, node)
      const hasChildrenSelected = hasSelectedChildren(segmentType, node, hierarchy)

      return (
        <div key={nodeKey} className={level > 0 ? 'ml-4 border-l border-gray-200 pl-2' : ''}>
          <div className="flex items-center p-1.5 hover:bg-gray-50 rounded">
            {children.length > 0 && (
              <button
                onClick={() => toggleHierarchyExpansion(nodeKey)}
                className="mr-1 text-gray-500 hover:text-gray-700"
              >
                {isNodeExpanded ? (
                  <ChevronDown className="h-3 w-3" />
                ) : (
                  <ChevronRight className="h-3 w-3" />
                )}
              </button>
            )}
            {children.length === 0 && <div className="w-4 mr-1" />}
            <button
              onClick={() => toggleSegmentSelection(segmentType, node)}
              className="flex-1 flex items-center gap-2 text-left"
            >
              <div className={`w-4 h-4 border-2 rounded flex items-center justify-center ${
                isSelected 
                  ? 'bg-blue-600 border-blue-600' 
                  : hasChildrenSelected
                  ? 'bg-blue-200 border-blue-600'
                  : 'border-gray-300'
              }`}>
                {isSelected && <Check className="h-3 w-3 text-white" />}
              </div>
              <span className={`text-sm ${level === 0 ? 'font-medium text-gray-900' : 'text-gray-700'}`}>
                {node}
              </span>
            </button>
          </div>

          {isNodeExpanded && children.length > 0 && (
            <div className="mt-1">
              {children.map(child => renderHierarchyNode(child, level + 1, [...parentPath, node]))}
            </div>
          )}
        </div>
      )
    }

    return (
      <div key={segmentType} className="border border-gray-200 rounded-md mb-3">
        <div className="flex items-center p-2 bg-gray-50 hover:bg-gray-100">
          <button
            onClick={() => toggleTypeExpansion(segmentType)}
            className="mr-2 text-gray-500 hover:text-gray-700"
          >
            {isExpanded ? (
              <ChevronDown className="h-4 w-4" />
            ) : (
              <ChevronRight className="h-4 w-4" />
            )}
          </button>
          <div className="flex-1 flex items-center justify-between">
            <span className="text-sm font-medium text-gray-900">{segmentType}</span>
            {selectedCount > 0 && (
              <span className="px-2 py-0.5 text-xs bg-blue-600 text-white rounded-full">
                {selectedCount}
              </span>
            )}
          </div>
          {selectedCount > 0 && (
            <button
              onClick={() => clearSegmentsForType(segmentType)}
              className="ml-2 text-xs text-blue-600 hover:text-blue-800"
            >
              <X className="h-3 w-3" />
            </button>
          )}
        </div>

        {isExpanded && (
          <div className="p-2 bg-white max-h-[400px] overflow-y-auto">
            {rootNodes.length > 0 ? (
              rootNodes.map(root => renderHierarchyNode(root, 0))
            ) : (
              <div className="text-sm text-gray-500">No segments available</div>
            )}
          </div>
        )}
      </div>
    )
  }

  if (!dimensionsData) {
    return (
      <div className="bg-white rounded-lg shadow-sm p-4">
        <div className="text-sm text-gray-600">Loading segmentation data...</div>
      </div>
    )
  }

  const segmentTypes = Object.keys(dimensionsData.segments)
  const totalSelected = Object.values(selectedSegments).reduce((sum, set) => sum + set.size, 0)

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200">
      {/* Header */}
      <div className="border-b border-gray-200 p-3 bg-gray-50">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-gray-600" />
            <h3 className="text-sm font-semibold text-gray-900">
              All Segmentation Filters
            </h3>
          </div>
          {totalSelected > 0 && (
            <span className="px-2 py-0.5 text-xs bg-blue-600 text-white rounded-full">
              {totalSelected} selected
            </span>
          )}
        </div>
      </div>

      {/* Filters Content */}
      <div className="p-3 max-h-[700px] overflow-y-auto">
        {segmentTypes.map(segmentType => {
          const dimension = dimensionsData.segments[segmentType]
          
          if (dimension.type === 'flat') {
            return renderFlatSegmentation(segmentType, dimension)
          } else {
            return renderHierarchicalSegmentation(segmentType, dimension)
          }
        })}
      </div>

      {/* Summary */}
      {totalSelected > 0 && (
        <div className="border-t border-gray-200 p-3 bg-blue-50">
          <div className="text-xs font-medium text-blue-900 mb-1">
            Selected Segments Summary
          </div>
          <div className="text-xs text-blue-700 space-y-1">
            {Object.entries(selectedSegments).map(([type, segments]) => (
              segments.size > 0 && (
                <div key={type}>
                  <span className="font-medium">{type}:</span> {segments.size} selected
                </div>
              )
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

