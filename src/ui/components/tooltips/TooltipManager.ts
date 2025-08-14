/**
 * TooltipManager - Handles all tooltip creation, display, and hiding
 * Extracted from main.ts to improve code organization
 */

export class TooltipManager {
  private detectorTooltip: HTMLElement | null = null
  private itemTooltip: HTMLElement | null = null

  /**
   * Create detector tooltip if it doesn't exist
   */
  private createDetectorTooltip(): HTMLElement {
    if (!this.detectorTooltip) {
      this.detectorTooltip = document.createElement('div')
      this.detectorTooltip.style.cssText = `
        position: absolute;
        background: rgba(0, 0, 0, 0.9);
        color: white;
        padding: 8px;
        border-radius: 4px;
        font-size: 12px;
        z-index: 1000;
        display: none;
        pointer-events: none;
        border: 1px solid #444;
        font-family: 'Courier New', monospace;
        line-height: 1.4;
      `
      document.body.appendChild(this.detectorTooltip)
    }
    return this.detectorTooltip
  }

  /**
   * Create item tooltip if it doesn't exist
   */
  private createItemTooltip(): HTMLElement {
    if (!this.itemTooltip) {
      this.itemTooltip = document.createElement('div')
      this.itemTooltip.style.cssText = `
        position: absolute;
        background: rgba(0, 0, 0, 0.9);
        color: white;
        padding: 8px;
        border-radius: 4px;
        font-size: 12px;
        z-index: 1000;
        display: none;
        pointer-events: none;
        border: 1px solid #444;
        font-family: 'Courier New', monospace;
        line-height: 1.4;
        max-width: 250px;
      `
      document.body.appendChild(this.itemTooltip)
    }
    return this.itemTooltip
  }

  /**
   * Show detector tooltip with scan results
   */
  showDetectorTooltip(x: number, y: number, playerCount: number, opponentCount: number, neutralCount: number): void {
    const tooltip = this.createDetectorTooltip()
    tooltip.innerHTML = `Detector Scan (this tile and adjacent):<br/>Player tiles: ${playerCount}<br/>Opponent tiles: ${opponentCount}<br/>Neutral tiles: ${neutralCount}`
    tooltip.style.left = `${x + 10}px`
    tooltip.style.top = `${y - 10}px`
    tooltip.style.display = 'block'
  }

  /**
   * Hide detector tooltip
   */
  hideDetectorTooltip(): void {
    if (this.detectorTooltip) {
      this.detectorTooltip.style.display = 'none'
    }
  }

  /**
   * Show item tooltip with title and description
   */
  showItemTooltip(x: number, y: number, title: string, description: string): void {
    const tooltip = this.createItemTooltip()
    tooltip.innerHTML = `<strong>${title}</strong><br/>${description}`
    tooltip.style.left = `${x + 10}px`
    tooltip.style.top = `${y - 10}px`
    tooltip.style.display = 'block'
  }

  /**
   * Hide item tooltip
   */
  hideItemTooltip(): void {
    if (this.itemTooltip) {
      this.itemTooltip.style.display = 'none'
    }
  }

  /**
   * Hide all tooltips
   */
  hideAllTooltips(): void {
    this.hideDetectorTooltip()
    this.hideItemTooltip()
  }

  /**
   * Clean up tooltip elements
   */
  destroy(): void {
    if (this.detectorTooltip) {
      this.detectorTooltip.remove()
      this.detectorTooltip = null
    }
    if (this.itemTooltip) {
      this.itemTooltip.remove()
      this.itemTooltip = null
    }
  }
}

// Create singleton instance for global use
export const tooltipManager = new TooltipManager()