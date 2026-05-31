const fs = require('fs');
const path = require('path');

const pages = ['Home', 'Login', 'ReportPothole', 'SOS', 'NearbyMap', 'Dashboard', 'AdminPanel'];
fs.mkdirSync('d:/RoadSafety/saferoute/frontend/src/pages', { recursive: true });

pages.forEach(p => {
  const content = `import React from 'react';\n\nexport function ${p}() {\n  return (\n    <div className="section container">\n      <h1 className="heading-lg">${p}</h1>\n      <p>This page is currently being migrated to React.</p>\n    </div>\n  );\n}\n\nexport default ${p};`;
  fs.writeFileSync(`d:/RoadSafety/saferoute/frontend/src/pages/${p}.jsx`, content);
});

const components = ['EmergencyChain', 'HeatmapPanel', 'SeverityMeter', 'TeamSection', 'TicketList', 'ComplaintForm'];
fs.mkdirSync('d:/RoadSafety/saferoute/frontend/src/components', { recursive: true });

components.forEach(c => {
  const content = `import React from 'react';\n\nexport function ${c}() {\n  return <div className="card">${c} (Migrating)</div>;\n}\n\nexport default ${c};`;
  fs.writeFileSync(`d:/RoadSafety/saferoute/frontend/src/components/${c}.jsx`, content);
});

console.log('Dummy files generated.');
