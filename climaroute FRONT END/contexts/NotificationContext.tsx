import React, { createContext, useContext, useState, useRef } from 'react';
import { playVoiceAlert } from '../utils/voiceAlert';
import { useLanguage } from '../contexts/LanguageContext';
import { getCurrentUser } from '../services/apiservice';

export type AlertType = 'WEATHER_ALERT' | 'BREAK_ALERT' | 'SYSTEM_ALERT';
export type Notification = {
  id: string;
  type: AlertType;
  title: string;
  message: string;
  message_en?: string;
  message_ta?: string;
  timestamp: string;
  voice?: boolean;
  lang?: string;
  severity?: string;
};

type NotificationContextType = {
  notifications: Notification[];
  addNotification: (alert: Omit<Notification, 'id' | 'timestamp'>) => void;
};

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export const NotificationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const { lang } = useLanguage();
  const isAdmin = getCurrentUser().role === 'admin';

  // Cooldown keys
  const WEATHER_KEY = 'lastWeatherAlert';
  const BREAK_KEY = 'breakAlertPlayed';

  const addNotification = (alert: Omit<Notification, 'id' | 'timestamp'> & { voice?: boolean, lang?: string, message_en?: string, message_ta?: string }) => {
    if (isAdmin) return; // Admin exclusion

    // Weather Alert: 1-hour cooldown
    if (alert.type === 'WEATHER_ALERT') {
      const last = localStorage.getItem(WEATHER_KEY);
      if (last && Date.now() - Number(last) < 60 * 60 * 1000) return; // 1 hour
      localStorage.setItem(WEATHER_KEY, Date.now().toString());
    }

    // Break Alert: once per session
    if (alert.type === 'BREAK_ALERT') {
      if (sessionStorage.getItem(BREAK_KEY)) return;
      sessionStorage.setItem(BREAK_KEY, '1');
    }

    // Prevent duplicate notification
    setNotifications((prev) => {
      if (prev.some(n => n.type === alert.type && n.message === alert.message)) return prev;
      const newAlert: Notification = {
        ...alert,
        id: `${alert.type}_${Date.now()}`,
        timestamp: new Date().toISOString(),
        lang: alert.lang || lang,
        message_en: alert.message_en,
        message_ta: alert.message_ta,
      };
      return [newAlert, ...prev];
    });
  };

  // Expose a triggerIdleAlert for idle time notifications
  const triggerIdleAlert = (alert: { id: string, type: string, message: string, timestamp: string, role: string, voice: boolean }) => {
    // Only add to user notifications if role is user
    if (alert.role === 'user') {
      const idleMessages = {
        en: "Your idle time has exceeded the allowed limit. A notification has been sent to admin.",
        ta: "உங்கள் ஓய்வு நேரம் அனுமதிக்கப்பட்ட வரம்பை மீறியுள்ளது. நிர்வாகிக்கு அறிவிப்பு அனுப்பப்பட்டுள்ளது."
      };
      addNotification({
        type: 'SYSTEM_ALERT',
        title: lang === 'ta' ? 'இட்ல் நேரம் மீறல்' : 'Idle Time Exceeded',
        message: alert.message,
        message_en: idleMessages.en,
        message_ta: idleMessages.ta,
        severity: 'IDLE_ALERT',
        voice: alert.voice,
        lang: lang,
      });
    }
    // Admin notification is handled elsewhere (not shown to user)
  };

  return (
    <NotificationContext.Provider value={{ notifications, addNotification, triggerIdleAlert }}>
      {children}
    </NotificationContext.Provider>
  );
};

export function useNotification() {
  const ctx = useContext(NotificationContext);
  if (!ctx) throw new Error('useNotification must be used within NotificationProvider');
  return ctx;
}
