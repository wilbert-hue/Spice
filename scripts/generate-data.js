/**
 * Script to generate realistic sample data for the India Spices Market
 * Run with: node scripts/generate-data.js
 */

const fs = require('fs');
const path = require('path');

// Load the dimensions file
const dimensionsPath = path.join(__dirname, '../public/jsons/india-spices-dimensions.json');
const segmentationPath = path.join(__dirname, '../public/jsons/segmentation-structure.json');

const dimensionsData = JSON.parse(fs.readFileSync(dimensionsPath, 'utf8'));
const segmentationStructure = JSON.parse(fs.readFileSync(segmentationPath, 'utf8'));

// Helper functions
function randomValue(base, variance = 0.3) {
  const min = base * (1 - variance);
  const max = base * (1 + variance);
  return Math.random() * (max - min) + min;
}

function generateTimeSeries(startValue, cagr, years) {
  const timeSeries = {};
  const startYear = years[0];

  years.forEach((year) => {
    const yearsFromStart = year - startYear;
    const growthFactor = Math.pow(1 + cagr / 100, yearsFromStart);
    const variance = 1 + (Math.random() - 0.5) * 0.1;
    timeSeries[year] = Math.max(0, startValue * growthFactor * variance);
  });

  return timeSeries;
}

function getGeographyMultiplier(geography) {
  const multipliers = {
    'India': 10,
    'North India': 2.5,
    'South India': 2.5,
    'East India': 2,
    'West India': 2.5,
    'Delhi': 0.8,
    'Karnataka': 0.8,
    'Maharashtra': 1.0,
    'West Bengal': 0.7,
    'Tamil Nadu': 0.7,
    'Uttar Pradesh': 0.9,
    'Rajasthan': 0.6,
    'Punjab': 0.5,
    'Haryana': 0.5,
    'Gujarat': 0.6,
    'Andhra Pradesh': 0.6
  };
  return multipliers[geography] || 0.4;
}

function getSegmentMultiplier(segmentPath) {
  const lastPart = segmentPath[segmentPath.length - 1]?.toLowerCase() || '';

  if (lastPart.includes('chilli') || lastPart.includes('turmeric') || lastPart.includes('cumin')) {
    return 2.0;
  } else if (lastPart.includes('pepper') || lastPart.includes('coriander')) {
    return 1.5;
  } else if (lastPart.includes('masala') || lastPart.includes('blend')) {
    return 1.2;
  } else if (lastPart.includes('extract') || lastPart.includes('oleoresin')) {
    return 0.6;
  }
  return 1.0;
}

function getAllLeafSegments(structure, path = [], businessType = 'B2B') {
  const leaves = [];

  if (!structure || typeof structure !== 'object') {
    return leaves;
  }

  Object.keys(structure).forEach(key => {
    const value = structure[key];
    const newPath = [...path, key];

    if (Array.isArray(value)) {
      value.forEach(item => {
        const fullPath = [...newPath, item].join(' > ');
        const hierarchy = {
          level_1: businessType,
          level_2: newPath[1] || '',
          level_3: newPath[2] || '',
          level_4: item || ''
        };
        leaves.push({ path: [...newPath, item], fullPath, hierarchy });
      });
    } else if (typeof value === 'object' && value !== null) {
      const nestedLeaves = getAllLeafSegments(value, newPath, businessType);
      leaves.push(...nestedLeaves);
    }
  });

  return leaves;
}

function generateDataRecord(geography, geographyLevel, parentGeography, segmentPath, segmentFullPath, hierarchy, baseYear, forecastYear, years, isValue, segmentType, businessType) {
  const geographyMultiplier = getGeographyMultiplier(geography);
  const segmentMultiplier = getSegmentMultiplier(segmentPath);

  const baseValue = isValue
    ? randomValue(50 * geographyMultiplier * segmentMultiplier, 0.4)
    : randomValue(100 * geographyMultiplier * segmentMultiplier, 0.4);

  const baseCAGR = isValue
    ? randomValue(6, 0.5)
    : randomValue(4, 0.5);

  const cagr = baseCAGR + (Math.random() - 0.5) * 2;
  const timeSeries = generateTimeSeries(baseValue, cagr, years);

  const endValue = timeSeries[forecastYear] || baseValue;

  return {
    geography,
    geography_level: geographyLevel,
    parent_geography: parentGeography,
    segment: segmentFullPath,
    segment_type: segmentType,
    segment_level: 'leaf',
    segment_hierarchy: businessType ? { ...hierarchy, level_1: businessType } : hierarchy,
    time_series: timeSeries,
    cagr: parseFloat(cagr.toFixed(2)),
    market_share: parseFloat((endValue * 100 / (endValue + 1000)).toFixed(2))
  };
}

// Generate data
console.log('🚀 Starting data generation...');

const metadata = dimensionsData.metadata;
const geographies = dimensionsData.dimensions.geographies;
const years = metadata.years;

const valueRecords = [];
const volumeRecords = [];

// Get B2B and B2C leaves
const b2bLeaves = getAllLeafSegments(segmentationStructure.B2B, ['B2B'], 'B2B');
const b2cLeaves = getAllLeafSegments(segmentationStructure.B2C, ['B2C'], 'B2C');
const allLeaves = [...b2bLeaves, ...b2cLeaves];

console.log(`📊 Found ${allLeaves.length} leaf segments (${b2bLeaves.length} B2B + ${b2cLeaves.length} B2C)`);

// Generate data for each geography
geographies.all_geographies.forEach(geography => {
  const geographyLevel =
    geography === 'India' ? 'global' :
    geographies.regions.includes(geography) ? 'region' : 'country';

  const parentGeography =
    geography === 'India' ? null :
    geographies.regions.includes(geography) ? 'India' :
    Object.entries(geographies.countries).find(([_, states]) => states.includes(geography))?.[0] || null;

  allLeaves.forEach(({ path, fullPath, hierarchy }) => {
    // Determine business type from path
    const businessType = path[0];

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
      true,
      'By End-Use*Product Type',
      businessType
    );
    valueRecords.push(valueRecord);

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
      false,
      'By End-Use*Product Type',
      businessType
    );
    volumeRecords.push(volumeRecord);
  });

  console.log(`✅ Generated data for ${geography}: ${allLeaves.length * 2} records`);
});

// Update the dimensions data with generated records
dimensionsData.data = {
  value: {
    geography_segment_matrix: valueRecords
  },
  volume: {
    geography_segment_matrix: volumeRecords
  }
};

// Save the updated file
fs.writeFileSync(dimensionsPath, JSON.stringify(dimensionsData, null, 2));

console.log('\n✅ Data generation complete!');
console.log(`📊 Total value records: ${valueRecords.length}`);
console.log(`📊 Total volume records: ${volumeRecords.length}`);
console.log(`📁 Data saved to: ${dimensionsPath}`);
