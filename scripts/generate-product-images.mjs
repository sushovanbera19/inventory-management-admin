// Generates one illustrated product image (SVG) per demo product into public/products/.
// Run with: node scripts/generate-product-images.mjs
import { mkdirSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import * as icons from 'lucide-react'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const out = join(root, 'public', 'products')
mkdirSync(out, { recursive: true })

// SKU -> [icon name, accent colour]. SKUs match src/api/mock/seed.js.
const COLORS = { ELE: '#6366f1', OFF: '#f59e0b', FUR: '#8b5cf6', KIT: '#f43f5e', PER: '#ec4899', TOO: '#14b8a6', PAC: '#0ea5e9', SPO: '#10b981' }
const ICONS = {
  ELE: ['Mouse', 'Keyboard', 'Cable', 'Monitor', 'Headphones', 'BatteryCharging', 'Webcam'],
  OFF: ['Files', 'PenLine', 'NotebookPen', 'Paperclip', 'Inbox', 'Highlighter', 'StickyNote'],
  FUR: ['Armchair', 'LampDesk', 'Archive', 'LibraryBig', 'Sofa', 'MonitorUp', 'Footprints'],
  KIT: ['Milk', 'Coffee', 'CookingPot', 'Container', 'Box', 'UtensilsCrossed', 'Soup'],
  PER: ['SprayCan', 'Brush', 'Droplets', 'FlaskConical', 'Bath', 'Scissors', 'Wind'],
  TOO: ['Drill', 'Hammer', 'Ruler', 'Flashlight', 'Hand', 'Wrench', 'Gauge'],
  PAC: ['Package', 'Grip', 'Disc3', 'Mail', 'Cylinder', 'Tags', 'ScrollText'],
  SPO: ['PersonStanding', 'Activity', 'Dumbbell', 'Infinity', 'Backpack', 'Cylinder', 'CupSoda'],
}
const CODES = Object.keys(ICONS)

function iconMarkup(name, color) {
  const Icon = icons[name] ?? icons.Package
  if (!icons[name]) console.warn(`missing icon ${name}, using Package`)
  // Inner SVG content of the lucide icon (24x24 viewBox).
  const svg = renderToStaticMarkup(createElement(Icon, { size: 24, color, strokeWidth: 1.4 }))
  return svg.replace(/^<svg[^>]*>/, '').replace(/<\/svg>$/, '')
}

let count = 0
CODES.forEach((code, categoryIndex) => {
  ICONS[code].forEach((iconName, productIndex) => {
    const sku = `${code}-${String(categoryIndex * 10 + productIndex + 1).padStart(4, '0')}`
    const color = COLORS[code]
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 600" width="600" height="600">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="${color}" stop-opacity="0.10"/>
      <stop offset="1" stop-color="${color}" stop-opacity="0.32"/>
    </linearGradient>
    <radialGradient id="glow" cx="0.5" cy="0.42" r="0.5">
      <stop offset="0" stop-color="#ffffff" stop-opacity="0.95"/>
      <stop offset="1" stop-color="#ffffff" stop-opacity="0"/>
    </radialGradient>
    <filter id="shadow" x="-30%" y="-30%" width="160%" height="160%">
      <feDropShadow dx="0" dy="14" stdDeviation="16" flood-color="${color}" flood-opacity="0.35"/>
    </filter>
  </defs>
  <rect width="600" height="600" fill="#ffffff"/>
  <rect width="600" height="600" fill="url(#bg)"/>
  <circle cx="300" cy="260" r="250" fill="url(#glow)"/>
  <circle cx="470" cy="110" r="70" fill="${color}" opacity="0.08"/>
  <circle cx="110" cy="490" r="90" fill="${color}" opacity="0.07"/>
  <ellipse cx="300" cy="470" rx="150" ry="22" fill="${color}" opacity="0.16"/>
  <rect x="150" y="110" width="300" height="300" rx="72" fill="#ffffff" filter="url(#shadow)"/>
  <g transform="translate(180 140) scale(10)" fill="none" stroke="${color}" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round">${iconMarkup(iconName, color)}</g>
</svg>
`
    writeFileSync(join(out, `${sku}.svg`), svg)
    count += 1
  })
})
console.log(`wrote ${count} images to public/products`)
