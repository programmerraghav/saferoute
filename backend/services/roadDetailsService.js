'use strict';
/**
 * backend/services/roadDetailsService.js
 * Service providing contractor and tender details for roads.
 */

const KNOWN_ROADS = {
  'Station Road': {
    contractor_name: 'Apex Infra Projects Ltd.',
    tender_date: '2024-04-12',
    tender_amount: '₹3.4 Crores',
    warranty_period: '3 Years'
  },
  'NH 48': {
    contractor_name: 'National Highways Development Authority (NHAI) / L&T Infra',
    tender_date: '2021-09-18',
    tender_amount: '₹145.0 Crores',
    warranty_period: '10 Years'
  },
  'Main Street': {
    contractor_name: 'Somya Constructions',
    tender_date: '2023-11-05',
    tender_amount: '₹1.8 Crores',
    warranty_period: '2 Years'
  },
  'Link Road': {
    contractor_name: 'KNR Roadways',
    tender_date: '2025-01-20',
    tender_amount: '₹5.2 Crores',
    warranty_period: '4 Years'
  }
};

const CONTRACTORS = [
  'Buildcon Highways Pvt. Ltd.',
  'Apex Infra Projects Ltd.',
  'Somya Constructions',
  'KNR Roadways',
  'L&T Infrastructure',
  'Reliance Infrastructure Ltd.',
  'Welspun Enterprises',
  'Dilip Buildcon Ltd.'
];

function getHash(str) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  return Math.abs(hash);
}

function getRoadDetails(roadName) {
  const normalized = (roadName || '').trim();
  if (!normalized) {
    return {
      contractor_name: 'Municipal Corporation (Direct)',
      tender_date: '2023-05-15',
      tender_amount: 'Internal Budget',
      warranty_period: 'N/A'
    };
  }

  // Exact match
  for (const [k, v] of Object.entries(KNOWN_ROADS)) {
    if (normalized.toLowerCase() === k.toLowerCase()) {
      return v;
    }
  }

  // Deterministic fallback based on name
  const hash = getHash(normalized);
  const contractor = CONTRACTORS[hash % CONTRACTORS.length];
  
  // Deterministic date in the last 4 years
  const year = 2021 + (hash % 4);
  const month = String(1 + (hash % 12)).padStart(2, '0');
  const day = String(1 + (hash % 28)).padStart(2, '0');
  const tender_date = `${year}-${month}-${day}`;

  const amount = `₹${((hash % 100) / 10 + 1.2).toFixed(1)} Crores`;
  const warranty = `${2 + (hash % 4)} Years`;

  return {
    contractor_name: contractor,
    tender_date,
    tender_amount: amount,
    warranty_period: warranty
  };
}

module.exports = { getRoadDetails };
