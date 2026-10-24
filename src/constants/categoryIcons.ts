import {
  batteryChargingOutline,
  bookOutline,
  briefcaseOutline,
  cameraOutline,
  desktopOutline,
  documentTextOutline,
  glassesOutline,
  headsetOutline,
  pricetagOutline,
  shirtOutline,
  storefrontOutline,
  watchOutline,
} from 'ionicons/icons'

/** Glyph for a category slug (B1 category circles). Falls back to a price tag. */
const RULES: [RegExp, string][] = [
  [/headset|audio|anr/, headsetOutline],
  [/uniform|apparel|shirt|jacket|epaulet/, shirtOutline],
  [/bag|luggage|case/, briefcaseOutline],
  [/radio|gps|avionic|electronic/, desktopOutline],
  [/manual|book|chart|training/, documentTextOutline],
  [/eyewear|sunglass|glasses/, glassesOutline],
  [/watch|chrono/, watchOutline],
  [/power|batter|charg/, batteryChargingOutline],
  [/photo|camera|print/, cameraOutline],
  [/kneeboard|logbook/, bookOutline],
  [/pilotwardrobe|official|store/, storefrontOutline],
]

export function categoryIcon(slug: string): string {
  for (const [pattern, icon] of RULES) if (pattern.test(slug)) return icon
  return pricetagOutline
}
