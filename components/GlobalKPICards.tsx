'use client'

import { useMemo } from 'react'
import { useDashboardStore } from '@/lib/store'
import { TrendingUp, DollarSign, Calendar, Activity } from 'lucide-react'

export function GlobalKPICards() {
  const { data } = useDashboardStore()

  const kpiData = useMemo(() => {
    if (!data) return null

    // Get all Global/India records from value data
    const globalGeo = data.dimensions.geographies.global?.[0] || 'Global'
    const globalRecords = data.data.value.geography_segment_matrix.filter(
      record => record.geography === globalGeo
    )

    if (globalRecords.length === 0) return null

    // Calculate total market size for 2024 and 2032
    let marketSize2024 = 0
    let marketSize2032 = 0

    globalRecords.forEach(record => {
      marketSize2024 += record.time_series['2024'] || 0
      marketSize2032 += record.time_series['2032'] || 0
    })

    // Calculate CAGR from 2024 to 2032
    const years = 2032 - 2024
    const cagr = marketSize2024 > 0 
      ? (Math.pow(marketSize2032 / marketSize2024, 1 / years) - 1) * 100
      : 0

    // Calculate absolute growth
    const absoluteGrowth = marketSize2032 - marketSize2024
    const growthPercentage = marketSize2024 > 0 
      ? ((marketSize2032 - marketSize2024) / marketSize2024) * 100
      : 0

    return {
      marketSize2024,
      marketSize2032,
      cagr,
      absoluteGrowth,
      growthPercentage,
      currency: data.metadata.currency,
      unit: data.metadata.value_unit
    }
  }, [data])

  if (!kpiData) return null

  return (
    <div className="bg-gradient-to-r from-gray-50 to-gray-100 border-y border-gray-200">
      <div className="container mx-auto px-6 py-3">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
          {/* Market Size 2024 */}
          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-blue-100 rounded">
              <DollarSign className="h-4 w-4 text-blue-600" />
            </div>
            <div>
              <p className="text-[10px] text-gray-500 uppercase tracking-wider font-semibold">
                Market Size 2024
              </p>
              <p className="text-base font-bold text-gray-900 leading-tight">
                {kpiData.currency} {kpiData.marketSize2024.toLocaleString('en-US', { minimumFractionDigits: 1, maximumFractionDigits: 1 })} {kpiData.unit}
              </p>
            </div>
          </div>

          {/* Market Size 2032 */}
          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-green-100 rounded">
              <Calendar className="h-4 w-4 text-green-600" />
            </div>
            <div>
              <p className="text-[10px] text-gray-500 uppercase tracking-wider font-semibold">
                Market Size 2032
              </p>
              <p className="text-base font-bold text-gray-900 leading-tight">
                {kpiData.currency} {kpiData.marketSize2032.toLocaleString('en-US', { minimumFractionDigits: 1, maximumFractionDigits: 1 })} {kpiData.unit}
              </p>
            </div>
          </div>

          {/* CAGR */}
          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-purple-100 rounded">
              <TrendingUp className="h-4 w-4 text-purple-600" />
            </div>
            <div>
              <p className="text-[10px] text-gray-500 uppercase tracking-wider font-semibold">
                CAGR (2024-2032)
              </p>
              <p className="text-base font-bold text-gray-900 leading-tight">
                {kpiData.cagr.toFixed(2)}%
              </p>
            </div>
          </div>

          {/* Absolute Growth */}
          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-orange-100 rounded">
              <Activity className="h-4 w-4 text-orange-600" />
            </div>
            <div>
              <p className="text-[10px] text-gray-500 uppercase tracking-wider font-semibold">
                Absolute Growth
              </p>
              <p className="text-base font-bold text-gray-900 leading-tight">
                +{kpiData.growthPercentage.toFixed(1)}% ({kpiData.currency} {kpiData.absoluteGrowth.toLocaleString('en-US', { minimumFractionDigits: 1, maximumFractionDigits: 1 })} {kpiData.unit})
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
