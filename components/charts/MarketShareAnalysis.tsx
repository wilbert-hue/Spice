'use client'

import { useEffect, useState } from 'react'
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts'
import { generateMarketShareData, MarketShareData, loadCompetitiveIntelligenceData } from '@/lib/competitive-intelligence-data'

interface MarketShareAnalysisProps {
  year?: number
}

export function MarketShareAnalysis({ year = 2024 }: MarketShareAnalysisProps) {
  const [marketShareData, setMarketShareData] = useState<MarketShareData[]>([])
  const [allCompaniesData, setAllCompaniesData] = useState<MarketShareData[]>([])
  const [activeTab, setActiveTab] = useState<'chart' | 'table'>('chart')

  useEffect(() => {
    async function loadData() {
      console.log('🔍 MarketShareAnalysis: Starting to load data...')
      try {
        const chartData = await generateMarketShareData(10) // Top 10 for chart
        console.log('🔍 MarketShareAnalysis: Chart data loaded:', chartData)
        setMarketShareData(chartData)

        // Load all companies for table view
        const jsonData = await loadCompetitiveIntelligenceData()
        console.log('🔍 MarketShareAnalysis: JSON data loaded:', jsonData)
        if (jsonData && jsonData.market_share_data) {
          const sorted = [...jsonData.market_share_data].sort((a, b) => b.marketShare - a.marketShare)
          setAllCompaniesData(sorted)
          console.log('✅ MarketShareAnalysis: All companies data set successfully')
        } else {
          console.error('❌ MarketShareAnalysis: No market_share_data in JSON')
        }
      } catch (error) {
        console.error('❌ MarketShareAnalysis: Error loading data:', error)
      }
    }
    loadData()
  }, [])

  // No labels on chart - percentages only in tooltip
  const renderCustomLabel = () => null

  // Custom tooltip
  const CustomTooltip = ({ active, payload }: any) => {
    if (!active || !payload || !payload.length) return null

    const data = payload[0]
    const marketSize = 5000 // Total market size in Cr INR
    const revenue = (data.value / 100) * marketSize
    
    return (
      <div className="bg-white p-4 rounded-lg shadow-lg border border-gray-200">
        <p className="font-semibold text-gray-900 mb-2">{data.name}</p>
        <div className="space-y-1">
          <div className="flex justify-between gap-4">
            <span className="text-sm text-gray-600">Market Share:</span>
            <span className="text-sm font-semibold text-gray-900">{data.value.toFixed(2)}%</span>
          </div>
          <div className="flex justify-between gap-4">
            <span className="text-sm text-gray-600">Revenue (Cr INR):</span>
            <span className="text-sm font-semibold text-gray-900">
              {revenue.toFixed(0)}
            </span>
          </div>
        </div>
      </div>
    )
  }

  // Custom legend - show in a more compact grid format
  const renderLegend = (props: any) => {
    const { payload } = props
    return (
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-x-4 gap-y-2 mt-4 max-h-48 overflow-y-auto">
        {payload.map((entry: any, index: number) => (
          <div key={`item-${index}`} className="flex items-center gap-2">
            <div 
              className="w-3 h-3 rounded-full flex-shrink-0" 
              style={{ backgroundColor: entry.color }}
            />
            <span className="text-xs text-gray-700 truncate" title={entry.value}>
              {entry.value}
            </span>
          </div>
        ))}
      </div>
    )
  }

  return (
    <div className="bg-white rounded-lg p-6">
      {/* Tabs */}
      <div className="flex gap-2 mb-6 border-b border-gray-200">
        <button
          onClick={() => setActiveTab('chart')}
          className={`px-4 py-2 text-sm font-medium transition-colors ${
            activeTab === 'chart'
              ? 'text-blue-600 border-b-2 border-blue-600'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          Chart View
        </button>
        <button
          onClick={() => setActiveTab('table')}
          className={`px-4 py-2 text-sm font-medium transition-colors ${
            activeTab === 'table'
              ? 'text-blue-600 border-b-2 border-blue-600'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          All Companies ({allCompaniesData.length})
        </button>
      </div>

      {activeTab === 'chart' ? (
        <div className="flex flex-col lg:flex-row items-center gap-8">
          {/* Pie Chart */}
          <div className="flex-1">
            <ResponsiveContainer width="100%" height={450}>
              <PieChart>
                <Pie
                  data={marketShareData as any}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={renderCustomLabel}
                  outerRadius={150}
                  innerRadius={60}
                  fill="#8884d8"
                  dataKey="marketShare"
                  nameKey="company"
                  paddingAngle={2}
                >
                  {marketShareData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} stroke="#fff" strokeWidth={2} />
                  ))}
                </Pie>
                <Tooltip content={<CustomTooltip />} />
                <Legend content={renderLegend} />
              </PieChart>
            </ResponsiveContainer>
          </div>

        {/* Market Stats */}
        <div className="lg:w-80">
          <div className="bg-gray-50 rounded-lg p-4 space-y-4">
            <div className="space-y-3">
              {marketShareData.slice(0, 5).map((company, idx) => (
                <div key={company.company} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold text-gray-500 w-4">{idx + 1}.</span>
                    <div 
                      className="w-3 h-3 rounded-full" 
                      style={{ backgroundColor: company.color }}
                    />
                    <span className="text-sm text-gray-700">{company.company}</span>
                  </div>
                  <span className="text-sm font-semibold text-gray-900">
                    {company.marketShare.toFixed(1)}%
                  </span>
                </div>
              ))}
            </div>

            <div className="pt-3 border-t border-gray-200">
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Top 5 Total:</span>
                <span className="font-semibold text-gray-900">
                  {marketShareData.slice(0, 5).reduce((sum, c) => sum + c.marketShare, 0).toFixed(1)}%
                </span>
              </div>
              <div className="flex justify-between text-sm mt-2">
                <span className="text-gray-600">Market Size:</span>
                <span className="font-semibold text-gray-900">~5,000 Cr INR</span>
              </div>
              <div className="flex justify-between text-sm mt-1">
                <span className="text-gray-600">Companies Shown:</span>
                <span className="font-semibold text-gray-900">
                  Top {marketShareData.filter(c => c.company !== 'Others').length} + Others
                </span>
              </div>
            </div>
          </div>
        </div>
        </div>
      ) : (
        /* Table View */
        <div className="w-full">
          <div className="bg-gray-50 rounded-lg p-4 mb-4">
            <div className="flex justify-between items-center mb-2">
              <h3 className="text-sm font-semibold text-gray-700">All Companies Market Share</h3>
              <span className="text-xs text-gray-500">Total: {allCompaniesData.length} companies</span>
            </div>
          </div>
          
          <div className="overflow-x-auto max-h-[600px] overflow-y-auto">
            <table className="w-full border-collapse">
              <thead className="sticky top-0 bg-gray-100 z-10">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider border-b border-gray-200">
                    Rank
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider border-b border-gray-200">
                    Company Name
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-gray-700 uppercase tracking-wider border-b border-gray-200">
                    Market Share
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-gray-700 uppercase tracking-wider border-b border-gray-200">
                    Revenue (Cr INR)
                  </th>
                  <th className="px-4 py-3 text-center text-xs font-semibold text-gray-700 uppercase tracking-wider border-b border-gray-200 w-16">
                    Color
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {allCompaniesData.map((company, index) => {
                  const marketSize = 5000 // Total market size in Cr INR
                  const revenue = (company.marketShare / 100) * marketSize
                  
                  return (
                    <tr key={company.company} className="hover:bg-gray-50">
                      <td className="px-4 py-3 text-sm text-gray-900">
                        {index + 1}
                      </td>
                      <td className="px-4 py-3 text-sm font-medium text-gray-900">
                        {company.company}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-900 text-right">
                        {company.marketShare.toFixed(2)}%
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-900 text-right">
                        {revenue.toFixed(0)}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <div 
                          className="w-6 h-6 rounded-full mx-auto border border-gray-300"
                          style={{ backgroundColor: company.color }}
                          title={company.company}
                        />
                      </td>
                    </tr>
                  )
                })}
              </tbody>
              <tfoot className="bg-gray-50">
                <tr>
                  <td colSpan={2} className="px-4 py-3 text-sm font-semibold text-gray-900">
                    Total
                  </td>
                  <td className="px-4 py-3 text-sm font-semibold text-gray-900 text-right">
                    {allCompaniesData.reduce((sum, c) => sum + c.marketShare, 0).toFixed(2)}%
                  </td>
                  <td className="px-4 py-3 text-sm font-semibold text-gray-900 text-right">
                    {allCompaniesData.reduce((sum, c) => {
                      const marketSize = 5000
                      return sum + ((c.marketShare / 100) * marketSize)
                    }, 0).toFixed(0)}
                  </td>
                  <td></td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
