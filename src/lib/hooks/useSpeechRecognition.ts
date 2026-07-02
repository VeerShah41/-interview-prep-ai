'use client';

import { useState, useEffect, useRef, useCallback } from 'react';

interface UseSpeechRecognitionReturn {
  isListening: boolean;
  transcript: string;
  interimTranscript: string;
  startListening: () => void;
  stopListening: () => void;
  resetTranscript: () => void;
  isSupported: boolean;
  error: string | null;
}

export function useSpeechRecognition(): UseSpeechRecognitionReturn {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [interimTranscript, setInterimTranscript] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSupported, setIsSupported] = useState(false);
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const transcriptRef = useRef('');
  const isListeningRef = useRef(false);
  // Accumulates final results across recognition restarts
  const accumulatedRef = useRef('');

  useEffect(() => {
    const SpeechRecognitionAPI =
      typeof window !== 'undefined'
        ? window.SpeechRecognition || window.webkitSpeechRecognition
        : null;

    if (SpeechRecognitionAPI) {
      setIsSupported(true);
      const recognition = new SpeechRecognitionAPI();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = 'en-US';
      recognition.maxAlternatives = 1;

      recognition.onresult = (event: SpeechRecognitionEvent) => {
        let interim = '';
        let sessionFinal = '';

        // Process all results from the CURRENT recognition session
        for (let i = 0; i < event.results.length; i++) {
          const result = event.results[i];
          if (result.isFinal) {
            sessionFinal += result[0].transcript + ' ';
          } else {
            interim += result[0].transcript;
          }
        }

        // Build the full transcript: accumulated from previous sessions + current session finals
        if (sessionFinal) {
          // Only update accumulated when we get new final results
          // We rebuild from accumulated + all finals from this session
          const allFinals = accumulatedRef.current + sessionFinal;
          transcriptRef.current = allFinals;
          setTranscript(allFinals.trim());
        }
        setInterimTranscript(interim);
      };

      recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
        if (event.error === 'no-speech' || event.error === 'aborted') {
          return;
        }
        setError(`Speech recognition error: ${event.error}`);
        setIsListening(false);
        isListeningRef.current = false;
      };

      recognition.onend = () => {
        if (isListeningRef.current && recognitionRef.current) {
          // Save current finals before restarting so they aren't lost
          accumulatedRef.current = transcriptRef.current;
          try {
            recognitionRef.current.start();
          } catch {
            // Already started, ignore
          }
        } else {
          setIsListening(false);
          isListeningRef.current = false;
        }
      };

      recognitionRef.current = recognition;
    } else {
      setIsSupported(false);
    }

    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.abort();
      }
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const startListening = useCallback(() => {
    if (recognitionRef.current && !isListeningRef.current) {
      setError(null);
      transcriptRef.current = '';
      accumulatedRef.current = '';
      setTranscript('');
      setInterimTranscript('');
      try {
        recognitionRef.current.start();
        setIsListening(true);
        isListeningRef.current = true;
      } catch {
        setError('Failed to start microphone');
      }
    }
  }, []);

  const stopListening = useCallback(() => {
    if (recognitionRef.current && isListeningRef.current) {
      isListeningRef.current = false;
      setIsListening(false);
      recognitionRef.current.stop();
      // Merge any remaining interim into the final transcript
      setInterimTranscript('');
    }
  }, []);

  const resetTranscript = useCallback(() => {
    transcriptRef.current = '';
    accumulatedRef.current = '';
    setTranscript('');
    setInterimTranscript('');
  }, []);

  return {
    isListening,
    transcript,
    interimTranscript,
    startListening,
    stopListening,
    resetTranscript,
    isSupported,
    error,
  };
}
