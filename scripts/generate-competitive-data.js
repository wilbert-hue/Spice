/**
 * Script to generate enhanced competitive intelligence data
 * Run with: node scripts/generate-competitive-data.js
 */

const fs = require('fs');
const path = require('path');

// Color palette for companies
const colors = [
  '#52B69A', '#34A0A4', '#D9ED92', '#184E77', '#B5E48C',
  '#1E6091', '#168AAD', '#1A759F', '#99D98C', '#76C893',
  '#40916C', '#2D6A4F', '#081C15', '#52B788', '#95D5B2',
  '#B7E4C7', '#D8F3DC', '#40916C', '#2D6A4F', '#1B4332',
  '#081C15', '#52B788', '#95D5B2', '#B7E4C7', '#D8F3DC',
  '#40916C', '#2D6A4F', '#1B4332', '#081C15', '#52B788'
];

// Company definitions with proper details
const companies = [
  {
    name: "Everest",
    headquarters: "Mumbai, Maharashtra",
    ceo: "Suresh Krishnan",
    yearEstablished: 1967,
    portfolio: "Whole Spices, Ground Spices, Blended Masalas, Spice Mixes",
    strategies: ["Market Expansion", "Product Innovation", "Quality Focus", "Brand Building"],
    regionalStrength: "Pan-India, Export Markets",
    tier: 1
  },
  {
    name: "MDH",
    headquarters: "New Delhi, NCR",
    ceo: "Rajeev Gulati",
    yearEstablished: 1919,
    portfolio: "Traditional Masalas, Blended Spices, Regional Specialties",
    strategies: ["Brand Building", "Traditional Values", "Wide Distribution Network"],
    regionalStrength: "Pan-India, Global Markets",
    tier: 1
  },
  {
    name: "Catch (DS Group)",
    headquarters: "Noida, Uttar Pradesh",
    ceo: "Rajesh Virmani",
    yearEstablished: 1987,
    portfolio: "Spice Mixes, Whole Spices, Premium Blends",
    strategies: ["Digital Marketing", "E-commerce Growth", "Premium Positioning"],
    regionalStrength: "North India, West India",
    tier: 1
  },
  {
    name: "Badshah Masala",
    headquarters: "Mumbai, Maharashtra",
    ceo: "Anil Shah",
    yearEstablished: 1958,
    portfolio: "Traditional Masalas, Spice Blends, Regional Recipes",
    strategies: ["Quality Focus", "Market Expansion", "Product Diversification"],
    regionalStrength: "West India, South India",
    tier: 1
  },
  {
    name: "Tata Sampann (Tata Consumer Products)",
    headquarters: "Mumbai, Maharashtra",
    ceo: "Sunil D'Souza",
    yearEstablished: 2016,
    portfolio: "Premium Spices, Organic Range, Whole Spices",
    strategies: ["Premium Positioning", "Trust Building", "Quality Assurance"],
    regionalStrength: "Pan-India, Premium Segment",
    tier: 1
  },
  {
    name: "Aashirvaad Spices (ITC Foods)",
    headquarters: "Kolkata, West Bengal",
    ceo: "Hemant Malik",
    yearEstablished: 2010,
    portfolio: "Ground Spices, Whole Spices, Masala Blends",
    strategies: ["Integrated Supply Chain", "Quality Focus", "Brand Extension"],
    regionalStrength: "Pan-India, Strong Distribution",
    tier: 1
  },
  {
    name: "Eastern Condiments",
    headquarters: "Kochi, Kerala",
    ceo: "K.P. Poulose",
    yearEstablished: 1976,
    portfolio: "Traditional Kerala Spices, Curry Powders, Spice Blends",
    strategies: ["Regional Expertise", "Export Focus", "Quality Standards"],
    regionalStrength: "South India, Export Markets",
    tier: 2
  },
  {
    name: "Aachi Masala",
    headquarters: "Chennai, Tamil Nadu",
    ceo: "P. Chinnadurai",
    yearEstablished: 1995,
    portfolio: "South Indian Masalas, Curry Powders, Traditional Blends",
    strategies: ["Regional Focus", "E-commerce Growth", "Product Innovation"],
    regionalStrength: "South India, Tamil Nadu",
    tier: 2
  },
  {
    name: "MTR Foods",
    headquarters: "Bangalore, Karnataka",
    ceo: "Sadashiv Nayak",
    yearEstablished: 1924,
    portfolio: "Traditional Masalas, Ready-to-Eat Spices, Regional Specialties",
    strategies: ["Heritage Brand", "Quality Focus", "Product Innovation"],
    regionalStrength: "South India, Export Markets",
    tier: 2
  },
  {
    name: "Sakthi Masala",
    headquarters: "Erode, Tamil Nadu",
    ceo: "S. Mahendran",
    yearEstablished: 1993,
    portfolio: "Traditional Tamil Masalas, Curry Powders, Spice Mixes",
    strategies: ["Regional Dominance", "Quality Focus", "Direct Distribution"],
    regionalStrength: "Tamil Nadu, South India",
    tier: 2
  },
  {
    name: "Suhana (Pravin Masalewale)",
    headquarters: "Mumbai, Maharashtra",
    ceo: "Pravin Parekh",
    yearEstablished: 1983,
    portfolio: "Blended Masalas, Curry Powders, Spice Mixes",
    strategies: ["Affordable Pricing", "Wide Distribution", "Product Range"],
    regionalStrength: "West India, Pan-India",
    tier: 2
  },
  {
    name: "Priya Foods",
    headquarters: "Hyderabad, Telangana",
    ceo: "K. Ramakrishna Rao",
    yearEstablished: 1980,
    portfolio: "Pickles, Spice Pastes, Traditional Masalas",
    strategies: ["Product Diversification", "Regional Strength", "Export Growth"],
    regionalStrength: "South India, Andhra Pradesh",
    tier: 2
  },
  {
    name: "Ramdev Masala",
    headquarters: "Ahmedabad, Gujarat",
    ceo: "Ramesh Patel",
    yearEstablished: 1992,
    portfolio: "Gujarati Masalas, Spice Blends, Regional Specialties",
    strategies: ["Regional Focus", "Quality Assurance", "Competitive Pricing"],
    regionalStrength: "Gujarat, West India",
    tier: 3
  },
  {
    name: "Pushp Masala",
    headquarters: "Indore, Madhya Pradesh",
    ceo: "Vinod Agrawal",
    yearEstablished: 1985,
    portfolio: "Traditional Masalas, Blended Spices, Regional Products",
    strategies: ["Regional Presence", "Value Pricing", "Distribution Network"],
    regionalStrength: "Central India, MP",
    tier: 3
  },
  {
    name: "Goldiee Masale",
    headquarters: "Delhi, NCR",
    ceo: "Sanjay Gupta",
    yearEstablished: 1978,
    portfolio: "North Indian Masalas, Spice Blends, Traditional Recipes",
    strategies: ["Regional Focus", "Product Innovation", "Brand Building"],
    regionalStrength: "North India, Delhi NCR",
    tier: 3
  },
  {
    name: "Sunrise (ITC Foods)",
    headquarters: "Kolkata, West Bengal",
    ceo: "Hemant Malik",
    yearEstablished: 2012,
    portfolio: "Premium Spices, Organic Range, Specialty Blends",
    strategies: ["Premium Positioning", "Quality Focus", "Brand Extension"],
    regionalStrength: "Pan-India, Premium Segment",
    tier: 2
  },
  {
    name: "Shree Krishna Masala",
    headquarters: "Rajkot, Gujarat",
    ceo: "Krishna Patel",
    yearEstablished: 1995,
    portfolio: "Gujarati Masalas, Traditional Blends, Spice Mixes",
    strategies: ["Regional Dominance", "Traditional Recipes", "Value Pricing"],
    regionalStrength: "Gujarat, Saurashtra",
    tier: 3
  },
  {
    name: "Rajesh Masala",
    headquarters: "Jaipur, Rajasthan",
    ceo: "Rajesh Sharma",
    yearEstablished: 1988,
    portfolio: "Rajasthani Masalas, Traditional Spices, Regional Blends",
    strategies: ["Regional Focus", "Traditional Methods", "Quality Control"],
    regionalStrength: "Rajasthan, North India",
    tier: 3
  },
  {
    name: "Annapurna Masala",
    headquarters: "Pune, Maharashtra",
    ceo: "Prakash Kulkarni",
    yearEstablished: 1990,
    portfolio: "Maharashtrian Masalas, Spice Blends, Traditional Products",
    strategies: ["Regional Strength", "Product Quality", "Direct Distribution"],
    regionalStrength: "Maharashtra, Pune Region",
    tier: 3
  },
  {
    name: "Ruchi Masala",
    headquarters: "Surat, Gujarat",
    ceo: "Ruchit Shah",
    yearEstablished: 2000,
    portfolio: "Gujarati Masalas, Spice Mixes, Regional Specialties",
    strategies: ["Competitive Pricing", "Regional Focus", "Product Innovation"],
    regionalStrength: "Gujarat, South Gujarat",
    tier: 3
  },
  {
    name: "Orika",
    headquarters: "Bangalore, Karnataka",
    ceo: "Suresh Nagaraj",
    yearEstablished: 2008,
    portfolio: "Premium Spices, Organic Range, Specialty Blends",
    strategies: ["Premium Positioning", "Organic Focus", "E-commerce Growth"],
    regionalStrength: "South India, Urban Markets",
    tier: 3
  },
  {
    name: "Keya Foods",
    headquarters: "Delhi, NCR",
    ceo: "Atul Gupta",
    yearEstablished: 2005,
    portfolio: "International Spices, Premium Blends, Gourmet Products",
    strategies: ["Premium Positioning", "Product Innovation", "Modern Retail"],
    regionalStrength: "Urban India, Metro Cities",
    tier: 3
  },
  {
    name: "Urban Platter",
    headquarters: "Mumbai, Maharashtra",
    ceo: "Mihir Rajda",
    yearEstablished: 2015,
    portfolio: "Gourmet Spices, International Blends, Premium Products",
    strategies: ["E-commerce Focus", "Premium Positioning", "Digital Marketing"],
    regionalStrength: "Urban India, Online Markets",
    tier: 3
  },
  {
    name: "Organic Tattva",
    headquarters: "Ahmedabad, Gujarat",
    ceo: "Viral Shah",
    yearEstablished: 2010,
    portfolio: "Organic Spices, Natural Products, Health-focused Range",
    strategies: ["Organic Focus", "Health Positioning", "E-commerce Growth"],
    regionalStrength: "Urban India, Health-conscious Segment",
    tier: 4
  },
  {
    name: "24 Mantra Organic",
    headquarters: "Hyderabad, Telangana",
    ceo: "Vijay Kumar",
    yearEstablished: 2004,
    portfolio: "Certified Organic Spices, Natural Products, Health Range",
    strategies: ["Organic Certification", "Export Focus", "Premium Positioning"],
    regionalStrength: "Pan-India, Export Markets",
    tier: 4
  },
  {
    name: "Natureland Organics",
    headquarters: "Bangalore, Karnataka",
    ceo: "Rajesh Krishnan",
    yearEstablished: 2005,
    portfolio: "Organic Spices, Natural Products, Eco-friendly Range",
    strategies: ["Organic Focus", "Sustainability", "E-commerce Growth"],
    regionalStrength: "South India, Urban Markets",
    tier: 4
  },
  {
    name: "Organic India",
    headquarters: "Lucknow, Uttar Pradesh",
    ceo: "Bharat Mitra",
    yearEstablished: 1997,
    portfolio: "Organic Spices, Herbal Products, Wellness Range",
    strategies: ["Organic Certification", "Wellness Focus", "Export Growth"],
    regionalStrength: "Pan-India, Global Markets",
    tier: 4
  },
  {
    name: "Sprig",
    headquarters: "Bangalore, Karnataka",
    ceo: "Manish Gupta",
    yearEstablished: 2016,
    portfolio: "Organic Spices, Premium Blends, Health-focused Products",
    strategies: ["E-commerce Focus", "Premium Positioning", "Digital Marketing"],
    regionalStrength: "Urban India, Online Markets",
    tier: 4
  },
  {
    name: "BB Royal (BigBasket Private Label)",
    headquarters: "Bangalore, Karnataka",
    ceo: "BigBasket Team",
    yearEstablished: 2019,
    portfolio: "Private Label Spices, Value Range, Everyday Products",
    strategies: ["Value Pricing", "E-commerce Exclusive", "Wide Range"],
    regionalStrength: "Urban India, BigBasket Network",
    tier: 4
  },
  {
    name: "Vedaka (Amazon Private Label)",
    headquarters: "Bangalore, Karnataka",
    ceo: "Amazon India Team",
    yearEstablished: 2018,
    portfolio: "Private Label Spices, Value Range, Essential Products",
    strategies: ["Competitive Pricing", "E-commerce Exclusive", "Quality Assurance"],
    regionalStrength: "Pan-India, Amazon Network",
    tier: 4
  }
];

function randomValue(base, variance = 0.3) {
  const min = base * (1 - variance);
  const max = base * (1 + variance);
  return Math.round(Math.random() * (max - min) + min);
}

function generateCompanyId(name) {
  return name
    .toLowerCase()
    .replace(/[()]/g, '')
    .replace(/\s+/g, '-')
    .replace(/--+/g, '-');
}

function generateCompanyData(company, index) {
  // Revenue based on tier
  let baseOverallRevenue, baseSegmentalRevenue, baseMarketShare;

  switch(company.tier) {
    case 1: // Top tier
      baseOverallRevenue = randomValue(950, 0.25);
      baseSegmentalRevenue = randomValue(280, 0.2);
      baseMarketShare = randomValue(5.5, 0.15);
      break;
    case 2: // Mid-high tier
      baseOverallRevenue = randomValue(550, 0.3);
      baseSegmentalRevenue = randomValue(200, 0.25);
      baseMarketShare = randomValue(4.0, 0.2);
      break;
    case 3: // Mid tier
      baseOverallRevenue = randomValue(350, 0.35);
      baseSegmentalRevenue = randomValue(130, 0.3);
      baseMarketShare = randomValue(2.5, 0.25);
      break;
    case 4: // Lower tier
      baseOverallRevenue = randomValue(180, 0.4);
      baseSegmentalRevenue = randomValue(65, 0.35);
      baseMarketShare = randomValue(1.2, 0.3);
      break;
  }

  return {
    id: generateCompanyId(company.name),
    name: company.name,
    headquarters: company.headquarters,
    ceo: company.ceo,
    yearEstablished: company.yearEstablished,
    portfolio: company.portfolio,
    strategies: company.strategies,
    regionalStrength: company.regionalStrength,
    overallRevenue: baseOverallRevenue,
    segmentalRevenue: baseSegmentalRevenue,
    marketShare: parseFloat(baseMarketShare.toFixed(1)),
    color: colors[index % colors.length]
  };
}

console.log('🚀 Generating enhanced competitive intelligence data...');

const companiesData = companies.map((company, index) => generateCompanyData(company, index));

// Sort by market share descending
companiesData.sort((a, b) => b.marketShare - a.marketShare);

// Normalize market shares to total approximately 100%
const totalMarketShare = companiesData.reduce((sum, c) => sum + c.marketShare, 0);
const adjustmentFactor = 100 / totalMarketShare;

companiesData.forEach(company => {
  company.marketShare = parseFloat((company.marketShare * adjustmentFactor).toFixed(1));
});

// Create market share data array
const marketShareData = companiesData.map(company => ({
  company: company.name,
  marketShare: company.marketShare,
  color: company.color
}));

const competitiveData = {
  metadata: {
    market: "India Spices Market",
    year: 2024,
    currency: "INR",
    revenue_unit: "Cr.",
    total_companies: companiesData.length
  },
  companies: companiesData,
  market_share_data: marketShareData
};

// Save to file
const outputPath = path.join(__dirname, '../jsons/competitive-intelligence.json');
const publicOutputPath = path.join(__dirname, '../public/jsons/competitive-intelligence.json');

fs.writeFileSync(outputPath, JSON.stringify(competitiveData, null, 2));
fs.writeFileSync(publicOutputPath, JSON.stringify(competitiveData, null, 2));

console.log('✅ Competitive intelligence data generated successfully!');
console.log(`📊 Total companies: ${companiesData.length}`);
console.log(`📊 Total market share: ${marketShareData.reduce((sum, c) => sum + c.marketShare, 0).toFixed(1)}%`);
console.log(`📁 Data saved to: ${outputPath}`);
console.log(`📁 Data saved to: ${publicOutputPath}`);

// Display top 10 companies
console.log('\n🏆 Top 10 Companies by Market Share:');
companiesData.slice(0, 10).forEach((company, index) => {
  console.log(`${index + 1}. ${company.name}: ${company.marketShare}%`);
});
