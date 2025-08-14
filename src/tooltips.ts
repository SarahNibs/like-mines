/**
 * Tooltip system for displaying hover information
 */

// Detector hover tooltip element
let detectorTooltip: HTMLElement | null = null
// General item/upgrade tooltip element
let itemTooltip: HTMLElement | null = null

// Create detector tooltip if it doesn't exist
function createDetectorTooltip(): HTMLElement {
  if (!detectorTooltip) {
    detectorTooltip = document.createElement('div')
    detectorTooltip.style.position = 'absolute'
    detectorTooltip.style.background = 'rgba(0, 0, 0, 0.9)'
    detectorTooltip.style.color = '#fff'
    detectorTooltip.style.padding = '8px'
    detectorTooltip.style.borderRadius = '4px'
    detectorTooltip.style.fontSize = '12px'
    detectorTooltip.style.fontFamily = 'Courier New, monospace'
    detectorTooltip.style.pointerEvents = 'none'
    detectorTooltip.style.zIndex = '1000'
    detectorTooltip.style.display = 'none'
    detectorTooltip.style.border = '1px solid #666'
    document.body.appendChild(detectorTooltip)
  }
  return detectorTooltip
}

// Show detector tooltip
export function showDetectorTooltip(x: number, y: number, playerCount: number, opponentCount: number, neutralCount: number): void {
  const tooltip = createDetectorTooltip()
  tooltip.innerHTML = `Detector Scan (this tile and adjacent):<br/>Player tiles: ${playerCount}<br/>Opponent tiles: ${opponentCount}<br/>Neutral tiles: ${neutralCount}`
  tooltip.style.left = `${x + 10}px`
  tooltip.style.top = `${y - 10}px`
  tooltip.style.display = 'block'
}

// Hide detector tooltip
export function hideDetectorTooltip(): void {
  if (detectorTooltip) {
    detectorTooltip.style.display = 'none'
  }
}

// Create item tooltip if it doesn't exist
function createItemTooltip(): HTMLElement {
  if (!itemTooltip) {
    itemTooltip = document.createElement('div')
    itemTooltip.style.position = 'absolute'
    itemTooltip.style.background = 'rgba(0, 0, 0, 0.9)'
    itemTooltip.style.color = '#fff'
    itemTooltip.style.padding = '8px'
    itemTooltip.style.borderRadius = '4px'
    itemTooltip.style.fontSize = '12px'
    itemTooltip.style.fontFamily = 'Courier New, monospace'
    itemTooltip.style.pointerEvents = 'none'
    itemTooltip.style.zIndex = '1000'
    itemTooltip.style.display = 'none'
    itemTooltip.style.border = '1px solid #666'
    itemTooltip.style.maxWidth = '200px'
    document.body.appendChild(itemTooltip)
  }
  return itemTooltip
}

// Show item tooltip
export function showItemTooltip(x: number, y: number, title: string, description: string): void {
  const tooltip = createItemTooltip()
  tooltip.innerHTML = `<strong>${title}</strong><br/>${description}`
  tooltip.style.left = `${x + 10}px`
  tooltip.style.top = `${y - 10}px`
  tooltip.style.display = 'block'
}

// Hide item tooltip
export function hideItemTooltip(): void {
  if (itemTooltip) {
    itemTooltip.style.display = 'none'
  }
}