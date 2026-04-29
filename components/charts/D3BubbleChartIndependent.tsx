'use client'

import { useEffect, useRef, useMemo, useState } from 'react'
import * as d3 from 'd3'
import { useDashboardStore } from '@/lib/store'
import { getChartColor } from '@/lib/chart-theme'
import type { DataRecord } from '@/lib/types'
import { EnhancedGeographyFilter } from '@/components/filters/EnhancedGeographyFilter'
import { CascadingSegmentFilter } from '@/components/filters/CascadingSegmentFilter'

interface BubbleChartProps {
  title?: string
  height?: number
}

interface BubbleDataPoint {
  name: string
  x: number // Will be overwritten by D3 force simulation with pixel position
  y: number // Will be overwritten by D3 force simulation with pixel position
  z: number // Incremental Opportunity Index for bubble size
  radius: number // Calculated radius for visualization
  geography: string
  segment: string
  segmentType: string
  currentValue: number
  cagr: number
  marketShare: number
  absoluteGrowth: number
  color: string
  // Store original index values separately since D3 will overwrite x,y with pixel positions
  xIndex: number       // CAGR Index (0-100)
  yIndex: number       // Market Share Index (0-100)
  zIndex: number       // Incremental Opportunity Index (0-100)
}

export function D3BubbleChartIndependent({ title, height = 500 }: BubbleChartProps) {
  const { data, filters } = useDashboardStore()
  const svgRef = useRef<SVGSVGElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const [dimensions, setDimensions] = useState({ width: 800, height })
  const [tooltipData, setTooltipData] = useState<BubbleDataPoint | null>(null)
  const [tooltipPosition, setTooltipPosition] = useState({ x: 0, y: 0 })
  
  // Chart-specific filter states
  const [selectedGeography, setSelectedGeography] = useState<string>('India')
  const [selectedBusinessType, setSelectedBusinessType] = useState<string>('All')
  const [maxBubbles, setMaxBubbles] = useState<number>(30)
  const [minOpportunityIndex, setMinOpportunityIndex] = useState<number>(0)

  // Use filters from global store for segments and segment type
  const selectedSegmentType = filters.segmentType || (data?.dimensions?.segments ? Object.keys(data.dimensions.segments)[0] : 'By End-Use*Product Type')
  const selectedSegments = filters.segments || []

  // Update geography when data loads or filters change
  useEffect(() => {
    // If only one geography is selected in global filters, use it
    if (filters.geographies && filters.geographies.length === 1) {
      setSelectedGeography(filters.geographies[0])
    } else if (data?.dimensions?.geographies?.all_geographies?.includes('India')) {
      setSelectedGeography('India')
    } else if (data?.dimensions?.geographies?.global?.[0]) {
      setSelectedGeography(data.dimensions.geographies.global[0])
    }
  }, [filters.geographies, data])

  // Get available geographies for the geography filter
  const availableGeographies = useMemo(() => {
    if (!data || !data.dimensions || !data.dimensions.geographies) return []
    return data.dimensions.geographies.all_geographies || []
  }, [data])

  // Calculate chart data based on selected filters
  const chartData = useMemo(() => {
    if (!data || !selectedGeography || !selectedSegmentType) {
      return { bubbles: [], xLabel: '', yLabel: '' }
    }

    const dataset = filters.dataType === 'value'
      ? data.data.value.geography_segment_matrix
      : data.data.volume.geography_segment_matrix

    // Filter data for selected geography and business type
    let geographyFiltered = dataset.filter(record => 
      record.geography === selectedGeography
    )
    
    // Filter by business type if not "All"
    if (selectedBusinessType !== 'All') {
      geographyFiltered = geographyFiltered.filter(record => {
        const hierarchy = record.segment_hierarchy
        return hierarchy?.level_1 === selectedBusinessType
      })
    }
    
    // Filter by selected segments if any are selected
    if (selectedSegments.length > 0) {
      const normalizePath = (path: string) => {
        const parts = path.split(' > ')
        if (parts[0] === 'B2B' || parts[0] === 'B2C') {
          return parts.slice(1).join(' > ')
        }
        return path
      }
      
      geographyFiltered = geographyFiltered.filter(record => {
        return selectedSegments.some(selectedSeg => {
          // Exact match
          if (record.segment === selectedSeg) return true
          
          // Normalize and match
          const normalizedRecord = normalizePath(record.segment)
          const normalizedSelected = normalizePath(selectedSeg)
          if (normalizedRecord === normalizedSelected) return true
          if (normalizedRecord.startsWith(normalizedSelected + ' > ')) return true
          if (normalizedSelected.includes(' > ') && normalizedRecord.startsWith(normalizedSelected)) return true
          
          return false
        })
      })
    }

    if (geographyFiltered.length === 0) {
      return { bubbles: [], xLabel: '', yLabel: '' }
    }

    // Get immediate children of selected segment type
    const segmentHierarchy = data.dimensions.segments[selectedSegmentType]?.hierarchy || {}
    const immediateChildren: string[] = []
    
    // First, get all unique segments of this type from the data
    const allSegmentsOfType = new Set<string>()
    geographyFiltered
      .filter(r => r.segment_type === selectedSegmentType)
      .forEach(r => allSegmentsOfType.add(r.segment))
    
    // Build a set of all segments that are children of other segments
    const childSegments = new Set<string>()
    Object.values(segmentHierarchy).forEach(children => {
      if (Array.isArray(children)) {
        children.forEach(child => childSegments.add(child))
      }
    })
    
    // The immediate children are all segments that are NOT children of other segments
    allSegmentsOfType.forEach(segment => {
      if (!childSegments.has(segment)) {
        immediateChildren.push(segment)
      }
    })

    // Calculate metrics for each segment
    // Always use 2032 as the forecast year for final values
    const forecastYear = 2032
    // Use 2024 as base year for CAGR calculation
    const baseYear = 2024
    
    // Helper function to get all descendants of a segment
    const getAllDescendants = (parentSegment: string): string[] => {
      const descendants: string[] = []
      const children = segmentHierarchy[parentSegment]
      
      if (Array.isArray(children)) {
        children.forEach(child => {
          descendants.push(child)
          // Recursively get descendants of this child
          descendants.push(...getAllDescendants(child))
        })
      }
      
      return descendants
    }

    // Calculate total market value by summing values for immediate children and their descendants
    // We need to count each segment record only once
    let totalMarketValue = 0
    const countedSegments = new Set<string>()
    
    immediateChildren.forEach(segment => {
      // Get all segments to include for this immediate child (including itself and all descendants)
      const segmentsToInclude = [segment, ...getAllDescendants(segment)]
      
      // Add values for all these segments (but count each segment only once across all immediate children)
      segmentsToInclude.forEach(seg => {
        if (!countedSegments.has(seg)) {
          countedSegments.add(seg)
          const records = geographyFiltered.filter(r => 
            r.segment === seg && r.segment_type === selectedSegmentType
          )
          records.forEach(record => {
            const value = record.time_series[forecastYear] || 0
            totalMarketValue += value
          })
        }
      })
    })

    // First pass: Calculate raw values for all segments to find maximums
    const segmentData: Array<{
      segment: string
      baseValue: number      // 2024 value
      forecastValue: number  // 2032 value
      cagr: number
      marketShare2024: number
      absoluteGrowth: number
      index: number
    }> = []
    
    // Calculate total market value for 2024 (for market share calculation)
    let totalMarketValue2024 = 0
    geographyFiltered.forEach(record => {
      const value = record.time_series[baseYear] || 0
      totalMarketValue2024 += value
    })
    
    immediateChildren.forEach((segment, index) => {
      // Get records for this segment and all its descendants
      const segmentsToInclude = [segment, ...getAllDescendants(segment)]
      const segmentRecords = geographyFiltered.filter(r => 
        segmentsToInclude.includes(r.segment) && r.segment_type === selectedSegmentType
      )
      
      if (segmentRecords.length === 0) return
      
      let forecastValue = 0  // Value in 2032
      let baseValue = 0      // Value in 2024
      
      segmentRecords.forEach(record => {
        const base = record.time_series[baseYear] || 0
        const forecast = record.time_series[forecastYear] || 0
        forecastValue += forecast
        baseValue += base
      })
      
      // Calculate market share based on 2024 values (as requested)
      const marketShare2024 = totalMarketValue2024 > 0 ? (baseValue / totalMarketValue2024) * 100 : 0
      
      // Calculate CAGR from 2024 to 2032 (8 years)
      let calculatedCAGR = 0
      if (baseValue > 0 && forecastValue > 0) {
        const years = forecastYear - baseYear  // 8 years
        if (years > 0) {
          // Calculate CAGR with safeguards against extreme values
          const growthRatio = forecastValue / baseValue
          
          // Cap extreme growth ratios to prevent unrealistic CAGR values
          // A 10x growth over 8 years = ~33% CAGR, 100x = ~78% CAGR
          const cappedRatio = Math.min(growthRatio, 100) // Cap at 100x growth max
          
          calculatedCAGR = (Math.pow(cappedRatio, 1 / years) - 1) * 100
          
          // Additional cap on CAGR itself (max 100% annual growth is very high)
          calculatedCAGR = Math.min(calculatedCAGR, 100)
          
          // Debug extreme values
          if (calculatedCAGR > 50 || growthRatio > 10) {
            console.log(`High CAGR for ${segment}:`, {
              baseValue,
              forecastValue,
              growthRatio,
              years,
              calculatedCAGR,
              cappedRatio
            })
          }
        }
      }
      
      // Calculate absolute growth from 2024 to 2032
      const absoluteGrowth = forecastValue - baseValue
      
      // Store data for index calculation
      if (forecastValue > 0 && baseValue > 0 && !isNaN(marketShare2024) && !isNaN(calculatedCAGR)) {
        segmentData.push({
          segment,
          baseValue,
          forecastValue,
          cagr: Math.max(0, calculatedCAGR), // No negative CAGR
          marketShare2024,
          absoluteGrowth,
          index
        })
      }
    })
    
    // Find maximum values for index calculations
    const maxCAGR = Math.max(...segmentData.map(d => d.cagr))
    const maxMarketShare2024 = Math.max(...segmentData.map(d => d.marketShare2024))
    const maxAbsoluteGrowth = Math.max(...segmentData.map(d => d.absoluteGrowth))
    
    // Debug: Log all segment data to understand the values
    console.log('Segment Data for Index Calculation:', segmentData.map(d => ({
      segment: d.segment,
      baseValue: d.baseValue.toFixed(2),
      forecastValue: d.forecastValue.toFixed(2),
      marketShare2024: d.marketShare2024.toFixed(2) + '%',
      absoluteGrowth: d.absoluteGrowth.toFixed(2),
      cagr: d.cagr.toFixed(2) + '%',
      growthMultiple: (d.forecastValue / d.baseValue).toFixed(2) + 'x'
    })))
    
    console.log('Max Values:', {
      maxCAGR: maxCAGR.toFixed(2) + '%',
      maxMarketShare2024: maxMarketShare2024.toFixed(2) + '%',
      maxAbsoluteGrowth: maxAbsoluteGrowth.toFixed(2)
    })
    
    // Check correlation between market share and absolute growth
    const correlationCheck = segmentData.map(d => ({
      segment: d.segment,
      shareRatio: (d.marketShare2024 / maxMarketShare2024).toFixed(3),
      growthRatio: (d.absoluteGrowth / maxAbsoluteGrowth).toFixed(3),
      difference: Math.abs((d.marketShare2024 / maxMarketShare2024) - (d.absoluteGrowth / maxAbsoluteGrowth)).toFixed(4)
    }))
    
    console.log('Correlation Check (Share vs Growth ratios):', correlationCheck)
    
    // Second pass: Calculate indices and create bubble data
    const bubbles: BubbleDataPoint[] = []
    
    segmentData.forEach(data => {
      // Calculate indices (0-100 scale)
      // Cap all indices at 100 to ensure they never exceed the maximum
      const cagrIndex = maxCAGR > 0 ? Math.min(100, (data.cagr / maxCAGR) * 100) : 0
      const marketShareIndex = maxMarketShare2024 > 0 ? Math.min(100, (data.marketShare2024 / maxMarketShare2024) * 100) : 0
      const incrementalOpportunityIndex = maxAbsoluteGrowth > 0 ? Math.min(100, (data.absoluteGrowth / maxAbsoluteGrowth) * 100) : 0
      
      // Debug each segment's indices
      console.log(`Indices for ${data.segment}:`, {
        marketShare: data.marketShare2024.toFixed(2),
        marketShareIndex: marketShareIndex.toFixed(1),
        absoluteGrowth: data.absoluteGrowth.toFixed(2),
        incrementalOpportunityIndex: incrementalOpportunityIndex.toFixed(1),
        cagr: data.cagr.toFixed(2),
        cagrIndex: cagrIndex.toFixed(1)
      })
      
      bubbles.push({
        name: data.segment,
        x: cagrIndex,                        // Will be overwritten by D3
        y: marketShareIndex,                 // Will be overwritten by D3
        z: incrementalOpportunityIndex,      // Incremental Opportunity Index for bubble size
        radius: 0, // Will be calculated later
        geography: selectedGeography,
        segment: data.segment,
        segmentType: selectedSegmentType,
        currentValue: data.forecastValue,
        cagr: data.cagr,                    // Store actual CAGR for tooltip
        marketShare: data.marketShare2024,   // Store actual market share for tooltip
        absoluteGrowth: data.absoluteGrowth, // Store actual growth for tooltip
        color: getChartColor(data.index % 10),
        // Store index values separately
        xIndex: cagrIndex,                   // CAGR Index (0-100)
        yIndex: marketShareIndex,            // Market Share Index (0-100)
        zIndex: incrementalOpportunityIndex  // Incremental Opportunity Index (0-100)
      })
    })
    
    // Sort by incremental opportunity index for better visualization
    bubbles.sort((a, b) => b.z - a.z)
    
    // Filter by minimum opportunity index
    let filteredBubbles = bubbles.filter(b => b.z >= minOpportunityIndex)
    
    // Limit to top N bubbles by opportunity index
    if (maxBubbles > 0 && filteredBubbles.length > maxBubbles) {
      filteredBubbles = filteredBubbles.slice(0, maxBubbles)
    }

    const xLabel = 'CAGR Index'
    const yLabel = 'Market Share Index (2024)'

    return { bubbles: filteredBubbles, xLabel, yLabel }
  }, [data, filters, selectedGeography, selectedSegmentType, selectedBusinessType, selectedSegments, maxBubbles, minOpportunityIndex])

  // Update dimensions on container resize
  useEffect(() => {
    if (!containerRef.current) return

    const updateDimensions = () => {
      if (containerRef.current) {
        const { width } = containerRef.current.getBoundingClientRect()
        setDimensions({ width: Math.max(width, 400), height })
      }
    }

    updateDimensions()
    const resizeObserver = new ResizeObserver(updateDimensions)
    resizeObserver.observe(containerRef.current)

    return () => resizeObserver.disconnect()
  }, [height])

  // D3 chart rendering
  useEffect(() => {
    if (!svgRef.current || chartData.bubbles.length === 0) return

    const margin = { top: 20, right: 20, bottom: 60, left: 60 }
    const width = dimensions.width - margin.left - margin.right
    const height = dimensions.height - margin.top - margin.bottom

    // Clear previous chart
    d3.select(svgRef.current).selectAll('*').remove()

    const svg = d3.select(svgRef.current)
      .attr('width', dimensions.width)
      .attr('height', dimensions.height)

    const g = svg.append('g')
      .attr('transform', `translate(${margin.left},${margin.top})`)

    // Calculate domains - Now working with 0-100 indices
    const xExtent = d3.extent(chartData.bubbles, d => d.x) as [number, number]
    const yExtent = d3.extent(chartData.bubbles, d => d.y) as [number, number]
    const zExtent = d3.extent(chartData.bubbles, d => d.z) as [number, number]

    // Calculate bubble sizes - Scale based on Incremental Opportunity Index (0-100)
    const maxBubbleRadius = Math.min(width, height) / 8
    const minBubbleRadius = 20

    const radiusScale = d3.scaleSqrt()
      .domain([0, 100]) // Index is 0-100
      .range([minBubbleRadius, maxBubbleRadius])

    // Update bubble radii
    chartData.bubbles.forEach(bubble => {
      bubble.radius = radiusScale(bubble.z)
    })

    const maxRadius = Math.max(...chartData.bubbles.map(b => b.radius))
    const padding = maxRadius * 0.8

    // X scale - CAGR Index (0-100)
    const xScale = d3.scaleLinear()
      .domain([0, 110]) // Fixed 0-110 for index (with 10% padding)
      .range([padding, width - padding])

    // Y scale - Market Share Index (0-100)
    const yScale = d3.scaleLinear()
      .domain([0, 110]) // Fixed 0-110 for index (with 10% padding)
      .range([height - padding, padding])

    // Add grid lines
    const xGrid = d3.axisBottom(xScale)
      .tickSize(-height + padding * 2)
      .tickFormat(() => '')

    const yGrid = d3.axisLeft(yScale)
      .tickSize(-width + padding * 2)
      .tickFormat(() => '')

    g.append('g')
      .attr('class', 'grid')
      .attr('transform', `translate(0,${height - padding})`)
      .call(xGrid)
      .style('stroke-dasharray', '3,3')
      .style('opacity', 0.3)

    g.append('g')
      .attr('class', 'grid')
      .attr('transform', `translate(${padding},0)`)
      .call(yGrid)
      .style('stroke-dasharray', '3,3')
      .style('opacity', 0.3)

    // Add X axis - CAGR Index
    const xAxis = d3.axisBottom(xScale)
      .tickFormat(d => `${(d as number).toFixed(0)}`)

    g.append('g')
      .attr('transform', `translate(0,${height - padding})`)
      .call(xAxis)
      .style('font-size', '10px')
      .append('text')
      .attr('x', width / 2)
      .attr('y', 35)
      .attr('fill', '#475569')
      .style('text-anchor', 'middle')
      .style('font-size', '11px')
      .style('font-weight', '500')
      .text(chartData.xLabel)

    // Add Y axis - Market Share Index
    const yAxis = d3.axisLeft(yScale)
      .tickFormat(d => `${(d as number).toFixed(0)}`)

    g.append('g')
      .attr('transform', `translate(${padding},0)`)
      .call(yAxis)
      .style('font-size', '10px')
      .append('text')
      .attr('transform', 'rotate(-90)')
      .attr('y', -40)
      .attr('x', -height / 2)
      .attr('fill', '#475569')
      .style('text-anchor', 'middle')
      .style('font-size', '11px')
      .style('font-weight', '500')
      .text(chartData.yLabel)

    // Create force simulation - use xIndex and yIndex for positioning
    const simulation = d3.forceSimulation(chartData.bubbles as any)
      .force('x', d3.forceX<BubbleDataPoint>(d => xScale(d.xIndex)).strength(1))
      .force('y', d3.forceY<BubbleDataPoint>(d => yScale(d.yIndex)).strength(1))
      .force('collide', d3.forceCollide<BubbleDataPoint>(d => d.radius + 3))
      .stop()

    // Run simulation
    for (let i = 0; i < 120; ++i) {
      simulation.tick()
      
      chartData.bubbles.forEach((d: any) => {
        d.x = Math.max(xScale.range()[0] + d.radius, 
              Math.min(xScale.range()[1] - d.radius, d.x))
        d.y = Math.max(yScale.range()[1] + d.radius,
              Math.min(yScale.range()[0] - d.radius, d.y))
      })
    }

    // Add bubbles
    const bubbles = g.append('g')
      .selectAll('circle')
      .data(chartData.bubbles)
      .enter()
      .append('circle')
      .attr('cx', d => (d as any).x || xScale(d.xIndex))
      .attr('cy', d => (d as any).y || yScale(d.yIndex))
      .attr('r', d => d.radius)
      .attr('fill', d => d.color)
      .attr('fill-opacity', 0.7)
      .attr('stroke', d => d.color)
      .attr('stroke-width', 2)
      .style('cursor', 'pointer')
      .on('mouseover', function(event, d) {
        d3.select(this)
          .attr('fill-opacity', 0.9)
          .attr('stroke-width', 3)

        setTooltipData(d)
        const [mouseX, mouseY] = d3.pointer(event, svg.node())
        setTooltipPosition({ x: mouseX, y: mouseY })
      })
      .on('mouseout', function(event, d) {
        d3.select(this)
          .attr('fill-opacity', 0.7)
          .attr('stroke-width', 2)

        setTooltipData(null)
      })

    // Add labels for larger bubbles
    const labels = g.append('g')
      .selectAll('text')
      .data(chartData.bubbles.filter(d => d.radius > 25))
      .enter()
      .append('text')
      .attr('x', d => (d as any).x || xScale(d.x))
      .attr('y', d => (d as any).y || yScale(d.y))
      .attr('text-anchor', 'middle')
      .attr('dy', '.35em')
      .style('font-size', '11px')
      .style('font-weight', 'bold')
      .style('fill', 'white')
      .style('pointer-events', 'none')
      .text(d => d.name.length > 15 ? d.name.substring(0, 12) + '...' : d.name)

    // Add legend note
    svg.append('text')
      .attr('x', dimensions.width / 2)
      .attr('y', dimensions.height - 5)
      .style('text-anchor', 'middle')
      .style('font-size', '11px')
      .style('fill', '#64748b')
      .style('font-style', 'italic')
      .text(`Bubble size represents 2032 market size in ${selectedGeography} | All values projected to 2032`)

  }, [chartData, dimensions, selectedGeography])

  if (!data) {
    return (
      <div className="flex items-center justify-center h-96 bg-gray-50 rounded-lg">
        <div className="text-center">
          <p className="text-black">Loading data...</p>
        </div>
      </div>
    )
  }

  const unit = filters.dataType === 'value'
    ? `${data.metadata.currency} ${data.metadata.value_unit}`
    : data.metadata.volume_unit

  return (
    <div className="w-full min-w-0 overflow-hidden" ref={containerRef}>
      {title && (
        <h3 className="text-lg font-semibold mb-4 text-gray-900">{title}</h3>
      )}
      
      {/* Enhanced Filter Section - Using Market Analysis Filters */}
      <div className="bg-white border border-gray-200 rounded-lg p-4 mb-6 space-y-4">
        <h4 className="text-sm font-semibold text-gray-900 mb-3">Filters for Opportunity Matrix</h4>
        
        {/* Geography Selection - Using Enhanced Geography Filter */}
        <div>
          <label className="block text-xs font-medium text-black uppercase mb-2">
            Geography (for Opportunity Matrix)
          </label>
          <div className="bg-gray-50 rounded-lg p-3">
            <EnhancedGeographyFilter
              selectedGeographies={selectedGeography ? [selectedGeography] : []}
              onGeographiesChange={(geographies) => {
                // For opportunity matrix, only allow single geography selection
                if (geographies.length > 0) {
                  setSelectedGeography(geographies[geographies.length - 1]) // Take the last selected
                } else {
                  // If cleared, default to India
                  setSelectedGeography('India')
                }
              }}
            />
            <p className="text-xs text-gray-500 mt-2">
              Selected: <span className="font-medium">{selectedGeography}</span>
            </p>
          </div>
        </div>

        {/* Business Type Filter */}
        <div>
          <label className="block text-xs font-medium text-black uppercase mb-2">
            Business Type
          </label>
          <div className="flex gap-2">
            <button
              onClick={() => setSelectedBusinessType('All')}
              className={`flex-1 px-3 py-2 text-sm rounded ${
                selectedBusinessType === 'All'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-black hover:bg-gray-200'
              }`}
            >
              All (B2B + B2C)
            </button>
            <button
              onClick={() => setSelectedBusinessType('B2B')}
              className={`flex-1 px-3 py-2 text-sm rounded ${
                selectedBusinessType === 'B2B'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-black hover:bg-gray-200'
              }`}
            >
              B2B Only
            </button>
            <button
              onClick={() => setSelectedBusinessType('B2C')}
              className={`flex-1 px-3 py-2 text-sm rounded ${
                selectedBusinessType === 'B2C'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-black hover:bg-gray-200'
              }`}
            >
              B2C Only
            </button>
          </div>
        </div>

        {/* Segment Selection - Using Cascading Segment Filter */}
        <div>
          <label className="block text-xs font-medium text-black uppercase mb-2">
            Segment Selection
          </label>
          <div className="bg-gray-50 rounded-lg p-3">
            <CascadingSegmentFilter />
            {selectedSegments.length > 0 && (
              <div className="mt-3 pt-3 border-t border-gray-200">
                <p className="text-xs font-medium text-gray-700 mb-2">
                  Selected Segments ({selectedSegments.length}):
                </p>
                <div className="flex flex-wrap gap-2">
                  {selectedSegments.slice(0, 5).map((segment, idx) => (
                    <span
                      key={idx}
                      className="px-2 py-1 bg-blue-100 text-blue-700 rounded text-xs"
                      title={segment}
                    >
                      {segment.length > 40 ? segment.substring(0, 37) + '...' : segment}
                    </span>
                  ))}
                  {selectedSegments.length > 5 && (
                    <span className="px-2 py-1 bg-gray-100 text-gray-600 rounded text-xs">
                      +{selectedSegments.length - 5} more
                    </span>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
        
        {/* Display Limits - Chart Specific Controls */}
        <div className="border-t pt-4">
          <label className="block text-xs font-medium text-black uppercase mb-3">
            Display Controls
          </label>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Max Bubbles to Show: {maxBubbles === 0 ? 'All' : maxBubbles}
              </label>
              <input
                type="range"
                min="0"
                max="50"
                step="5"
                value={maxBubbles}
                onChange={(e) => setMaxBubbles(Number(e.target.value))}
                className="w-full"
              />
              <div className="flex justify-between text-xs text-gray-500 mt-1">
                <span>All</span>
                <span>10</span>
                <span>20</span>
                <span>30</span>
                <span>40</span>
                <span>50</span>
              </div>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Min Opportunity Index: {minOpportunityIndex}
              </label>
              <input
                type="range"
                min="0"
                max="100"
                step="5"
                value={minOpportunityIndex}
                onChange={(e) => setMinOpportunityIndex(Number(e.target.value))}
                className="w-full"
              />
              <div className="flex justify-between text-xs text-gray-500 mt-1">
                <span>0</span>
                <span>25</span>
                <span>50</span>
                <span>75</span>
                <span>100</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="relative">
        <svg ref={svgRef} className="w-full" />
        
        {/* Custom Tooltip */}
        {tooltipData && (
          <div
            className="absolute bg-white p-4 border border-gray-200 rounded-lg shadow-lg min-w-[280px] z-50 pointer-events-none"
            style={{
              left: `${tooltipPosition.x + 10}px`,
              top: `${tooltipPosition.y - 10}px`,
              transform: tooltipPosition.x > dimensions.width / 2 ? 'translateX(-100%)' : 'none'
            }}
          >
            <p className="font-semibold text-gray-900 mb-3 pb-2 border-b border-gray-200">
              {tooltipData.name}
            </p>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm text-black">Geography:</span>
                <span className="text-sm font-medium text-gray-900">
                  {tooltipData.geography}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-black">Segment Type:</span>
                <span className="text-sm font-medium text-gray-900">
                  {tooltipData.segmentType}
                </span>
              </div>
              
              {/* Index Values Section */}
              <div className="pt-2 mt-2 border-t border-gray-200">
                <p className="text-xs font-semibold text-black mb-2">INDEX VALUES</p>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-black">CAGR Index:</span>
                  <span className="text-sm font-bold text-purple-600">
                    {tooltipData.xIndex.toFixed(1)}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-black">Market Share Index (2024):</span>
                  <span className="text-sm font-bold text-purple-600">
                    {tooltipData.yIndex.toFixed(1)}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-black">Incremental Opportunity Index:</span>
                  <span className="text-sm font-bold text-purple-600">
                    {tooltipData.zIndex.toFixed(1)}
                  </span>
                </div>
              </div>
              
              {/* Actual Values Section */}
              <div className="pt-2 mt-2 border-t border-gray-200">
                <p className="text-xs font-semibold text-black mb-2">ACTUAL VALUES</p>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-black">Market Size (2032):</span>
                  <div className="text-right">
                    <span className="text-sm font-semibold text-gray-900">
                      {tooltipData.currentValue.toLocaleString(undefined, { 
                        minimumFractionDigits: 2, 
                        maximumFractionDigits: 2 
                      })}
                    </span>
                    <span className="text-xs text-black ml-1">{unit}</span>
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-black">Market Share (2024):</span>
                  <span className="text-sm font-semibold text-blue-600">
                    {tooltipData.marketShare.toFixed(2)}%
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-black">CAGR (2024-2032):</span>
                  <span className={`text-sm font-semibold ${
                    tooltipData.cagr > 0 ? 'text-green-600' : tooltipData.cagr < 0 ? 'text-red-600' : 'text-black'
                  }`}>
                    {tooltipData.cagr > 0 ? '+' : ''}{tooltipData.cagr.toFixed(2)}%
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-black">Growth (2024-2032):</span>
                  <span className={`text-sm font-semibold ${
                    tooltipData.absoluteGrowth > 0 ? 'text-green-600' : tooltipData.absoluteGrowth < 0 ? 'text-red-600' : 'text-black'
                  }`}>
                    {tooltipData.absoluteGrowth > 0 ? '+' : ''}
                    {tooltipData.absoluteGrowth.toLocaleString(undefined, { 
                      minimumFractionDigits: 2, 
                      maximumFractionDigits: 2 
                    })} {unit}
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="mt-6 space-y-3">
        <div className="bg-gray-50 rounded-lg p-4">
          <h4 className="text-sm font-semibold text-gray-900 mb-3">Chart Dimensions (Index Scale 0-100)</h4>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
                <span className="text-blue-600 font-bold text-xs">X</span>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-900">CAGR Index</p>
                <p className="text-xs text-black">Growth rate relative to max</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0">
                <span className="text-green-600 font-bold text-xs">Y</span>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-900">Market Share Index (2024)</p>
                <p className="text-xs text-black">Current position relative to leader</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center flex-shrink-0">
                <span className="text-purple-600 font-bold text-xs">S</span>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-900">Incremental Opportunity Index</p>
                <p className="text-xs text-black">Absolute growth potential (bubble size)</p>
              </div>
            </div>
          </div>
        </div>
        
        <div className="text-center">
          <p className="text-sm text-black">
            Showing {chartData.bubbles.length} {selectedSegmentType} segment{chartData.bubbles.length !== 1 ? 's' : ''} in {selectedGeography}
            {selectedBusinessType !== 'All' && ` (${selectedBusinessType} only)`}
            {selectedSegments.length > 0 && ` - ${selectedSegments.length} selected`}
            {maxBubbles > 0 && chartData.bubbles.length >= maxBubbles && ` (limited to top ${maxBubbles})`}
          </p>
          <p className="text-xs text-black mt-1">
            Hover over bubbles for detailed metrics
          </p>
        </div>
      </div>
    </div>
  )
}
