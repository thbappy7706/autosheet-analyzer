/**
 * Renders a container holding an SVG chart to a PNG and triggers a download.
 * Bangla glyphs render correctly because the SVG is rasterised through an
 * <img> with the same web fonts loaded in the document.
 */
export async function exportContainerToPng(container: HTMLElement, filename: string): Promise<void> {
  const svg = container.querySelector('svg')
  if (!svg) throw new Error('No chart found to export')

  const width = svg.clientWidth || svg.viewBox.baseVal.width || 800
  const height = svg.clientHeight || svg.viewBox.baseVal.height || 400

  const clone = svg.cloneNode(true) as SVGSVGElement
  clone.setAttribute('width', String(width))
  clone.setAttribute('height', String(height))
  clone.setAttribute('xmlns', 'http://www.w3.org/2000/svg')

  // Inline the computed font so Bangla text rasterises with the right family.
  const computed = window.getComputedStyle(container)
  clone.style.fontFamily = computed.fontFamily

  const xml = new XMLSerializer().serializeToString(clone)
  const svgBlob = new Blob([xml], { type: 'image/svg+xml;charset=utf-8' })
  const url = URL.createObjectURL(svgBlob)

  try {
    const img = await loadImage(url)
    const scale = 2 // export at 2x for crispness
    const canvas = document.createElement('canvas')
    canvas.width = width * scale
    canvas.height = height * scale
    const ctx = canvas.getContext('2d')
    if (!ctx) throw new Error('Canvas 2D context unavailable')

    // Match the card background so the PNG is not transparent.
    const bg = window.getComputedStyle(document.documentElement).getPropertyValue('--fallback-b1').trim()
    ctx.fillStyle = bg ? `hsl(${bg})` : '#ffffff'
    ctx.fillRect(0, 0, canvas.width, canvas.height)
    ctx.scale(scale, scale)
    ctx.drawImage(img, 0, 0, width, height)

    await new Promise<void>((resolve, reject) => {
      canvas.toBlob((blob) => {
        if (!blob) {
          reject(new Error('Could not create PNG'))
          return
        }
        const pngUrl = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = pngUrl
        a.download = filename
        a.click()
        URL.revokeObjectURL(pngUrl)
        resolve()
      }, 'image/png')
    })
  } finally {
    URL.revokeObjectURL(url)
  }
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve(img)
    img.onerror = () => reject(new Error('Could not rasterise the chart'))
    img.src = src
  })
}

/** Turns a title into a safe file name. */
export function toFileName(title: string, prefix = 'chart'): string {
  const slug = title
    .toLowerCase()
    .replace(/[^a-z0-9\u0980-\u09FF]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60)
  return `${prefix}-${slug || 'export'}.png`
}
