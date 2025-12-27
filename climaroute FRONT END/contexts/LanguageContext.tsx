import React, { createContext, useContext, useState, useEffect } from "react";
import en from "../locales/en.json";
import ta from "../locales/ta.json";
import { fetchAndCacheTranslation } from "../utils/translate";

const translations: Record<string, Record<string, string>> = { en, ta };

type LanguageContextType = {
  language: "en" | "ta";
  setLanguage: (lang: "en" | "ta") => void;
  t: (key: string) => string;
};

const LanguageContext = createContext<LanguageContextType>({
  language: "en",
  setLanguage: () => {},
  t: (key) => key,
});

export const LanguageProvider: React.FC<{ initialLanguage?: "en" | "ta"; children: React.ReactNode }> = ({ children, initialLanguage = "en" }) => {
  // Try to load from localStorage, fallback to initialLanguage
  const getInitialLang = () => {
    const stored = typeof window !== 'undefined' ? localStorage.getItem('clima_language') : null;
    return (stored === 'en' || stored === 'ta') ? stored : initialLanguage;
  };
  const [language, setLanguageState] = useState<"en" | "ta">(getInitialLang());
  const [dict, setDict] = useState(translations[language]);

  useEffect(() => {
    setDict(translations[language]);
    // Save to localStorage whenever language changes
    if (typeof window !== 'undefined') {
      localStorage.setItem('clima_language', language);
    }
  }, [language]);

  // Setter that also saves to localStorage
  const setLanguage = (lang: "en" | "ta") => {
    setLanguageState(lang);
    if (typeof window !== 'undefined') {
      localStorage.setItem('clima_language', lang);
    }
  };

  const t = (key: string) => {
    if (dict[key]) return dict[key];
    if (language === "ta") {
      fetchAndCacheTranslation(key, "ta").then((translated) => {
        setDict((prev) => ({ ...prev, [key]: translated }));
      });
    }
    return key;
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => useContext(LanguageContext);
