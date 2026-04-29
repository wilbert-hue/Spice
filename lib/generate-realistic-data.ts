import type { ComparisonData, DataRecord, SegmentHierarchy, SegmentDimension } from './types'

/**
 * Generate realistic dummy data for the India Spices Market
 * Based on segmentation structure and geography dimensions
 */

interface SegmentationStructure {
  [key: string]: SegmentationStructure | string[]
}

// Helper to generate a random number with some variance
function randomValue(base: number, variance: number = 0.3): number {
  const min = base * (1 - variance)
  const max = base * (1 + variance)
  return Math.random() * (max - min) + min
}

// Generate time series with realistic growth
function generateTimeSeries(
  startValue: number,
  cagr: number,
  years: number[]
): Record<number, number> {
  const timeSeries: Record<number, number> = {}
  const startYear = years[0]
  
  years.forEach((year, index) => {
    const yearsFromStart = year - startYear
    // Apply CAGR with some random variance
    const growthFactor = Math.pow(1 + cagr / 100, yearsFromStart)
    const variance = 1 + (Math.random() - 0.5) * 0.1 // ±5% variance
    timeSeries[year] = Math.max(0, startValue * growthFactor * variance)
  })
  
  return timeSeries
}

// Calculate CAGR from start and end values
function calculateCAGR(startValue: number, endValue: number, years: number): number {
  if (startValue <= 0 || years === 0) return 0
  return ((Math.pow(endValue / startValue, 1 / years) - 1) * 100)
}

// Get all leaf segments from the segmentation structure
function getAllLeafSegments(
  structure: SegmentationStructure,
  path: string[] = [],
  businessType: 'B2B' | 'B2C' = 'B2B'
): Array<{ path: string[], fullPath: string, hierarchy: SegmentHierarchy }> {
  const leaves: Array<{ path: string[], fullPath: string, hierarchy: SegmentHierarchy }> = []
  
  if (!structure || typeof structure !== 'object') {
    return leaves
  }
  
  Object.keys(structure).forEach(key => {
    const value = structure[key]
    const newPath = [...path, key]
    
    if (Array.isArray(value)) {
      // This is a leaf - array of items
      value.forEach(item => {
        const fullPath = [...newPath, item].join(' > ')
        
        // Build hierarchy based on path depth
        // Path structure: [B2B/B2C, Category, Subcategory, ProductType, Item]
        const hierarchy: SegmentHierarchy = {
          level_1: path[0] || businessType, // B2B or B2C
          level_2: newPath.length > 1 ? newPath[1] : '', // Category
          level_3: newPath.length > 2 ? newPath[2] : '', // Subcategory or ProductType
          level_4: newPath.length > 3 ? newPath[3] : (item || '') // ProductType or Item
        }
        
        // Adjust for nested structures (e.g., Food & Beverage Processing > Packaged Foods)
        if (newPath.length === 2) {
          // B2B > Category > [items]
          hierarchy.level_2 = newPath[0]
          hierarchy.level_3 = key
          hierarchy.level_4 = item
        } else if (newPath.length === 3) {
          // B2B > Category > Subcategory > [items]
          hierarchy.level_2 = newPath[0]
          hierarchy.level_3 = newPath[1]
          hierarchy.level_4 = item
        } else if (newPath.length === 4) {
          // B2B > Category > Subcategory > ProductType > [items]
          hierarchy.level_2 = newPath[0]
          hierarchy.level_3 = newPath[1]
          hierarchy.level_4 = item
        } else if (newPath.length >= 5) {
          // B2B > Category > Subcategory > NestedSubcategory > ProductType > [items]
          hierarchy.level_2 = newPath[0]
          hierarchy.level_3 = newPath[1]
          hierarchy.level_4 = newPath[2] || item
        }
        
        leaves.push({ path: [...newPath, item], fullPath, hierarchy })
      })
    } else if (typeof value === 'object' && value !== null) {
      // Recursively get leaves from nested structure
      const nestedLeaves = getAllLeafSegments(value as SegmentationStructure, newPath, businessType)
      leaves.push(...nestedLeaves)
    }
  })
  
  return leaves
}

// Helper to convert hierarchy to nested structure (for By Distribution Channel)
function convertHierarchyToStructureForData(hierarchy: Record<string, string[]>): SegmentationStructure {
  const structure: SegmentationStructure = {}
  
  function buildStructure(key: string, visited: Set<string> = new Set()): SegmentationStructure | string[] {
    if (visited.has(key)) {
      return []
    }
    visited.add(key)
    
    const values = hierarchy[key]
    if (!values || values.length === 0) {
      return []
    }
    
    const nested: SegmentationStructure = {}
    const leafItems: string[] = []
    
    values.forEach(v => {
      if (hierarchy[v] !== undefined) {
        nested[v] = buildStructure(v, new Set(visited))
      } else {
        leafItems.push(v)
      }
    })
    
    if (Object.keys(nested).length > 0 && leafItems.length > 0) {
      return { ...nested, _items: leafItems }
    } else if (Object.keys(nested).length > 0) {
      return nested
    } else {
      return leafItems
    }
  }
  
  Object.keys(hierarchy).forEach(key => {
    const isTopLevel = !Object.values(hierarchy).some(values => values.includes(key))
    if (isTopLevel) {
      structure[key] = buildStructure(key)
    }
  })
  
  return structure
}

// Generate data for a single geography-segment combination
function generateDataRecord(
  geography: string,
  geographyLevel: 'global' | 'region' | 'country',
  parentGeography: string | null,
  segmentPath: string[],
  segmentFullPath: string,
  hierarchy: SegmentHierarchy,
  baseYear: number,
  forecastYear: number,
  years: number[],
  isValue: boolean,
  segmentType: string = 'By End-Use*Product Type',
  businessType?: string
): DataRecord {
  // Base values vary by geography and segment type
  const geographyMultiplier = getGeographyMultiplier(geography, geographyLevel)
  const segmentMultiplier = getSegmentMultiplier(segmentPath, hierarchy)
  
  // Base value in Cr. INR for value, Kilo Tons for volume
  const baseValue = isValue 
    ? randomValue(50 * geographyMultiplier * segmentMultiplier, 0.4) // Value in Cr. INR
    : randomValue(100 * geographyMultiplier * segmentMultiplier, 0.4) // Volume in Kilo Tons
  
  // CAGR varies by segment and geography (3% to 12% for value, 2% to 8% for volume)
  const baseCAGR = isValue 
    ? randomValue(6, 0.5) // 3-9% for value
    : randomValue(4, 0.5) // 2-6% for volume
  
  const cagr = baseCAGR + (Math.random() - 0.5) * 2
  
  // Generate time series
  const timeSeries = generateTimeSeries(baseValue, cagr, years)
  
  // Calculate market share (will be normalized later)
  const endValue = timeSeries[forecastYear] || baseValue
  const marketShare = endValue // Will be normalized across all segments
  
  // Update hierarchy level_1 with businessType if provided
  const finalHierarchy: SegmentHierarchy = businessType 
    ? { ...hierarchy, level_1: businessType }
    : hierarchy
  
  return {
    geography,
    geography_level: geographyLevel,
    parent_geography: parentGeography,
    segment_type: segmentType,
    segment: segmentFullPath,
    segment_level: 'leaf',
    segment_hierarchy: finalHierarchy,
    time_series: timeSeries,
    cagr: cagr,
    market_share: marketShare
  }
}

// Geography multipliers (larger markets get higher values)
function getGeographyMultiplier(geography: string, level: 'global' | 'region' | 'country'): number {
  if (level === 'global') return 10.0 // India total
  if (level === 'region') {
    const regionMultipliers: Record<string, number> = {
      'North India': 2.5,
      'South India': 2.8,
      'West India': 2.6,
      'East India': 1.8
    }
    return regionMultipliers[geography] || 2.0
  }
  
  // State/country level
  const stateMultipliers: Record<string, number> = {
    'Maharashtra': 1.2,
    'Uttar Pradesh': 1.1,
    'Tamil Nadu': 0.9,
    'Karnataka': 0.85,
    'West Bengal': 0.8,
    'Gujrat': 0.75,
    'Delhi': 0.7,
    'Punjab': 0.65,
    'Haryana': 0.6,
    'Andhra Pradesh': 0.55,
    'Rajasthan': 0.5,
    'Assam': 0.4,
    'Odisha': 0.35
  }
  
  return stateMultipliers[geography] || 0.3
}

// Segment multipliers (different segments have different market sizes)
function getSegmentMultiplier(segmentPath: string[], hierarchy: SegmentHierarchy): number {
  // B2B vs B2C
  if (hierarchy.level_1 === 'B2B') {
    // Food & Beverage is larger than Non-Food Industrial
    if (hierarchy.level_2 === 'Food & Beverage') {
      // Foodservice is larger than Processing
      if (hierarchy.level_3 === 'Foodservice / HoReCa') {
        return randomValue(1.2, 0.2)
      } else if (hierarchy.level_3 === 'Food & Beverage Processing') {
        return randomValue(1.0, 0.2)
      }
      return randomValue(0.9, 0.2)
    } else if (hierarchy.level_2 === 'Non-Food Industrial') {
      return randomValue(0.4, 0.3)
    }
  } else if (hierarchy.level_1 === 'B2C') {
    // Household consumption is larger than home-based businesses
    if (hierarchy.level_2 === 'Household / Retail Consumption') {
      return randomValue(1.5, 0.2)
    } else if (hierarchy.level_2 === 'Home-Based / Micro Food Businesses') {
      return randomValue(0.6, 0.3)
    }
  }
  
  // Product type multipliers
  if (hierarchy.level_3 === 'Single / Individual Spices') {
    return randomValue(1.3, 0.2) // Most popular
  } else if (hierarchy.level_3 === 'Blended / Mixed Spices') {
    return randomValue(1.1, 0.2)
  } else if (hierarchy.level_3 === 'Seasonings & Flavour Mixes') {
    return randomValue(0.8, 0.2)
  } else if (hierarchy.level_3 === 'Spice Derivatives & Extracts') {
    return randomValue(0.5, 0.3) // Smaller niche market
  }
  
  return randomValue(1.0, 0.3)
}

// Normalize market shares across all records
function normalizeMarketShares(records: DataRecord[], year: number): void {
  const total = records.reduce((sum, record) => {
    return sum + (record.time_series[year] || 0)
  }, 0)
  
  if (total > 0) {
    records.forEach(record => {
      const value = record.time_series[year] || 0
      record.market_share = (value / total) * 100
    })
  }
}

// Load segmentation structure from JSON
async function loadSegmentationStructure(): Promise<SegmentationStructure> {
  try {
    const response = await fetch('/jsons/segmentation-structure.json', {
      cache: 'no-cache',
      headers: {
        'Accept': 'application/json',
      }
    })
    
    if (!response.ok) {
      throw new Error(`Failed to fetch: ${response.status}`)
    }
    
    const text = await response.text()
    if (text.startsWith('<!DOCTYPE') || text.startsWith('<html')) {
      throw new Error('Received HTML instead of JSON')
    }
    
    return JSON.parse(text)
  } catch (error) {
    console.error('Failed to load segmentation structure:', error)
    return {}
  }
}

// Generate all data records
export async function generateRealisticData(dimensionsData: any): Promise<ComparisonData> {
  const metadata = dimensionsData.metadata
  const geographies = dimensionsData.dimensions.geographies
  const years = metadata.years
  
  // Load segmentation structure from JSON
  let segmentationStructure = await loadSegmentationStructure()
  
  if (!segmentationStructure || Object.keys(segmentationStructure).length === 0) {
    // Fallback structure if loading fails
    segmentationStructure = {
      B2B: {
        'Food & Beverage': {
          'Foodservice / HoReCa': {
            'Single / Individual Spices': [
            'Chilli', 'Turmeric', 'Coriander', 'Cumin', 'Black Pepper', 'White Pepper',
            'Green Cardamom', 'Black Cardamom', 'Clove', 'Cinnamon', 'Cassia', 'Fennel',
            'Fenugreek Seed', 'Mustard Seed (Black)', 'Mustard Seed (Yellow)', 'Mustard Seed (Brown)',
            'Bay Leaf', 'Nutmeg', 'Mace', 'Star Anise', 'Carom Seeds (Ajwain)', 'Nigella Seeds (Kalonji)',
            'White Sesame Seeds', 'Black Sesame Seeds', 'Poppy Seeds', 'Dry Ginger', 'Dry Garlic', 'Tamarind'
          ],
          'Blended / Mixed Spices': [
            'Garam Masala Blends', 'Generic Curry Masala Blends', 'Biryani Masala Blends',
            'Pulao Masala Blends', 'Sabzi / Vegetable Masala Blends', 'Dal Masala Blends',
            'Meat Masala Blends', 'Chicken Masala Blends', 'Mutton Masala Blends', 'Fish Masala Blends',
            'Seafood Masala Blends', 'Tandoori Masala Blends', 'BBQ Masala Blends', 'Kebab Masala Blends',
            'Sambar Masala Blends', 'Rasam Masala Blends', 'Chaat Masala Blends', 'Street-Food Masala Blends',
            'Pickle Masala Blends', 'Regional Punjabi Masala Blends', 'Regional Mughlai Masala Blends',
            'Regional South Indian Masala Blends', 'Regional Rajasthani Masala Blends'
          ],
          'Seasonings & Flavour Mixes': [
            'Table Sprinkle Seasonings', 'French Fries Seasonings', 'Tikka Seasonings', 'Kebab Seasonings',
            'Gravy Booster Seasonings', 'Salad Seasonings', 'Sandwich Seasonings', 'Pizza Seasonings',
            'Pasta Seasonings', 'Indo-Chinese Seasonings', 'Fusion Cuisine Seasonings'
          ],
          'Spice Derivatives & Extracts': [
            'Chilli Oleoresin', 'Paprika Oleoresin', 'Black Pepper Oleoresin', 'Garlic Oleoresin',
            'Onion Oleoresin', 'Turmeric Oleoresin', 'Capsaicin Extract', 'Curcumin Extract',
            'Piperine Extract', 'Mixed Spice Essential Oils'
          ]
        },
        'Food & Beverage Processing': {
          'Packaged Foods': {
            'Single / Individual Spices': [
              'Chilli Powder', 'Turmeric Powder', 'Coriander Powder', 'Cumin Powder', 'Black Pepper Powder',
              'Garlic Powder', 'Onion Powder', 'Dry Ginger Powder', 'White Sesame Seeds', 'Black Sesame Seeds',
              'Carom Seeds (Ajwain)', 'Nigella Seeds (Kalonji)', 'Fenugreek Seed', 'Mustard Seed'
            ],
            'Blended / Mixed Spices': [
              'Snack Masala Blends', 'Namkeen Masala Blends', 'Bhujia Masala Blends', 'Chips Masala Blends',
              'Instant Noodle Masala Blends', 'Instant Pasta Masala Blends', 'Instant Curry Masala Blends',
              'Regional Snack Masala Blends'
            ],
            'Seasonings & Flavour Mixes': [
              'Extruded Snack Seasonings', 'Coated Nut Seasonings', 'Popcorn Seasonings',
              'Pellets Seasonings', 'Instant Soup Seasonings'
            ],
            'Spice Derivatives & Extracts': [
              'Chilli Oleoresin', 'Paprika Oleoresin', 'Turmeric Oleoresin', 'Black Pepper Oleoresin',
              'Garlic Oleoresin', 'Onion Oleoresin', 'Encapsulated Snack Flavours', 'Spray-Dried Spice Powders'
            ]
          },
          'Meat & Poultry Processing': {
            'Single / Individual Spices': [
              'Black Pepper', 'White Pepper', 'Chilli', 'Coriander', 'Cumin', 'Garlic', 'Onion',
              'Mustard Seed', 'Fennel', 'Rosemary-Type Spice Herbs', 'Thyme-Type Spice Herbs', 'Bay Leaf'
            ],
            'Blended / Mixed Spices': [
              'Sausage Spice Blends', 'Ham Spice Blends', 'Salami Spice Blends', 'Tandoori Marinade Blends',
              'Grill Marinade Blends', 'Kebab Marinade Blends', 'Curry Marinade Blends'
            ],
            'Seasonings & Flavour Mixes': [
              'Brine Seasonings', 'Injection Seasonings', 'Coating Seasonings', 'Breading Seasonings'
            ],
            'Spice Derivatives & Extracts': [
              'Smoke Flavour Extracts', 'Grill Flavour Extracts', 'Pepper Oleoresin', 'Chilli Oleoresin',
              'Antioxidant Spice Extracts'
            ]
          },
          'Ready-to-Eat / Ready-to-Cook Meals': {
            'Single / Individual Spices': [
              'Chilli', 'Turmeric', 'Coriander', 'Cumin', 'Black Pepper', 'Green Cardamom', 'Clove',
              'Cinnamon', 'Bay Leaf', 'Dry Ginger', 'Dry Garlic'
            ],
            'Blended / Mixed Spices': [
              'Curry Base Blends', 'Dal Base Blends', 'Biryani Base Blends', 'Pulao Base Blends',
              'Paneer Gravy Blends', 'Vegetable Gravy Blends', 'Sambar Base Blends', 'Rasam Base Blends'
            ],
            'Seasonings & Flavour Mixes': [
              'RTE Top-Up Seasonings', 'RTC Masala Sachets', 'Microwave Meal Flavour Boosters'
            ],
            'Spice Derivatives & Extracts': [
              'Chilli Oleoresin', 'Turmeric Oleoresin', 'Pepper Oleoresin', 'Mixed Curry Oleoresins',
              'Encapsulated Curry Flavours'
            ]
          },
          'Sauces, Ketchups, Dips & Chutneys': {
            'Single / Individual Spices': [
              'Chilli', 'Garlic', 'Ginger', 'Cumin', 'Coriander', 'Mustard Seed', 'Black Pepper', 'Fenugreek Seed'
            ],
            'Blended / Mixed Spices': [
              'Chaat Masala Blends', 'Street-Food Chutney Blends', 'Tandoori Sauce Spice Blends',
              'Indo-Chinese Sauce Spice Blends', 'Peri-Peri Sauce Spice Blends'
            ],
            'Seasonings & Flavour Mixes': [
              'Dip Seasonings', 'Sandwich Spread Seasonings', 'Burger Sauce Seasonings'
            ],
            'Spice Derivatives & Extracts': [
              'Capsaicin Extract', 'Chilli Oleoresin', 'Paprika Oleoresin', 'Turmeric Extract',
              'Garlic Oleoresin', 'Onion Oleoresin'
            ]
          },
          'Bakery & Confectionery': {
            'Single / Individual Spices': [
              'Cinnamon', 'Cassia', 'Nutmeg', 'Mace', 'Clove', 'Green Cardamom', 'Fennel', 'Dry Ginger'
            ],
            'Blended / Mixed Spices': [
              'Chai Masala Blends', 'Cake Spice Blends', 'Festive Dessert Spice Blends',
              'Indian Mithai Masala Blends'
            ],
            'Seasonings & Flavour Mixes': [
              'Garlic Bread Seasonings', 'Savoury Bun Seasonings', 'Crouton Seasonings'
            ],
            'Spice Derivatives & Extracts': [
              'Cinnamon Extract', 'Cardamom Extract', 'Clove Extract', 'Ginger Extract'
            ]
          },
          'Beverages': {
            'Single / Individual Spices': [
              'Green Cardamom', 'Clove', 'Cinnamon', 'Dry Ginger', 'Black Pepper', 'Fennel', 'Nutmeg', 'Star Anise'
            ],
            'Blended / Mixed Spices': [
              'Masala Chai Blends', 'Kadha Blends', 'Spiced Milk Blends',
              'Badam Drink Masala Blends', 'Herbal Detox Drink Blends'
            ],
            'Seasonings & Flavour Mixes': [
              'Tea Premix Seasonings', 'Vending Machine Premix Seasonings', 'RTD Beverage Flavour Blends'
            ],
            'Spice Derivatives & Extracts': [
              'Cardamom Extract', 'Ginger Extract', 'Cinnamon Extract', 'Clove Extract',
              'Curcumin Extract', 'Pepper Extract'
            ]
          }
        }
      },
      'Non-Food Industrial': {
        'Nutraceuticals & Dietary Supplements': {
          'Single / Individual Spices': [
            'Turmeric Powder', 'Dry Ginger Powder', 'Cinnamon Powder', 'Black Pepper Powder'
          ],
          'Blended / Mixed Spices': [
            'Joint Health Spice Blends', 'Immunity Booster Spice Blends', 'Digestive Spice Blends'
          ],
          'Seasonings & Flavour Mixes': [
            'Flavoured Nutraceutical Seasoning Blends'
          ],
          'Spice Derivatives & Extracts': [
            'Curcumin Extract', 'Piperine Extract', 'Gingerol-Rich Extracts',
            'Cinnamon Polyphenol Extracts', 'Capsaicin Extract'
          ]
        },
        'Pharmaceuticals & Ayurveda': {
          'Single / Individual Spices': [
            'Turmeric', 'Dry Ginger', 'Black Pepper', 'Long Pepper', 'Clove', 'Cinnamon',
            'Fennel', 'Carom Seeds (Ajwain)', 'Coriander'
          ],
          'Blended / Mixed Spices': [
            'Classical Ayurvedic Spice Blends', 'Proprietary Herbal Spice Blends'
          ],
          'Seasonings & Flavour Mixes': [
            'Flavour Blends for Syrups'
          ],
          'Spice Derivatives & Extracts': [
            'Turmeric Extract', 'Piperine Extract', 'Ginger Extract', 'Clove Oil', 'Cinnamon Oil'
          ]
        },
        'Cosmetics & Personal Care': {
          'Single / Individual Spices': [
            'Turmeric Powder', 'Dry Ginger Powder'
          ],
          'Blended / Mixed Spices': [
            'Ubtan Blends', 'Herbal Face-Pack Blends'
          ],
          'Seasonings & Flavour Mixes': [
            'Oral-Care Spice Flavours'
          ],
          'Spice Derivatives & Extracts': [
            'Turmeric Extract', 'Clove Oil', 'Cinnamon Oil', 'Pepper Oil', 'Essential Oils'
          ]
        },
        'Fragrances & Perfumery': {
          'Single / Individual Spices': [
            'Green Cardamom', 'Clove', 'Cinnamon', 'Nutmeg', 'Mace', 'Star Anise', 'Black Pepper'
          ],
          'Blended / Mixed Spices': [
            'Warm Spice Fragrance Blends', 'Oriental Spice Fragrance Blends'
          ],
          'Seasonings & Flavour Mixes': [
            'Oral-Care Flavour Fragrances'
          ],
          'Spice Derivatives & Extracts': [
            'Cardamom Oil', 'Clove Oil', 'Cinnamon Oil', 'Nutmeg Oil', 'Mace Oil', 'Pepper Oil'
          ]
        },
        'Natural Colours & Industrial Additives': {
          'Single / Individual Spices': [
            'Turmeric', 'Paprika', 'Chilli', 'Annatto-Type Materials'
          ],
          'Blended / Mixed Spices': [
            'Custom Clean-Label Flavour Blends'
          ],
          'Seasonings & Flavour Mixes': [
            'Functional Carrier-Blends'
          ],
          'Spice Derivatives & Extracts': [
            'Colour Extracts', 'Oleoresins', 'Encapsulated Systems'
          ]
        }
      }
    },
      B2C: {
        'Household / Retail Consumption': {
          'Single / Individual Spices': [
            'Chilli', 'Turmeric', 'Coriander', 'Cumin', 'Black Pepper', 'White Pepper',
          'Green Cardamom', 'Black Cardamom', 'Clove', 'Cinnamon', 'Cassia', 'Fennel',
          'Fenugreek Seed', 'Fenugreek Leaf (Kasuri Methi)', 'Mustard Seed (Black)',
          'Mustard Seed (Yellow)', 'Mustard Seed (Brown)', 'Bay Leaf', 'Nutmeg', 'Mace',
          'Star Anise', 'Carom Seeds (Ajwain)', 'Nigella Seeds (Kalonji)', 'White Sesame Seeds',
          'Black Sesame Seeds', 'Poppy Seeds', 'Dry Ginger', 'Dry Garlic', 'Tamarind'
        ],
        'Blended / Mixed Spices': [
          'Garam Masala', 'Generic Curry Masala', 'Chhole Masala', 'Rajma Masala', 'Sabzi Masala',
          'Pav Bhaji Masala', 'Biryani Masala', 'Pulao Masala', 'Meat Masala', 'Chicken Masala',
          'Fish Masala', 'Egg Curry Masala', 'Sambar Masala', 'Rasam Masala', 'Chaat Masala',
          'Pickle Masala', 'Paneer Masala', 'Tandoori Masala', 'BBQ Masala',
          'Regional Punjabi Masala', 'Regional South Indian Masala', 'Regional Bengali Masala',
          'Regional Maharashtrian Masala'
        ],
        'Seasonings & Flavour Mixes': [
          'Snack Seasonings', 'Salad Seasonings', 'Curd / Raita Seasonings', 'Noodle Masala Sachets',
          'Pasta Masala Sachets', 'Pizza Seasonings', 'Pasta Seasonings', 'Peri-Peri Seasonings',
          'Global Cuisine Seasonings'
        ],
        'Spice Derivatives & Extracts': [
          'Curcumin Extract (Retail Packs)', 'Pepper Extract (Retail Packs)',
          'Mixed Spice Drops / Concentrates'
        ]
      },
        'Home-Based / Micro Food Businesses': {
          'Single / Individual Spices': [
            'Chilli', 'Turmeric', 'Coriander', 'Cumin', 'Black Pepper', 'Green Cardamom',
          'Clove', 'Cinnamon', 'Bay Leaf', 'Dry Ginger', 'Dry Garlic'
        ],
        'Blended / Mixed Spices': [
          'Bulk Curry Masala Blends', 'Bulk Biryani Masala Blends', 'Bulk Tandoori Masala Blends',
          'Bulk Chaat Masala Blends', 'Custom House-Recipe Masala Blends'
        ],
        'Seasonings & Flavour Mixes': [
          'Tiffin Meal Seasonings', 'Home-Catering Snack Seasonings', 'Cloud-Kitchen Signature Seasonings'
        ],
        'Spice Derivatives & Extracts': [
          'Chilli Oleoresin (Small Packs)', 'Turmeric Extract (Small Packs)',
          'Mixed Spice Concentrates for Signature Gravies'
        ]
      }
    }
    }
  }
  
  // Generate records for value and volume
  const valueRecords: DataRecord[] = []
  const volumeRecords: DataRecord[] = []
  
  // Get all segment types from dimensions
  const segmentTypes = dimensionsData.dimensions.segments
  
  // Generate data for each geography
  geographies.all_geographies.forEach((geography: string) => {
    const geographyLevel: 'global' | 'region' | 'country' = 
      geography === 'India' ? 'global' :
      geographies.regions.includes(geography) ? 'region' : 'country'
    
    const parentGeography = 
      geography === 'India' ? null :
      geographies.regions.includes(geography) ? 'India' :
      Object.entries(geographies.countries).find(([_, states]) => {
        return Array.isArray(states) && states.includes(geography)
      })?.[0] || null
    
    // Generate data for each segment type
    Object.entries(segmentTypes).forEach(([segmentType, segmentDef]) => {
      if (!segmentDef) return
      const typedSegmentDef = segmentDef as SegmentDimension
      
      if (segmentType === 'By End-Use*Product Type') {
        // Handle "By End-Use*Product Type" - use segmentation structure
        if (segmentationStructure && segmentationStructure.B2B && segmentationStructure.B2C) {
          const b2bLeaves = getAllLeafSegments(segmentationStructure.B2B as SegmentationStructure, ['B2B'], 'B2B')
          const b2cLeaves = getAllLeafSegments(segmentationStructure.B2C as SegmentationStructure, ['B2C'], 'B2C')
          const allLeaves = [...b2bLeaves, ...b2cLeaves]
          
          // Debug: Log total leaves found
          if (typeof window !== 'undefined' && geography === 'Delhi') {
            console.log(`📊 Generated ${allLeaves.length} leaf segments for ${geography}`)
            // Log a sample of segments to verify deep nesting is captured
            const sampleSegments = allLeaves
              .filter(l => l.fullPath.includes('Tandoori') || l.fullPath.includes('Meat & Poultry'))
              .slice(0, 5)
            if (sampleSegments.length > 0) {
              console.log('📊 Sample deep nested segments:', sampleSegments.map(s => s.fullPath))
            }
          }
          
          allLeaves.forEach(({ path, fullPath, hierarchy }) => {
            // Value data
            const valueRecord = generateDataRecord(
              geography,
              geographyLevel,
              parentGeography,
              path,
              fullPath,
              hierarchy,
              metadata.base_year,
              metadata.forecast_year,
              years,
              true, // isValue
              segmentType
            )
            valueRecords.push(valueRecord)
            
            // Volume data
            const volumeRecord = generateDataRecord(
              geography,
              geographyLevel,
              parentGeography,
              path,
              fullPath,
              hierarchy,
              metadata.base_year,
              metadata.forecast_year,
              years,
              false, // isValue
              segmentType
            )
            volumeRecords.push(volumeRecord)
          })
        }
      } else if (typedSegmentDef.type === 'flat' && typedSegmentDef.items && Array.isArray(typedSegmentDef.items)) {
        // Handle flat structures (By Nature, By Form, By Packaging Format)
        typedSegmentDef.items.forEach((item: string) => {
          if (!item) return
          
          const hierarchy: SegmentHierarchy = {
            level_1: '',
            level_2: '',
            level_3: '',
            level_4: item
          }
          
          // Generate for both B2B and B2C
          const businessTypes = ['B2B', 'B2C']
          businessTypes.forEach(businessType => {
            // Value data
            const valueRecord = generateDataRecord(
              geography,
              geographyLevel,
              parentGeography,
              [item],
              item,
              hierarchy,
              metadata.base_year,
              metadata.forecast_year,
              years,
              true, // isValue
              segmentType,
              businessType
            )
            valueRecords.push(valueRecord)
            
            // Volume data
            const volumeRecord = generateDataRecord(
              geography,
              geographyLevel,
              parentGeography,
              [item],
              item,
              hierarchy,
              metadata.base_year,
              metadata.forecast_year,
              years,
              false, // isValue
              segmentType,
              businessType
            )
            volumeRecords.push(volumeRecord)
          })
        })
      } else if (typedSegmentDef.type === 'hierarchical' && typedSegmentDef.hierarchy) {
        // Handle hierarchical structures (By Distribution Channel)
        // Convert hierarchy to structure and get all leaves
        const hierarchyStructure = convertHierarchyToStructureForData(typedSegmentDef.hierarchy)
        
        // Get all leaf segments from hierarchy
        const getAllLeavesFromHierarchy = (
          structure: SegmentationStructure,
          path: string[] = []
        ): Array<{ path: string[], fullPath: string, hierarchy: SegmentHierarchy }> => {
          const leaves: Array<{ path: string[], fullPath: string, hierarchy: SegmentHierarchy }> = []
          
          Object.keys(structure).forEach(key => {
            const value = structure[key]
            const newPath = [...path, key]
            
            if (Array.isArray(value)) {
              // Leaf items
              value.forEach(item => {
                const fullPath = [...newPath, item].join(' > ')
                const hierarchy: SegmentHierarchy = {
                  level_1: newPath[0] || '',
                  level_2: newPath[1] || '',
                  level_3: newPath[2] || '',
                  level_4: item || ''
                }
                leaves.push({ path: [...newPath, item], fullPath, hierarchy })
              })
            } else if (typeof value === 'object' && value !== null) {
              // Recursive
              const nestedLeaves = getAllLeavesFromHierarchy(value as SegmentationStructure, newPath)
              leaves.push(...nestedLeaves)
            }
          })
          
          return leaves
        }
        
        const hierarchyLeaves = getAllLeavesFromHierarchy(hierarchyStructure)
        
        hierarchyLeaves.forEach(({ path, fullPath, hierarchy }) => {
          // Value data
          const valueRecord = generateDataRecord(
            geography,
            geographyLevel,
            parentGeography,
            path,
            fullPath,
            hierarchy,
            metadata.base_year,
            metadata.forecast_year,
            years,
            true, // isValue
            segmentType
          )
          valueRecords.push(valueRecord)
          
          // Volume data
          const volumeRecord = generateDataRecord(
            geography,
            geographyLevel,
            parentGeography,
            path,
            fullPath,
            hierarchy,
            metadata.base_year,
            metadata.forecast_year,
            years,
            false, // isValue
            segmentType
          )
          volumeRecords.push(volumeRecord)
        })
      }
    })
  })
  
  // Normalize market shares by segment type
  const segmentTypeGroups = new Map<string, DataRecord[]>()
  valueRecords.forEach(record => {
    const key = record.segment_type
    if (!segmentTypeGroups.has(key)) {
      segmentTypeGroups.set(key, [])
    }
    segmentTypeGroups.get(key)!.push(record)
  })
  
  segmentTypeGroups.forEach((records) => {
    normalizeMarketShares(records, metadata.forecast_year)
  })
  
  const volumeSegmentTypeGroups = new Map<string, DataRecord[]>()
  volumeRecords.forEach(record => {
    const key = record.segment_type
    if (!volumeSegmentTypeGroups.has(key)) {
      volumeSegmentTypeGroups.set(key, [])
    }
    volumeSegmentTypeGroups.get(key)!.push(record)
  })
  
  volumeSegmentTypeGroups.forEach((records) => {
    normalizeMarketShares(records, metadata.forecast_year)
  })
  
  // Verify data generation - log summary
  if (typeof window !== 'undefined') {
    const uniqueSegments = new Set(valueRecords.map(r => r.segment))
    console.log(`✅ Data Generation Complete:`)
    console.log(`   - Total value records: ${valueRecords.length}`)
    console.log(`   - Total volume records: ${volumeRecords.length}`)
    console.log(`   - Unique segments: ${uniqueSegments.size}`)
    
    // Check for specific deep nested segments
    const tandooriSegments = Array.from(uniqueSegments).filter(s => 
      s.includes('Tandoori') && s.includes('Marinade')
    )
    if (tandooriSegments.length > 0) {
      console.log(`   - Tandoori Marinade segments found: ${tandooriSegments.length}`)
      tandooriSegments.forEach(s => console.log(`     - ${s}`))
    } else {
      console.warn(`   ⚠️ No Tandoori Marinade segments found in generated data!`)
    }
  }
  
  return {
    metadata,
    dimensions: dimensionsData.dimensions,
    data: {
      value: {
        geography_segment_matrix: valueRecords
      },
      volume: {
        geography_segment_matrix: volumeRecords
      }
    }
  }
}

