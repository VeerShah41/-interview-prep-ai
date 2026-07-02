'use client';

import { useState, useEffect } from 'react';

type DifficultyLevel = 'easy' | 'intermediate' | 'master';

interface Settings {
  customApiKey: string;
  preferredModel: string;
  difficultyLevel: DifficultyLevel;
}

const DEFAULT_SETTINGS: Settings = {
  customApiKey: '',
  preferredModel: 'llama-3.3-70b-versatile',
  difficultyLevel: 'intermediate',
};

export function useSettings() {
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    try {
      const stored = localStorage.getItem('mentorq_settings');
      if (stored) {
        setSettings(JSON.parse(stored));
      }
    } catch {
      // ignore
    }
    setLoaded(true);
  }, []);

  const updateSettings = (newSettings: Partial<Settings>) => {
    const updated = { ...settings, ...newSettings };
    setSettings(updated);
    localStorage.setItem('mentorq_settings', JSON.stringify(updated));
  };

  return { settings, updateSettings, loaded };
}
