/**
 * Test script to verify preset filter calculations
 */

const fs = require('fs');
const path = require('path');

const dataPath = path.join(__dirname, '../public/jsons/india-spices-dimensions.json');
const data = JSON.parse(fs.readFileSync(dataPath, 'utf8'));
const records = data.data.value.geography_segment_matrix;
const year = 2024;

console.log('=== Testing Preset Filter Calculations ===\n');

// Top Markets: Top 3 regions by 2024 market value
const regionTotals = new Map();
records.filter(r => r.geography_level === 'region').forEach(r => {
  const value = r.time_series[year] || 0;
  const currentTotal = regionTotals.get(r.geography) || 0;
  regionTotals.set(r.geography, currentTotal + value);
});

const sortedRegions = Array.from(regionTotals.entries()).sort((a, b) => b[1] - a[1]);
console.log('🏆 TOP MARKETS (by 2024 value):');
sortedRegions.forEach(([region, value]) => {
  console.log(`  ${region}: ${value.toFixed(2)} Cr.`);
});
const topMarkets = sortedRegions.slice(0, 3).map(([region]) => region);
console.log(`\nSelected: ${topMarkets.join(', ')}\n`);

// Growth Leaders: Top 2 regions by average CAGR
const regionCAGRs = new Map();
records.filter(r => r.geography_level === 'region').forEach(r => {
  if (r.cagr) {
    const cagrs = regionCAGRs.get(r.geography) || [];
    cagrs.push(r.cagr);
    regionCAGRs.set(r.geography, cagrs);
  }
});

const avgCAGRs = Array.from(regionCAGRs.entries())
  .map(([region, cagrs]) => ({
    region,
    avgCAGR: cagrs.reduce((a, b) => a + b, 0) / cagrs.length
  }))
  .sort((a, b) => b.avgCAGR - a.avgCAGR);

console.log('📈 GROWTH LEADERS (by avg CAGR):');
avgCAGRs.forEach(item => {
  console.log(`  ${item.region}: ${item.avgCAGR.toFixed(2)}%`);
});
const growthLeaders = avgCAGRs.slice(0, 2).map(item => item.region);
console.log(`\nSelected: ${growthLeaders.join(', ')}\n`);

// Emerging Markets: Top 5 countries by average CAGR
const countryCAGRs = new Map();
records.filter(r => r.geography_level === 'country').forEach(r => {
  if (r.cagr) {
    const cagrs = countryCAGRs.get(r.geography) || [];
    cagrs.push(r.cagr);
    countryCAGRs.set(r.geography, cagrs);
  }
});

const avgCountryCAGRs = Array.from(countryCAGRs.entries())
  .map(([country, cagrs]) => ({
    country,
    avgCAGR: cagrs.reduce((a, b) => a + b, 0) / cagrs.length
  }))
  .sort((a, b) => b.avgCAGR - a.avgCAGR)
  .slice(0, 5);

console.log('🌟 EMERGING MARKETS (top 5 countries by avg CAGR):');
avgCountryCAGRs.forEach(item => {
  console.log(`  ${item.country}: ${item.avgCAGR.toFixed(2)}%`);
});
const emergingMarkets = avgCountryCAGRs.map(item => item.country);
console.log(`\nSelected: ${emergingMarkets.join(', ')}\n`);

// Test if segments exist for these geographies
console.log('=== Testing Segment Availability ===\n');

function testGeographySegments(geographies, label) {
  console.log(`${label}:`);
  geographies.forEach(geo => {
    const geoRecords = records.filter(r => r.geography === geo && r.segment.startsWith('B2B'));
    const uniqueSegments = [...new Set(geoRecords.map(r => r.segment))];
    console.log(`  ${geo}: ${uniqueSegments.length} unique B2B segments`);
    if (uniqueSegments.length > 0) {
      console.log(`    Sample: ${uniqueSegments[0]}`);
    }
  });
  console.log('');
}

testGeographySegments(topMarkets, '🏆 Top Markets');
testGeographySegments(growthLeaders, '📈 Growth Leaders');
testGeographySegments(emergingMarkets, '🌟 Emerging Markets');
