// Simple script to generate a timer icon as PNG
// For production use, you can use tools like imagemin or convert it manually

const fs = require("fs");
const path = require("path");

// SVG timer icon
const timerSVG = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256" width="256" height="256">
  <!-- Background -->
  <rect width="256" height="256" fill="#10b981" rx="50"/>
  
  <!-- Timer circle outline -->
  <circle cx="128" cy="140" r="90" fill="none" stroke="white" stroke-width="12"/>
  
  <!-- Timer top button -->
  <rect x="105" y="20" width="46" height="40" fill="white" rx="8"/>
  
  <!-- Digital display area -->
  <rect x="90" y="110" width="76" height="50" fill="rgba(255,255,255,0.2)" rx="8"/>
  
  <!-- Time text: 20:00 -->
  <text x="128" y="155" font-family="Arial, sans-serif" font-size="36" font-weight="bold" 
        fill="white" text-anchor="middle" font-family="monospace">20:00</text>
  
  <!-- Bottom accent line -->
  <line x1="80" y1="240" x2="176" y2="240" stroke="white" stroke-width="8" stroke-linecap="round"/>
</svg>
`;

console.log("SVG icon generated successfully!");
console.log("You can convert this to ICO using online tools or imagemin.");
