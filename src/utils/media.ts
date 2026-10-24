import type { MediaAsset, MediaVariantName } from '@/types/media'

/**
 * Pick the smallest Cloudinary rendition that covers the rendered width at the
 * device pixel ratio, so grids never download originals (contract §1.8).
 */
const VARIANT_WIDTHS: [MediaVariantName, number][] = [
  ['thumbnail', 160],
  ['small', 320],
  ['medium', 640],
  ['large', 1440],
]

export function variantFor(cssWidth: number, dpr = typeof window !== 'undefined' ? window.devicePixelRatio || 1 : 2): MediaVariantName {
  const needed = cssWidth * Math.min(dpr, 3)
  for (const [name, width] of VARIANT_WIDTHS) if (width >= needed) return name
  return 'large'
}

export function mediaUrl(asset: MediaAsset | null | undefined, variant: MediaVariantName = 'medium'): string | null {
  if (!asset) return null
  const order: MediaVariantName[] = [variant, 'medium', 'small', 'large', 'thumbnail', 'original']
  for (const name of order) {
    const url = asset.variants?.[name]
    if (url) return url
  }
  return asset.secureUrl || asset.url || null
}

/** srcset from named variants (when `sources` are absent). */
export function mediaSrcset(asset: MediaAsset | null | undefined): string | undefined {
  if (!asset?.variants) return undefined
  const parts = VARIANT_WIDTHS.flatMap(([name, width]) => (asset.variants?.[name] ? [`${asset.variants[name]} ${width}w`] : []))
  return parts.length ? parts.join(', ') : undefined
}

export function aspectRatio(asset: MediaAsset | null | undefined, fallback = 1): number {
  if (!asset?.width || !asset.height) return fallback
  return asset.width / asset.height
}
