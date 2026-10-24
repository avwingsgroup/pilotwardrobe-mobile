import { defineStore } from 'pinia'
import { ref } from 'vue'
import { preferences } from '@/services/preferences'

export type ThemePreference = 'system' | 'light' | 'dark'

const KEYS = {
  theme: 'pw.theme',
  onboarded: 'pw.onboarded',
  recentSearches: 'pw.recentSearches',
} as const

const MAX_RECENT = 8

/** Device-local, non-sensitive preferences. Server-side preferences live on /me. */
export const useSettingsStore = defineStore('settings', () => {
  const theme = ref<ThemePreference>('system')
  const onboarded = ref(false)
  const recentSearches = ref<string[]>([])
  let media: MediaQueryList | null = null

  function applyTheme() {
    const prefersDark = media?.matches ?? false
    const dark = theme.value === 'dark' || (theme.value === 'system' && prefersDark)
    document.documentElement.classList.toggle('ion-palette-dark', dark)
    return dark
  }

  async function load() {
    const [savedTheme, savedOnboarded, savedRecent] = await Promise.all([
      preferences.get<ThemePreference>(KEYS.theme, 'system'),
      preferences.get<boolean>(KEYS.onboarded, false),
      preferences.get<string[]>(KEYS.recentSearches, []),
    ])
    theme.value = savedTheme
    onboarded.value = savedOnboarded
    recentSearches.value = savedRecent
    media = window.matchMedia?.('(prefers-color-scheme: dark)') ?? null
    media?.addEventListener('change', applyTheme)
    applyTheme()
  }

  async function setTheme(next: ThemePreference) {
    theme.value = next
    applyTheme()
    await preferences.set(KEYS.theme, next)
  }

  async function completeOnboarding() {
    onboarded.value = true
    await preferences.set(KEYS.onboarded, true)
  }

  async function addRecentSearch(term: string) {
    const clean = term.trim()
    if (!clean) return
    recentSearches.value = [clean, ...recentSearches.value.filter((t) => t.toLowerCase() !== clean.toLowerCase())].slice(0, MAX_RECENT)
    await preferences.set(KEYS.recentSearches, recentSearches.value)
  }

  async function removeRecentSearch(term: string) {
    recentSearches.value = recentSearches.value.filter((t) => t !== term)
    await preferences.set(KEYS.recentSearches, recentSearches.value)
  }

  /** Recent searches are personal; clear them on sign-out. */
  async function clearUserData() {
    recentSearches.value = []
    await preferences.remove(KEYS.recentSearches)
  }

  return {
    theme,
    onboarded,
    recentSearches,
    load,
    applyTheme,
    setTheme,
    completeOnboarding,
    addRecentSearch,
    removeRecentSearch,
    clearUserData,
  }
})
