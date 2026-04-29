'use client'

interface HeatmapCell {
  value: number
  color: string
}

interface HeatmapData {
  [key: string]: {
    [key: string]: number
  }
}

function getColorForValue(value: number, min: number, max: number): string {
  // Color scale from light green to dark blue matching the image
  const colors = [
    '#4ECDC4', // Teal/green (low) - for 191
    '#6BB86B', // Medium green
    '#4A90E2', // Medium blue - for 300
    '#2E5C8A', // Dark blue - for 351
    '#1E3A5F'  // Darker blue (high) - for 373
  ]
  
  if (max === min) return colors[0]
  
  const ratio = (value - min) / (max - min)
  const index = Math.min(Math.floor(ratio * (colors.length - 1)), colors.length - 1)
  return colors[index]
}

export function DistributorIntelligenceHeatmap() {
  // Hardcoded data matching the image
  const heatmapData: HeatmapData = {
    'Distributors': {
      'East India': 351,
      'North India': 373,
      'South India': 300,
      'West India': 191
    }
  }

  const regions = ['East India', 'North India', 'South India', 'West India']
  const categories = Object.keys(heatmapData)
  
  // Calculate min and max for color scaling
  const allValues = categories.flatMap(cat => 
    regions.map(region => heatmapData[cat][region] || 0)
  )
  const minValue = Math.min(...allValues)
  const maxValue = Math.max(...allValues)

  return (
    <div className="w-full bg-white rounded-lg border border-gray-200 p-6">
      {/* Title */}
      <div className="mb-4">
        <h3 className="text-lg font-semibold text-gray-900">
          Distributor Intelligence - Industry Category × Region
        </h3>
        <p className="text-sm text-gray-600 mt-1">
          Number of distributors by Industry Category and Region
        </p>
      </div>

      {/* Heatmap Table */}
      <div className="overflow-x-auto">
        <table className="w-full border-collapse">
          <thead>
            <tr>
              <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700 border border-gray-300 bg-gray-50">
                Industry Category \ Region
              </th>
              {regions.map(region => (
                <th
                  key={region}
                  className="px-4 py-3 text-center text-sm font-semibold text-gray-700 border border-gray-300 bg-gray-50"
                >
                  {region}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {categories.map(category => (
              <tr key={category}>
                <td className="px-4 py-3 text-sm font-medium text-gray-900 border border-gray-300 bg-gray-50">
                  {category}
                </td>
                {regions.map(region => {
                  const value = heatmapData[category][region] || 0
                  const color = getColorForValue(value, minValue, maxValue)
                  
                  return (
                    <td
                      key={region}
                      className="px-4 py-3 text-center text-sm font-semibold text-white border border-gray-300"
                      style={{ backgroundColor: color }}
                    >
                      {value} distributors
                    </td>
                  )
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Color Legend */}
      <div className="mt-4 flex items-center gap-2">
        <span className="text-xs text-gray-600 font-medium">Low</span>
        <div className="flex gap-0.5">
          <div className="w-8 h-4 bg-[#4ECDC4] border border-gray-300"></div>
          <div className="w-8 h-4 bg-[#6BB86B] border border-gray-300"></div>
          <div className="w-8 h-4 bg-[#4A90E2] border border-gray-300"></div>
          <div className="w-8 h-4 bg-[#2E5C8A] border border-gray-300"></div>
          <div className="w-8 h-4 bg-[#1E3A5F] border border-gray-300"></div>
        </div>
        <span className="text-xs text-gray-600 font-medium">High</span>
      </div>

      {/* Comparison Note */}
      <div className="mt-4 text-xs text-gray-500 text-center">
        Comparing {categories.length} industry categories × {regions.length} regions
      </div>
    </div>
  )
}

