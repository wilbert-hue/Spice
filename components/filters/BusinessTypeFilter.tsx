'use client'

import { useDashboardStore } from '@/lib/store'

export function BusinessTypeFilter() {
  const { filters, updateFilters } = useDashboardStore()

  const handleBusinessTypeChange = (businessType: 'B2B' | 'B2C') => {
    // When business type changes, clear segments to avoid confusion
    updateFilters({ 
      businessType,
      segments: [], // Clear segments when business type changes
      advancedSegments: [] // Also clear advanced segments
    } as any)
  }

  return (
    <div>
      <label className="block text-sm font-medium text-black mb-2">
        Business Type
      </label>
      <div className="grid grid-cols-2 gap-2">
        <button
          onClick={() => handleBusinessTypeChange('B2B')}
          className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
            filters.businessType === 'B2B'
              ? 'bg-blue-600 text-white'
              : 'bg-gray-100 text-black hover:bg-gray-200'
          }`}
        >
          B2B
        </button>
        <button
          onClick={() => handleBusinessTypeChange('B2C')}
          className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
            filters.businessType === 'B2C'
              ? 'bg-blue-600 text-white'
              : 'bg-gray-100 text-black hover:bg-gray-200'
          }`}
        >
          B2C
        </button>
      </div>
      <p className="mt-1 text-xs text-black">
        {filters.businessType === 'B2B' && 'Show B2B segments'}
        {filters.businessType === 'B2C' && 'Show B2C segments'}
      </p>
    </div>
  )
}

