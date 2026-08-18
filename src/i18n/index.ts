import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import en from './locales/en.json'
import fr from './locales/fr.json'

const STORAGE_KEY = 'lightning-cafe.lang'

function detectLanguage(): 'fr' | 'en' {
  const stored = localStorage.getItem(STORAGE_KEY)
  if (stored === 'fr' || stored === 'en') {
    return stored
  }

  return navigator.language.toLowerCase().startsWith('fr') ? 'fr' : 'en'
}

void i18n.use(initReactI18next).init({
  resources: {
    en: { translation: en },
    fr: { translation: fr },
  },
  lng: detectLanguage(),
  fallbackLng: 'en',
  interpolation: {
    escapeValue: false,
  },
})

export function setAppLanguage(language: 'fr' | 'en') {
  localStorage.setItem(STORAGE_KEY, language)
  void i18n.changeLanguage(language)
}

export default i18n
