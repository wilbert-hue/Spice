'use client'

import { useEffect, useState, useRef } from 'react'
import { useDashboardStore } from '@/lib/store'
import { createMockData } from '@/lib/mock-data'
import { FilterPanel } from '@/components/filters/FilterPanel'
import { EnhancedFilterPanel } from '@/components/filters/EnhancedFilterPanel'
import { GroupedBarChart } from '@/components/charts/GroupedBarChart'
import { MultiLineChart } from '@/components/charts/MultiLineChart'
import { MatrixHeatmap } from '@/components/charts/MatrixHeatmap'
import { ComparisonTable } from '@/components/charts/ComparisonTable'
import { WaterfallChart } from '@/components/charts/WaterfallChart'
import { D3BubbleChartIndependent } from '@/components/charts/D3BubbleChartIndependent'
import { CompetitiveIntelligence } from '@/components/charts/CompetitiveIntelligence'
import DistributorsIntelligence from '@/components/charts/DistributorsIntelligenceTable'
import { InsightsPanel } from '@/components/InsightsPanel'
import { FilterPresets } from '@/components/filters/FilterPresets'
import { ChartGroupSelector } from '@/components/filters/ChartGroupSelector'
import { CustomScrollbar } from '@/components/ui/CustomScrollbar'
import { GlobalKPICards } from '@/components/GlobalKPICards'
import { getChartsForGroup } from '@/lib/chart-groups'
import { Lightbulb, X, Layers, LayoutGrid } from 'lucide-react'

export default function DashboardPage() {
  const { setData, setLoading, setError, data, isLoading, error, filters, selectedChartGroup } = useDashboardStore()
  const [mounted, setMounted] = useState(false)
  const [activeTab, setActiveTab] = useState<'bar' | 'line' | 'heatmap' | 'table' | 'waterfall' | 'bubble' | 'competitive-intelligence' | 'distributor-intelligence'>('bar')
  const [showInsights, setShowInsights] = useState(false)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [viewMode, setViewMode] = useState<'tabs' | 'vertical'>('tabs')
  const sidebarScrollRef = useRef<HTMLDivElement>(null)

  // Get visible charts based on selected chart group
  const visibleCharts = getChartsForGroup(selectedChartGroup)
  
  // Helper function to check if a chart should be visible
  const isChartVisible = (chartId: string): boolean => {
    return visibleCharts.includes(chartId)
  }

  // Map chart IDs to tab values
  const chartIdToTab: Record<string, typeof activeTab> = {
    'grouped-bar': 'bar',
    'multi-line': 'line',
    'heatmap': 'heatmap',
    'comparison-table': 'table',
    'waterfall': 'waterfall',
    'bubble': 'bubble',
    'competitive-intelligence': 'competitive-intelligence',
    'distributor-intelligence': 'distributor-intelligence'
  }

  // Auto-switch to first available tab when chart group changes
  useEffect(() => {
    const firstVisibleChart = visibleCharts[0]
    if (firstVisibleChart && chartIdToTab[firstVisibleChart]) {
      setActiveTab(chartIdToTab[firstVisibleChart])
    }
  }, [selectedChartGroup])

  // Auto-switch to heatmap when matrix mode is selected
  useEffect(() => {
    if (filters.viewMode === 'matrix' && isChartVisible('heatmap')) {
      setActiveTab('heatmap')
    }
  }, [filters.viewMode])

  useEffect(() => {
    setMounted(true)
    
    // Load mock data instead of fetching from API
    async function loadData() {
      try {
        console.log('🔍 Starting data loading...')
        setLoading(true)
        
        // Create realistic mock data structure
        console.log('🔄 Generating mock data...')
        const mockData = await createMockData()

        console.log('✅ Data generation complete. Sample data:', {
          hasData: !!mockData,
          valueRecords: mockData?.data?.value?.geography_segment_matrix?.length || 0,
          volumeRecords: mockData?.data?.volume?.geography_segment_matrix?.length || 0,
          metadata: mockData?.metadata,
          firstValueRecord: mockData?.data?.value?.geography_segment_matrix?.[0],
          firstVolumeRecord: mockData?.data?.volume?.geography_segment_matrix?.[0]
        })

        if (!mockData?.data?.value?.geography_segment_matrix?.length) {
          console.warn('⚠️ No value data records found in mock data')
        }
        if (!mockData?.data?.volume?.geography_segment_matrix?.length) {
          console.warn('⚠️ No volume data records found in mock data')
        }

        // Simulate a small delay for better UX
        await new Promise(resolve => setTimeout(resolve, 500))

        console.log('🔄 Setting data in store...')
        setData(mockData)
        console.log('✅ Data set in store successfully')
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred'
        console.error('❌ Error loading data:', errorMessage, err)
        setError(`Failed to load data: ${errorMessage}`)
      } finally {
        console.log('🏁 Finished data loading attempt')
        setLoading(false)
      }
    }
    
    loadData()
  }, [setData, setLoading, setError])

  if (!mounted) {
    return null
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-lg text-black">Loading dashboard...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="text-center max-w-md">
          <div className="text-red-600 text-2xl font-semibold mb-3">⚠️ Error</div>
          <p className="text-black mb-4">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
          >
            Reload Page
          </button>
        </div>
      </div>
    )
  }

  if (!data) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <p className="text-black">No data available</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 relative">
      {/* Demo Data Banner - Top of Page */}
      <div className="bg-yellow-50 border-b border-yellow-200 px-6 py-3 flex items-center gap-3 relative z-50">
        <svg 
          className="w-5 h-5 text-orange-700 flex-shrink-0" 
          fill="none" 
          stroke="currentColor" 
          viewBox="0 0 24 24"
        >
          <path 
            strokeLinecap="round" 
            strokeLinejoin="round" 
            strokeWidth={2} 
            d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" 
          />
        </svg>
        <span className="text-sm font-semibold text-orange-700">
          Demo Data: Synthetic data for illustration only.
        </span>
      </div>

      {/* Diagonal Watermark */}
      <div className="fixed inset-0 pointer-events-none z-40 flex items-center justify-center overflow-hidden">
        <div
          className="text-yellow-200/25 font-bold select-none"
          style={{
            fontSize: '7rem',
            transform: 'rotate(-45deg)',
            whiteSpace: 'nowrap',
            letterSpacing: '0.3rem'
          }}
        >
          DEMO DASHBOARD
        </div>
      </div>

      {/* Header */}
      <div className="bg-white border-b shadow-sm relative z-10">
        <div className="container mx-auto px-6 py-6">
          <div className="flex items-center gap-6">
            {/* Logo on the left */}
            <div className="flex-shrink-0">
              <img src="/jsons/logo.png" alt="Logo" className="h-12 w-auto" />
            </div>
            
            {/* Title and subtitle centered */}
            <div className="flex-1 flex flex-col items-center text-center">
              <h1 className="text-4xl font-bold text-gray-900 mb-2">
                Coherent Dashboard
              </h1>
              <h2 className="text-xl text-black">
                India Spices Market Analysis & Forecast: 2020-2032
              </h2>
            </div>
            
            {/* Empty space on the right for balance */}
            <div className="flex-shrink-0 w-12"></div>
          </div>
        </div>
      </div>

      {/* Global KPI Cards */}
      <GlobalKPICards />

      {/* Main Content */}
      <div className="container mx-auto px-6 py-6">
        <div className="grid grid-cols-12 gap-6">
          {/* Sidebar - Enhanced Filter Panel */}
          <aside className={`transition-all duration-300 ${
            sidebarCollapsed 
              ? 'col-span-12 lg:col-span-1' 
              : 'col-span-12 lg:col-span-3'
          }`}>
            {sidebarCollapsed ? (
              <div className="sticky top-6">
                <div className="bg-white rounded-lg shadow-sm p-2 space-y-4">
                  <button
                    onClick={() => {
                      setShowInsights(false)
                      setSidebarCollapsed(false)
                    }}
                    className="w-full flex flex-col items-center gap-1 py-2 hover:bg-gray-50 rounded"
                    title="Expand Filters"
                  >
                    <svg className="w-5 h-5 text-black" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 5l7 7-7 7M5 5l7 7-7 7" />
                    </svg>
                    <span className="text-xs text-black">Filters</span>
                  </button>
                </div>
              </div>
            ) : (
              <div className="sticky top-6 self-start">
                <div className="max-h-[calc(100vh-6rem)] relative">
                  <CustomScrollbar containerRef={sidebarScrollRef}>
                    <div ref={sidebarScrollRef} className="overflow-y-auto pr-6 space-y-3 sidebar-scroll max-h-[calc(100vh-6rem)]">
                      <ChartGroupSelector />
                      <FilterPresets />
                      <EnhancedFilterPanel />
                    </div>
                  </CustomScrollbar>
                </div>
              </div>
            )}
          </aside>

          {/* Main Content Area */}
          <main className={`transition-all duration-300 ${
            sidebarCollapsed 
              ? showInsights 
                ? 'col-span-12 lg:col-span-8'
                : 'col-span-12 lg:col-span-11'
              : showInsights
                ? 'col-span-12 lg:col-span-6'
                : 'col-span-12 lg:col-span-9'
          } space-y-6`}>

            {/* Tab Navigation */}
            <div className="bg-white rounded-lg shadow">
              <div className="border-b border-gray-200">
                <div className="flex justify-between items-center">
                  <nav className="flex items-center -mb-px">
                    {/* View Mode Toggle */}
                    <div className="flex gap-1 mr-4 ml-4 py-2">
                      <button
                        onClick={() => setViewMode('tabs')}
                        className={`p-1.5 rounded ${
                          viewMode === 'tabs' 
                            ? 'bg-blue-100 text-blue-600' 
                            : 'text-black hover:text-black'
                        }`}
                        title="Tab View"
                      >
                        <Layers className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => setViewMode('vertical')}
                        className={`p-1.5 rounded ${
                          viewMode === 'vertical' 
                            ? 'bg-blue-100 text-blue-600' 
                            : 'text-black hover:text-black'
                        }`}
                        title="Vertical View (All Charts)"
                      >
                        <LayoutGrid className="h-4 w-4" />
                      </button>
                    </div>
                    
                    {/* Tab Buttons - Only show in tabs mode */}
                    {viewMode === 'tabs' && (
                      <>
                        {isChartVisible('grouped-bar') && (
                          <button
                            onClick={() => setActiveTab('bar')}
                            className={`px-6 py-3 text-sm font-medium border-b-2 transition-colors ${
                              activeTab === 'bar'
                                ? 'border-blue-500 text-blue-600'
                                : 'border-transparent text-black hover:text-black hover:border-gray-300'
                            }`}
                          >
                            📊 Grouped Bar Chart
                          </button>
                        )}
                        {isChartVisible('multi-line') && (
                          <button
                            onClick={() => setActiveTab('line')}
                            className={`px-6 py-3 text-sm font-medium border-b-2 transition-colors ${
                              activeTab === 'line'
                                ? 'border-blue-500 text-blue-600'
                                : 'border-transparent text-black hover:text-black hover:border-gray-300'
                            }`}
                          >
                            📈 Line Chart
                          </button>
                        )}
                        {isChartVisible('heatmap') && (
                          <button
                            onClick={() => setActiveTab('heatmap')}
                            className={`px-6 py-3 text-sm font-medium border-b-2 transition-colors ${
                              activeTab === 'heatmap'
                                ? 'border-blue-500 text-blue-600'
                                : 'border-transparent text-black hover:text-black hover:border-gray-300'
                            }`}
                          >
                            🔥 Heatmap
                          </button>
                        )}
                        {isChartVisible('comparison-table') && (
                          <button
                            onClick={() => setActiveTab('table')}
                            className={`px-6 py-3 text-sm font-medium border-b-2 transition-colors ${
                              activeTab === 'table'
                                ? 'border-blue-500 text-blue-600'
                                : 'border-transparent text-black hover:text-black hover:border-gray-300'
                            }`}
                          >
                            📋 Table
                          </button>
                        )}
                        {isChartVisible('waterfall') && (
                          <button
                            onClick={() => setActiveTab('waterfall')}
                            className={`px-6 py-3 text-sm font-medium border-b-2 transition-colors ${
                              activeTab === 'waterfall'
                                ? 'border-blue-500 text-blue-600'
                                : 'border-transparent text-black hover:text-black hover:border-gray-300'
                            }`}
                          >
                            💧 Waterfall
                          </button>
                        )}
                        {isChartVisible('bubble') && (
                          <button
                            onClick={() => setActiveTab('bubble')}
                            className={`px-6 py-3 text-sm font-medium border-b-2 transition-colors ${
                              activeTab === 'bubble'
                                ? 'border-blue-500 text-blue-600'
                                : 'border-transparent text-black hover:text-black hover:border-gray-300'
                            }`}
                          >
                            🫧 Bubble Chart
                          </button>
                        )}
                        {isChartVisible('competitive-intelligence') && (
                          <button
                            onClick={() => setActiveTab('competitive-intelligence')}
                            className={`px-6 py-3 text-sm font-medium border-b-2 transition-colors ${
                              activeTab === 'competitive-intelligence'
                                ? 'border-blue-500 text-blue-600'
                                : 'border-transparent text-black hover:text-black hover:border-gray-300'
                            }`}
                          >
                            🏆 Competitive Intelligence
                          </button>
                        )}
                        {isChartVisible('distributor-intelligence') && (
                          <button
                            onClick={() => setActiveTab('distributor-intelligence')}
                            className={`px-6 py-3 text-sm font-medium border-b-2 transition-colors ${
                              activeTab === 'distributor-intelligence'
                                ? 'border-blue-500 text-blue-600'
                                : 'border-transparent text-black hover:text-black hover:border-gray-300'
                            }`}
                          >
                            📦 Distributor Intelligence
                          </button>
                        )}
                      </>
                    )}
                  </nav>
                
                  {/* Insights Button */}
                  <div className="flex gap-2 px-4">
                    <button
                      onClick={() => {
                        setShowInsights(!showInsights)
                        setSidebarCollapsed(!showInsights)
                      }}
                      className={`flex items-center gap-1 px-3 py-1 text-sm rounded transition-colors ${
                        showInsights 
                          ? 'bg-yellow-100 text-yellow-700 hover:bg-yellow-200' 
                          : 'text-black hover:text-black hover:bg-gray-100'
                      }`}
                    >
                      <Lightbulb className="h-4 w-4" />
                      Insights
                    </button>
                  </div>
                </div>
              </div>

              {/* Chart Content */}
              <div className="p-6">
                {viewMode === 'tabs' ? (
                  <>
                    {activeTab === 'bar' && (
                      <div id="grouped-bar-chart">
                        <GroupedBarChart 
                          title="Comparative Analysis - Grouped Bars" 
                          height={450}
                        />
                      </div>
                    )}
                    
                    {activeTab === 'line' && (
                      <div id="line-chart">
                        <MultiLineChart 
                          title="Trend Analysis - Multiple Series" 
                          height={450}
                        />
                      </div>
                    )}
                    
                    {activeTab === 'heatmap' && (
                      <div id="heatmap-chart">
                        <MatrixHeatmap 
                          title="Matrix View - Geography × Segment" 
                          height={450}
                        />
                      </div>
                    )}
                    
                    {activeTab === 'table' && (
                      <div id="comparison-table">
                        <ComparisonTable 
                          title="Data Comparison Table" 
                          height={500}
                        />
                      </div>
                    )}
                    
                    {activeTab === 'waterfall' && (
                      <div id="waterfall-chart">
                        <WaterfallChart 
                          title="Contribution Analysis - Waterfall Chart" 
                          height={450}
                        />
                      </div>
                    )}
                    
                    {activeTab === 'bubble' && (
                      <div id="bubble-chart">
                        <D3BubbleChartIndependent 
                          title="Coherent Opportunity Matrix" 
                          height={500}
                        />
                      </div>
                    )}
                    
                    {activeTab === 'competitive-intelligence' && (
                      <div id="competitive-intelligence-chart">
                        <CompetitiveIntelligence 
                          height={600}
                        />
                      </div>
                    )}
                    
                    {activeTab === 'distributor-intelligence' && (
                      <div id="distributor-intelligence-chart">
                        <DistributorsIntelligence 
                          title="Distributors Intelligence Database" 
                          height={600}
                        />
                      </div>
                    )}
                  </>
                ) : (
                  <div className="space-y-8">
                    {isChartVisible('grouped-bar') && (
                      <div className="border-b pb-8">
                        <h3 className="text-lg font-semibold text-gray-900 mb-4">📊 Grouped Bar Chart</h3>
                        <GroupedBarChart 
                          title="Comparative Analysis - Grouped Bars" 
                          height={400}
                        />
                      </div>
                    )}
                    
                    {isChartVisible('multi-line') && (
                      <div className="border-b pb-8">
                        <h3 className="text-lg font-semibold text-gray-900 mb-4">📈 Line Chart</h3>
                        <MultiLineChart 
                          title="Trend Analysis - Multiple Series" 
                          height={400}
                        />
                      </div>
                    )}
                    
                    {isChartVisible('heatmap') && (
                      <div className="border-b pb-8">
                        <h3 className="text-lg font-semibold text-gray-900 mb-4">🔥 Heatmap</h3>
                        <MatrixHeatmap 
                          title="Matrix View - Geography × Segment" 
                          height={400}
                        />
                      </div>
                    )}
                    
                    {isChartVisible('comparison-table') && (
                      <div className="border-b pb-8">
                        <h3 className="text-lg font-semibold text-gray-900 mb-4">📋 Data Table</h3>
                        <ComparisonTable 
                          title="Data Comparison Table" 
                          height={400}
                        />
                      </div>
                    )}
                    
                    {isChartVisible('waterfall') && (
                      <div className="border-b pb-8">
                        <h3 className="text-lg font-semibold text-gray-900 mb-4">💧 Waterfall Chart</h3>
                        <WaterfallChart 
                          title="Contribution Analysis - Waterfall Chart" 
                          height={400}
                        />
                      </div>
                    )}
                    
                    {isChartVisible('bubble') && (
                      <div className="border-b pb-8">
                        <h3 className="text-lg font-semibold text-gray-900 mb-4">🫧 Bubble Chart</h3>
                        <D3BubbleChartIndependent 
                          title="Coherent Opportunity Matrix" 
                          height={450}
                        />
                      </div>
                    )}
                    
                    {isChartVisible('competitive-intelligence') && (
                      <div className="border-b pb-8">
                        <CompetitiveIntelligence 
                          height={600}
                        />
                      </div>
                    )}
                    
                    {isChartVisible('distributor-intelligence') && (
                      <div className="border-b pb-8">
                        <h3 className="text-lg font-semibold text-gray-900 mb-4">📦 Distributor Intelligence</h3>
                        <DistributorsIntelligence 
                          title="Distributors Intelligence Database" 
                          height={600}
                        />
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </main>

          {/* Insights Panel */}
          {showInsights && (
            <aside className="col-span-12 lg:col-span-3 transition-all duration-300">
              <div className="sticky top-6">
                <div className="bg-white rounded-lg shadow-sm">
                  <div className="bg-yellow-50 px-4 py-3 border-b border-yellow-200 rounded-t-lg">
                    <div className="flex items-center justify-between">
                      <h2 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
                        <Lightbulb className="h-4 w-4 text-yellow-500" />
                        Key Insights
                      </h2>
                      <button
                        onClick={() => {
                          setShowInsights(false)
                          setSidebarCollapsed(false)
                        }}
                        className="rounded-md text-black hover:text-black focus:outline-none"
                      >
                        <X className="h-5 w-5" />
                      </button>
                    </div>
                    <p className="text-xs text-black mt-1">
                      Auto-generated analysis
                    </p>
                  </div>
                  
                  <div 
                    className="px-4 py-3 overflow-y-auto sidebar-scroll" 
                    style={{ 
                      maxHeight: 'calc(100vh - 8rem)',
                      overflowY: 'auto',
                      minHeight: 'auto'
                    }}
                    id="insights-panel"
                  >
                    <InsightsPanel />
                  </div>
                </div>
              </div>
            </aside>
          )}
        </div>
      </div>

      {/* Footer Note */}
      <footer className="mt-12 pt-6 border-t border-gray-200 bg-gray-50">
        <div className="container mx-auto px-6">
          <div className="bg-gray-800 text-white rounded-lg p-6">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
              {/* Contact Information */}
              <div>
                <h4 className="text-sm font-semibold mb-3">Contact Us</h4>
                <div className="text-xs space-y-1 text-gray-300">
                  <div>United States: +1-252-477-1362</div>
                  <div>United Kingdom: +44-203-957-8553 / +44-203-949-5508</div>
                  <div>Australia: +61-8-7924-7805</div>
                  <div>India: +91-848-285-0837</div>
                </div>
              </div>

              {/* Business Enquiry */}
              <div>
                <h4 className="text-sm font-semibold mb-3">For Business Enquiry</h4>
                <div className="text-xs text-gray-300 space-y-2">
                  <div>sales@coherentmarketinsights.com</div>
                  <div className="mt-3">
                    <div className="font-medium mb-1">Sales Office (U.S.):</div>
                    <div>Coherent Market Insights Pvt Ltd,</div>
                    <div>533 Airport Boulevard, Suite 400,</div>
                    <div>Burlingame, CA 94010, United States</div>
                  </div>
                  <div className="mt-3">
                    <div className="font-medium mb-1">Asia Pacific Intelligence Center (India):</div>
                    <div>Coherent Market Insights Pvt Ltd,</div>
                    <div>401-402, Bremen Business Center,</div>
                    <div>University Road, Aundh,</div>
                    <div>Pune - 411007, India.</div>
                  </div>
                </div>
              </div>

              {/* Menu Links */}
              <div>
                <h4 className="text-sm font-semibold mb-3">Menu</h4>
                <div className="text-xs text-gray-300 space-y-1">
                  <div>About Us</div>
                  <div>Industries</div>
                  <div>Services</div>
                  <div>Contact Us</div>
                  <div>Careers</div>
                </div>
                <h4 className="text-sm font-semibold mb-3 mt-4">Reader Club</h4>
                <div className="text-xs text-gray-300 space-y-1">
                  <div>Latest Insights</div>
                  <div>Press Release</div>
                  <div>Infographics</div>
                  <div>Blogs</div>
                  <div>News</div>
                </div>
                <h4 className="text-sm font-semibold mb-3 mt-4">Help</h4>
                <div className="text-xs text-gray-300 space-y-1">
                  <div>Become Reseller</div>
                  <div>How To Order?</div>
                  <div>Terms and Conditions</div>
                  <div>Privacy Policy</div>
                  <div>Disclaimer</div>
                  <div>Sitemap</div>
                  <div>Feeds</div>
                </div>
              </div>

              {/* Social Media & Payment */}
              <div>
                <h4 className="text-sm font-semibold mb-3">Connect With Us</h4>
                <div className="flex gap-2 mb-6">
                  <div className="w-8 h-8 bg-gray-700 rounded flex items-center justify-center text-xs font-semibold">in</div>
                  <div className="w-8 h-8 bg-gray-700 rounded flex items-center justify-center text-xs font-semibold">X</div>
                  <div className="w-8 h-8 bg-gray-700 rounded flex items-center justify-center text-xs font-semibold">f</div>
                  <div className="w-8 h-8 bg-gray-700 rounded flex items-center justify-center text-xs font-semibold">P</div>
                </div>
                <h4 className="text-sm font-semibold mb-3">Secure Payment By</h4>
                <div className="flex flex-wrap gap-2">
                  <div className="px-3 py-1.5 bg-white text-gray-800 rounded text-xs font-semibold">VISA</div>
                  <div className="px-3 py-1.5 bg-white text-gray-800 rounded text-xs font-semibold">DISCOVER</div>
                  <div className="px-3 py-1.5 bg-white text-gray-800 rounded text-xs font-semibold">MasterCard</div>
                  <div className="px-3 py-1.5 bg-white text-gray-800 rounded text-xs font-semibold">AMEX</div>
                </div>
              </div>
            </div>

            {/* Copyright */}
            <div className="pt-4 border-t border-gray-700 text-center text-xs text-gray-400">
              © 2025 Coherent Market Insights Pvt Ltd. All Rights Reserved.
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}

