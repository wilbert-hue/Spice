'use client'

import { useState, useEffect } from 'react'
import { ChevronRight, ChevronDown, X, Check } from 'lucide-react'

interface SegmentationStructure {
  [key: string]: SegmentationStructure | string[]
}

interface SelectedFilters {
  categories: Set<string>
  subcategories: Set<string>
  productTypes: Set<string>
  items: Set<string>
}

interface MarketAnalysisFilterProps {
  onFiltersChange?: (filters: {
    segment: 'B2B' | 'B2C'
    selectedFilters: SelectedFilters
  }) => void
}

export function MarketAnalysisFilter({ onFiltersChange }: MarketAnalysisFilterProps) {
  const [activeTab, setActiveTab] = useState<'B2B' | 'B2C'>('B2B')
  const [segmentationData, setSegmentationData] = useState<SegmentationStructure | null>(null)
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set())
  const [expandedSubcategories, setExpandedSubcategories] = useState<Set<string>>(new Set())
  const [expandedProductTypes, setExpandedProductTypes] = useState<Set<string>>(new Set())
  
  const [b2bFilters, setB2bFilters] = useState<SelectedFilters>({
    categories: new Set(),
    subcategories: new Set(),
    productTypes: new Set(),
    items: new Set()
  })
  
  const [b2cFilters, setB2cFilters] = useState<SelectedFilters>({
    categories: new Set(),
    subcategories: new Set(),
    productTypes: new Set(),
    items: new Set()
  })

  // Load segmentation data
  useEffect(() => {
    async function loadData() {
      try {
        // Try fetching from public folder
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
          console.error('Received HTML instead of JSON. File may not exist or path is incorrect.')
          return
        }
        
        const data = JSON.parse(text)
        setSegmentationData(data)
      } catch (error) {
        console.error('Failed to load segmentation data:', error)
      }
    }
    loadData()
  }, [])

  // Get current filters based on active tab
  const currentFilters = activeTab === 'B2B' ? b2bFilters : b2cFilters
  const setCurrentFilters = activeTab === 'B2B' ? setB2bFilters : setB2cFilters

  // Get data for current tab
  const currentData = segmentationData?.[activeTab] as SegmentationStructure | undefined

  // Toggle expansion
  const toggleCategory = (category: string) => {
    const newExpanded = new Set(expandedCategories)
    if (newExpanded.has(category)) {
      newExpanded.delete(category)
    } else {
      newExpanded.add(category)
    }
    setExpandedCategories(newExpanded)
  }

  const toggleSubcategory = (key: string) => {
    const newExpanded = new Set(expandedSubcategories)
    if (newExpanded.has(key)) {
      newExpanded.delete(key)
    } else {
      newExpanded.add(key)
    }
    setExpandedSubcategories(newExpanded)
  }

  const toggleProductType = (key: string) => {
    const newExpanded = new Set(expandedProductTypes)
    if (newExpanded.has(key)) {
      newExpanded.delete(key)
    } else {
      newExpanded.add(key)
    }
    setExpandedProductTypes(newExpanded)
  }

  // Toggle selection
  const toggleCategorySelection = (category: string) => {
    const newFilters = { ...currentFilters }
    if (newFilters.categories.has(category)) {
      newFilters.categories.delete(category)
      // Also clear all children - handle nested subcategories
      const categoryData = currentData?.[category] as SegmentationStructure | undefined
      if (categoryData) {
        const clearSubcategory = (subcatKey: string, subcatData: SegmentationStructure) => {
          newFilters.subcategories.delete(subcatKey)
          Object.keys(subcatData).forEach(keyName => {
            const value = subcatData[keyName]
            if (Array.isArray(value)) {
              // It's a product type
              const productTypeKey = `${subcatKey}::${keyName}`
              newFilters.productTypes.delete(productTypeKey)
              value.forEach(item => newFilters.items.delete(`${productTypeKey}::${item}`))
            } else if (typeof value === 'object') {
              // It's a nested subcategory
              const nestedSubcatKey = `${subcatKey}::${keyName}`
              clearSubcategory(nestedSubcatKey, value as SegmentationStructure)
            }
          })
        }
        
        Object.keys(categoryData).forEach(subcat => {
          const subcatKey = `${category}::${subcat}`
          const subcatData = categoryData[subcat] as SegmentationStructure | undefined
          if (subcatData) {
            clearSubcategory(subcatKey, subcatData)
          }
        })
      }
    } else {
      newFilters.categories.add(category)
    }
    setCurrentFilters(newFilters)
    notifyFiltersChange(activeTab, newFilters)
  }

  const toggleSubcategorySelection = (category: string, subcategory: string) => {
    const newFilters = { ...currentFilters }
    const key = `${category}::${subcategory}`
    if (newFilters.subcategories.has(key)) {
      newFilters.subcategories.delete(key)
      // Clear all children - handle both nested subcategories and direct product types
      const subcategoryParts = subcategory.split('::')
      let subcatData: SegmentationStructure | undefined
      
      if (subcategoryParts.length > 1) {
        // Nested subcategory
        const [baseSubcat, ...nestedParts] = subcategoryParts
        subcatData = (currentData?.[category] as SegmentationStructure)?.[baseSubcat] as SegmentationStructure | undefined
        
        for (const part of nestedParts) {
          if (!subcatData) break
          subcatData = subcatData[part] as SegmentationStructure | undefined
        }
      } else {
        // Direct subcategory
        subcatData = (currentData?.[category] as SegmentationStructure)?.[subcategory] as SegmentationStructure | undefined
      }
      
      if (subcatData) {
        Object.keys(subcatData).forEach(keyName => {
          const value = subcatData![keyName]
          if (Array.isArray(value)) {
            // It's a product type
            const productType = keyName
            newFilters.productTypes.delete(`${key}::${productType}`)
            value.forEach(item => newFilters.items.delete(`${key}::${productType}::${item}`))
          } else if (typeof value === 'object') {
            // It's a nested subcategory - recursively clear
            const nestedSubcatKey = `${key}::${keyName}`
            newFilters.subcategories.delete(nestedSubcatKey)
            // Recursively clear nested children
            Object.keys(value).forEach(nestedProductType => {
              const nestedItems = (value as SegmentationStructure)[nestedProductType] as string[] | undefined
              if (nestedItems) {
                newFilters.productTypes.delete(`${nestedSubcatKey}::${nestedProductType}`)
                nestedItems.forEach(item => newFilters.items.delete(`${nestedSubcatKey}::${nestedProductType}::${item}`))
              }
            })
          }
        })
      }
    } else {
      newFilters.subcategories.add(key)
    }
    setCurrentFilters(newFilters)
    notifyFiltersChange(activeTab, newFilters)
  }

  const toggleProductTypeSelection = (category: string, subcategory: string, productType: string) => {
    const newFilters = { ...currentFilters }
    const subcatKey = `${category}::${subcategory}`
    const productTypeKey = `${subcatKey}::${productType}`
    if (newFilters.productTypes.has(productTypeKey)) {
      newFilters.productTypes.delete(productTypeKey)
      // Clear all items - handle nested subcategories
      const subcategoryParts = subcategory.split('::')
      let items: string[] | undefined
      
      if (subcategoryParts.length > 1) {
        // Nested subcategory
        const [baseSubcat, ...nestedParts] = subcategoryParts
        let nestedData = (currentData?.[category] as SegmentationStructure)?.[baseSubcat] as SegmentationStructure | undefined
        
        for (const part of nestedParts) {
          if (!nestedData) break
          nestedData = nestedData[part] as SegmentationStructure | undefined
        }
        
        if (nestedData) {
          items = nestedData[productType] as string[] | undefined
        }
      } else {
        // Direct subcategory
        items = ((currentData?.[category] as SegmentationStructure)?.[subcategory] as SegmentationStructure)?.[productType] as string[] | undefined
      }
      
      if (items) {
        items.forEach(item => newFilters.items.delete(`${productTypeKey}::${item}`))
      }
    } else {
      newFilters.productTypes.add(productTypeKey)
    }
    setCurrentFilters(newFilters)
    notifyFiltersChange(activeTab, newFilters)
  }

  const toggleItemSelection = (category: string, subcategory: string, productType: string, item: string) => {
    const newFilters = { ...currentFilters }
    const itemKey = `${category}::${subcategory}::${productType}::${item}`
    if (newFilters.items.has(itemKey)) {
      newFilters.items.delete(itemKey)
    } else {
      newFilters.items.add(itemKey)
    }
    setCurrentFilters(newFilters)
    notifyFiltersChange(activeTab, newFilters)
  }

  // Check if category/subcategory/product type is selected
  const isCategorySelected = (category: string) => currentFilters.categories.has(category)
  const isSubcategorySelected = (category: string, subcategory: string) => 
    currentFilters.subcategories.has(`${category}::${subcategory}`)
  const isProductTypeSelected = (category: string, subcategory: string, productType: string) =>
    currentFilters.productTypes.has(`${category}::${subcategory}::${productType}`)
  const isItemSelected = (category: string, subcategory: string, productType: string, item: string) =>
    currentFilters.items.has(`${category}::${subcategory}::${productType}::${item}`)

  // Check if category/subcategory/product type is partially selected (some children selected)
  const isCategoryPartiallySelected = (category: string) => {
    if (isCategorySelected(category)) return true
    const categoryData = currentData?.[category] as SegmentationStructure | undefined
    if (!categoryData) return false
    return Object.keys(categoryData).some(subcat => 
      isSubcategorySelected(category, subcat) || isSubcategoryPartiallySelected(category, subcat)
    )
  }

  const isSubcategoryPartiallySelected = (category: string, subcategory: string): boolean => {
    const subcatKey = `${category}::${subcategory}`
    if (isSubcategorySelected(category, subcategory)) return true
    const subcatData = (currentData?.[category] as SegmentationStructure)?.[subcategory] as SegmentationStructure | undefined
    if (!subcatData) return false
    
    // Check if this subcategory has nested subcategories
    const hasNestedSubcategories = Object.keys(subcatData).some(key => {
      const value = subcatData[key]
      return !Array.isArray(value) && typeof value === 'object'
    })
    
    if (hasNestedSubcategories) {
      // Check nested subcategories
      return Object.keys(subcatData).some(nestedSubcat => {
        const nestedValue = subcatData[nestedSubcat]
        if (Array.isArray(nestedValue)) return false // Skip arrays (product types)
        return isSubcategorySelected(category, `${subcategory}::${nestedSubcat}`) ||
               isSubcategoryPartiallySelected(category, `${subcategory}::${nestedSubcat}`)
      })
    } else {
      // Check product types directly
      return Object.keys(subcatData).some(productType =>
        isProductTypeSelected(category, subcategory, productType) || 
        isProductTypePartiallySelected(category, subcategory, productType)
      )
    }
  }

  const isProductTypePartiallySelected = (category: string, subcategory: string, productType: string) => {
    const productTypeKey = `${category}::${subcategory}::${productType}`
    if (isProductTypeSelected(category, subcategory, productType)) return true
    
    // Handle nested subcategories (e.g., "Food & Beverage Processing" -> "Packaged Foods")
    const subcategoryParts = subcategory.split('::')
    let items: any
    
    if (subcategoryParts.length > 1) {
      // Nested subcategory path
      const [baseSubcat, ...nestedParts] = subcategoryParts
      let nestedData = (currentData?.[category] as SegmentationStructure)?.[baseSubcat] as SegmentationStructure | undefined
      
      for (const part of nestedParts) {
        if (!nestedData) return false
        nestedData = nestedData[part] as SegmentationStructure | undefined
      }
      
      if (!nestedData) return false
      items = nestedData[productType]
    } else {
      // Direct subcategory
      items = ((currentData?.[category] as SegmentationStructure)?.[subcategory] as SegmentationStructure)?.[productType]
    }
    
    if (!items || !Array.isArray(items)) return false
    return items.some(item => isItemSelected(category, subcategory, productType, item))
  }

  // Clear all filters for current tab
  const clearAllFilters = () => {
    const newFilters: SelectedFilters = {
      categories: new Set(),
      subcategories: new Set(),
      productTypes: new Set(),
      items: new Set()
    }
    setCurrentFilters(newFilters)
    notifyFiltersChange(activeTab, newFilters)
  }

  // Notify parent of filter changes
  const notifyFiltersChange = (segment: 'B2B' | 'B2C', filters: SelectedFilters) => {
    if (onFiltersChange) {
      onFiltersChange({ segment, selectedFilters: filters })
    }
  }

  // Get selected count for current tab
  const getSelectedCount = () => {
    return currentFilters.categories.size + 
           currentFilters.subcategories.size + 
           currentFilters.productTypes.size + 
           currentFilters.items.size
  }

  if (!segmentationData) {
    return (
      <div className="bg-white rounded-lg shadow-sm p-4">
        <div className="text-sm text-gray-600">Loading segmentation data...</div>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200">
      {/* Tabs */}
      <div className="border-b border-gray-200">
        <div className="flex">
          <button
            onClick={() => setActiveTab('B2B')}
            className={`flex-1 px-4 py-3 text-sm font-medium transition-colors ${
              activeTab === 'B2B'
                ? 'bg-blue-50 text-blue-700 border-b-2 border-blue-600'
                : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
            }`}
          >
            B2B
            {b2bFilters.categories.size + b2bFilters.subcategories.size + b2bFilters.productTypes.size + b2bFilters.items.size > 0 && (
              <span className="ml-2 px-2 py-0.5 text-xs bg-blue-600 text-white rounded-full">
                {b2bFilters.categories.size + b2bFilters.subcategories.size + b2bFilters.productTypes.size + b2bFilters.items.size}
              </span>
            )}
          </button>
          <button
            onClick={() => setActiveTab('B2C')}
            className={`flex-1 px-4 py-3 text-sm font-medium transition-colors ${
              activeTab === 'B2C'
                ? 'bg-blue-50 text-blue-700 border-b-2 border-blue-600'
                : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
            }`}
          >
            B2C
            {b2cFilters.categories.size + b2cFilters.subcategories.size + b2cFilters.productTypes.size + b2cFilters.items.size > 0 && (
              <span className="ml-2 px-2 py-0.5 text-xs bg-blue-600 text-white rounded-full">
                {b2cFilters.categories.size + b2cFilters.subcategories.size + b2cFilters.productTypes.size + b2cFilters.items.size}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* Filter Content */}
      <div className="p-4">
        {/* Header with Clear All */}
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold text-gray-900">
            Market Analysis Filters - {activeTab}
          </h3>
          {getSelectedCount() > 0 && (
            <button
              onClick={clearAllFilters}
              className="text-xs text-blue-600 hover:text-blue-800 flex items-center gap-1"
            >
              <X className="h-3 w-3" />
              Clear All
            </button>
          )}
        </div>

        {/* Hierarchical Filters */}
        <div className="space-y-2 max-h-[600px] overflow-y-auto">
          {currentData && Object.keys(currentData).map(category => {
            const categoryData = currentData[category] as SegmentationStructure
            const isCategoryExpanded = expandedCategories.has(category)
            const isCatSelected = isCategorySelected(category)
            const isCatPartial = isCategoryPartiallySelected(category)

            return (
              <div key={category} className="border border-gray-200 rounded-md">
                {/* Category Level */}
                <div className="flex items-center p-2 bg-gray-50 hover:bg-gray-100">
                  <button
                    onClick={() => toggleCategory(category)}
                    className="mr-2 text-gray-500 hover:text-gray-700"
                  >
                    {isCategoryExpanded ? (
                      <ChevronDown className="h-4 w-4" />
                    ) : (
                      <ChevronRight className="h-4 w-4" />
                    )}
                  </button>
                  <button
                    onClick={() => toggleCategorySelection(category)}
                    className="flex-1 flex items-center gap-2 text-left"
                  >
                    <div className={`w-4 h-4 border-2 rounded flex items-center justify-center ${
                      isCatSelected 
                        ? 'bg-blue-600 border-blue-600' 
                        : isCatPartial
                        ? 'bg-blue-200 border-blue-600'
                        : 'border-gray-300'
                    }`}>
                      {isCatSelected && <Check className="h-3 w-3 text-white" />}
                    </div>
                    <span className="text-sm font-medium text-gray-900">{category}</span>
                  </button>
                </div>

                {/* Subcategory Level - Recursive rendering for variable depth */}
                {isCategoryExpanded && categoryData && Object.keys(categoryData).map(subcategory => {
                  const subcatData = categoryData[subcategory] as SegmentationStructure
                  const subcatKey = `${category}::${subcategory}`
                  const isSubcatExpanded = expandedSubcategories.has(subcatKey)
                  const isSubcatSelected = isSubcategorySelected(category, subcategory)
                  const isSubcatPartial = isSubcategoryPartiallySelected(category, subcategory)

                  // Check if subcategory has nested subcategories or product types directly
                  const hasNestedSubcategories = subcatData && Object.keys(subcatData).some(key => {
                    const value = subcatData[key]
                    return !Array.isArray(value) && typeof value === 'object'
                  })

                  return (
                    <div key={subcatKey} className="border-t border-gray-200 bg-white">
                      <div className="flex items-center p-2 pl-8 hover:bg-gray-50">
                        <button
                          onClick={() => toggleSubcategory(subcatKey)}
                          className="mr-2 text-gray-500 hover:text-gray-700"
                        >
                          {isSubcatExpanded ? (
                            <ChevronDown className="h-4 w-4" />
                          ) : (
                            <ChevronRight className="h-4 w-4" />
                          )}
                        </button>
                        <button
                          onClick={() => toggleSubcategorySelection(category, subcategory)}
                          className="flex-1 flex items-center gap-2 text-left"
                        >
                          <div className={`w-4 h-4 border-2 rounded flex items-center justify-center ${
                            isSubcatSelected 
                              ? 'bg-blue-600 border-blue-600' 
                              : isSubcatPartial
                              ? 'bg-blue-200 border-blue-600'
                              : 'border-gray-300'
                          }`}>
                            {isSubcatSelected && <Check className="h-3 w-3 text-white" />}
                          </div>
                          <span className="text-sm text-gray-800">{subcategory}</span>
                        </button>
                      </div>

                      {/* Render nested subcategories if they exist (like "Food & Beverage Processing" -> "Packaged Foods") */}
                      {isSubcatExpanded && subcatData && hasNestedSubcategories && Object.keys(subcatData).map(nestedSubcategory => {
                        const nestedSubcatData = subcatData[nestedSubcategory] as SegmentationStructure
                        const nestedSubcatKey = `${subcatKey}::${nestedSubcategory}`
                        const isNestedSubcatExpanded = expandedSubcategories.has(nestedSubcatKey)
                        const isNestedSubcatSelected = isSubcategorySelected(category, `${subcategory}::${nestedSubcategory}`)
                        const isNestedSubcatPartial = isSubcategoryPartiallySelected(category, `${subcategory}::${nestedSubcategory}`)

                        return (
                          <div key={nestedSubcatKey} className="border-t border-gray-100 bg-gray-50">
                            <div className="flex items-center p-2 pl-16 hover:bg-gray-100">
                              <button
                                onClick={() => toggleSubcategory(nestedSubcatKey)}
                                className="mr-2 text-gray-500 hover:text-gray-700"
                              >
                                {isNestedSubcatExpanded ? (
                                  <ChevronDown className="h-4 w-4" />
                                ) : (
                                  <ChevronRight className="h-4 w-4" />
                                )}
                              </button>
                              <button
                                onClick={() => toggleSubcategorySelection(category, `${subcategory}::${nestedSubcategory}`)}
                                className="flex-1 flex items-center gap-2 text-left"
                              >
                                <div className={`w-4 h-4 border-2 rounded flex items-center justify-center ${
                                  isNestedSubcatSelected 
                                    ? 'bg-blue-600 border-blue-600' 
                                    : isNestedSubcatPartial
                                    ? 'bg-blue-200 border-blue-600'
                                    : 'border-gray-300'
                                }`}>
                                  {isNestedSubcatSelected && <Check className="h-3 w-3 text-white" />}
                                </div>
                                <span className="text-sm text-gray-700">{nestedSubcategory}</span>
                              </button>
                            </div>

                            {/* Product Type Level for nested subcategories */}
                            {isNestedSubcatExpanded && nestedSubcatData && Object.keys(nestedSubcatData).map(productType => {
                              const productTypeData = nestedSubcatData[productType]
                              if (!Array.isArray(productTypeData)) return null
                              
                              const items = productTypeData
                              const productTypeKey = `${nestedSubcatKey}::${productType}`
                              const isProductTypeExpanded = expandedProductTypes.has(productTypeKey)
                              const isProdTypeSelected = isProductTypeSelected(category, `${subcategory}::${nestedSubcategory}`, productType)
                              const isProdTypePartial = isProductTypePartiallySelected(category, `${subcategory}::${nestedSubcategory}`, productType)

                              return (
                                <div key={productTypeKey} className="border-t border-gray-100 bg-white">
                                  <div className="flex items-center p-2 pl-24 hover:bg-gray-50">
                                    <button
                                      onClick={() => toggleProductType(productTypeKey)}
                                      className="mr-2 text-gray-500 hover:text-gray-700"
                                    >
                                      {isProductTypeExpanded ? (
                                        <ChevronDown className="h-4 w-4" />
                                      ) : (
                                        <ChevronRight className="h-4 w-4" />
                                      )}
                                    </button>
                                    <button
                                      onClick={() => toggleProductTypeSelection(category, `${subcategory}::${nestedSubcategory}`, productType)}
                                      className="flex-1 flex items-center gap-2 text-left"
                                    >
                                      <div className={`w-4 h-4 border-2 rounded flex items-center justify-center ${
                                        isProdTypeSelected 
                                          ? 'bg-blue-600 border-blue-600' 
                                          : isProdTypePartial
                                          ? 'bg-blue-200 border-blue-600'
                                          : 'border-gray-300'
                                      }`}>
                                        {isProdTypeSelected && <Check className="h-3 w-3 text-white" />}
                                      </div>
                                      <span className="text-sm text-gray-600">{productType}</span>
                                      <span className="text-xs text-gray-500">({items.length})</span>
                                    </button>
                                  </div>

                                  {/* Items Level */}
                                  {isProductTypeExpanded && items && items.length > 0 && (
                                    <div className="border-t border-gray-100 bg-gray-50">
                                      {items.map(item => {
                                        const isItemSel = isItemSelected(category, `${subcategory}::${nestedSubcategory}`, productType, item)
                                        return (
                                          <div key={item} className="flex items-center p-2 pl-32 hover:bg-gray-100">
                                            <button
                                              onClick={() => toggleItemSelection(category, `${subcategory}::${nestedSubcategory}`, productType, item)}
                                              className="flex-1 flex items-center gap-2 text-left"
                                            >
                                              <div className={`w-4 h-4 border-2 rounded flex items-center justify-center ${
                                                isItemSel 
                                                  ? 'bg-blue-600 border-blue-600' 
                                                  : 'border-gray-300'
                                              }`}>
                                                {isItemSel && <Check className="h-3 w-3 text-white" />}
                                              </div>
                                              <span className="text-sm text-gray-600">{item}</span>
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
                        )
                      })}

                      {/* Product Type Level - Direct product types (when no nested subcategories) */}
                      {isSubcatExpanded && subcatData && !hasNestedSubcategories && Object.keys(subcatData).map(productType => {
                        const productTypeData = subcatData[productType]
                        // Check if it's an array (items) or another nested object
                        const items = Array.isArray(productTypeData) ? productTypeData : []
                        const productTypeKey = `${subcatKey}::${productType}`
                        const isProductTypeExpanded = expandedProductTypes.has(productTypeKey)
                        const isProdTypeSelected = isProductTypeSelected(category, subcategory, productType)
                        const isProdTypePartial = isProductTypePartiallySelected(category, subcategory, productType)

                        // Skip if not an array (shouldn't happen based on structure, but safety check)
                        if (!Array.isArray(productTypeData)) {
                          return null
                        }

                        return (
                          <div key={productTypeKey} className="border-t border-gray-100 bg-gray-50">
                            <div className="flex items-center p-2 pl-16 hover:bg-gray-100">
                              <button
                                onClick={() => toggleProductType(productTypeKey)}
                                className="mr-2 text-gray-500 hover:text-gray-700"
                              >
                                {isProductTypeExpanded ? (
                                  <ChevronDown className="h-4 w-4" />
                                ) : (
                                  <ChevronRight className="h-4 w-4" />
                                )}
                              </button>
                              <button
                                onClick={() => toggleProductTypeSelection(category, subcategory, productType)}
                                className="flex-1 flex items-center gap-2 text-left"
                              >
                                <div className={`w-4 h-4 border-2 rounded flex items-center justify-center ${
                                  isProdTypeSelected 
                                    ? 'bg-blue-600 border-blue-600' 
                                    : isProdTypePartial
                                    ? 'bg-blue-200 border-blue-600'
                                    : 'border-gray-300'
                                }`}>
                                  {isProdTypeSelected && <Check className="h-3 w-3 text-white" />}
                                </div>
                                <span className="text-sm text-gray-700">{productType}</span>
                                <span className="text-xs text-gray-500">({items.length})</span>
                              </button>
                            </div>

                            {/* Items Level */}
                            {isProductTypeExpanded && items && items.length > 0 && (
                              <div className="border-t border-gray-100 bg-white">
                                {items.map(item => {
                                  const isItemSel = isItemSelected(category, subcategory, productType, item)
                                  return (
                                    <div key={item} className="flex items-center p-2 pl-24 hover:bg-gray-50">
                                      <button
                                        onClick={() => toggleItemSelection(category, subcategory, productType, item)}
                                        className="flex-1 flex items-center gap-2 text-left"
                                      >
                                        <div className={`w-4 h-4 border-2 rounded flex items-center justify-center ${
                                          isItemSel 
                                            ? 'bg-blue-600 border-blue-600' 
                                            : 'border-gray-300'
                                        }`}>
                                          {isItemSel && <Check className="h-3 w-3 text-white" />}
                                        </div>
                                        <span className="text-sm text-gray-600">{item}</span>
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
                  )
                })}
              </div>
            )
          })}
        </div>

        {/* Summary */}
        {getSelectedCount() > 0 && (
          <div className="mt-4 p-3 bg-blue-50 rounded-md border border-blue-200">
            <div className="text-xs font-medium text-blue-900 mb-1">
              Selected Filters ({getSelectedCount()})
            </div>
            <div className="text-xs text-blue-700 space-y-1">
              {currentFilters.categories.size > 0 && (
                <div>Categories: {currentFilters.categories.size}</div>
              )}
              {currentFilters.subcategories.size > 0 && (
                <div>Subcategories: {currentFilters.subcategories.size}</div>
              )}
              {currentFilters.productTypes.size > 0 && (
                <div>Product Types: {currentFilters.productTypes.size}</div>
              )}
              {currentFilters.items.size > 0 && (
                <div>Items: {currentFilters.items.size}</div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

