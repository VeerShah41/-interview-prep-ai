'use client';

import { useState, useRef, useCallback } from 'react';

interface UseSpeechSynthesisReturn {
  speak: (text: string) => Promise<void>;
  stop: () => void;
  isSpeaking: boolean;
  isSupported: boolean;
}

export function useSpeechSynthesis(): UseSpeechSynthesisReturn {
  const [isSpeaking, setIsSpeaking] = useState(false);
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);
  const isSupported = typeof window !== 'undefined' && 'speechSynthesis' in window;

  const speak = useCallback(
    (text: string): Promise<void> => {
      return new Promise((resolve, reject) => {
        if (!isSupported) {
          reject(new Error('Speech synthesis not supported'));
          return;
        }

        const play = () => {
          // Cancel any ongoing speech
          window.speechSynthesis.cancel();

          const utterance = new SpeechSynthesisUtterance(text);
          utterance.rate = 1.15;
          utterance.pitch = 1.1;
          utterance.volume = 1.0;
          utterance.lang = 'en-US';

          // Try to use a consistent natural-sounding female voice
          const voices = window.speechSynthesis.getVoices();
          const preferredVoices = voices.filter(
            (v) =>
              v.lang.startsWith('en') &&
              (v.name.includes('Samantha') ||
                v.name.includes('Victoria') ||
                v.name.includes('Karen') ||
                v.name.includes('Google UK English Female') ||
                v.name.includes('Google US English') ||
                v.name.includes('Zira'))
          );

          if (preferredVoices.length > 0) {
            utterance.voice = preferredVoices[0];
          } else {
            const englishVoices = voices.filter((v) => v.lang.startsWith('en'));
            if (englishVoices.length > 0) {
              utterance.voice = englishVoices[0];
            }
          }

          utterance.onstart = () => {
            setIsSpeaking(true);
          };

          utterance.onend = () => {
            setIsSpeaking(false);
            resolve();
          };

          utterance.onerror = (event) => {
            setIsSpeaking(false);
            if (event.error === 'canceled' || event.error === 'interrupted') {
              resolve();
            } else {
              reject(new Error(`Speech synthesis error: ${event.error}`));
            }
          };

          utteranceRef.current = utterance;
          window.speechSynthesis.speak(utterance);
        };

        if (window.speechSynthesis.getVoices().length === 0) {
          window.speechSynthesis.onvoiceschanged = () => {
            window.speechSynthesis.onvoiceschanged = null;
            play();
          };
        } else {
          play();
        }
      });
    },
    [isSupported]
  );

  const stop = useCallback(() => {
    if (isSupported) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
    }
  }, [isSupported]);

  return {
    speak,
    stop,
    isSpeaking,
    isSupported,
  };
}
