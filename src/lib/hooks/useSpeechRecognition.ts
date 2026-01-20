import { useEffect, useRef, useState, useCallback } from 'react';

// TypeScript declarations for Web Speech API
interface SpeechRecognitionEvent extends Event {
  results: SpeechRecognitionResultList;
  resultIndex: number;
}

interface SpeechRecognitionErrorEvent extends Event {
  error: string;
  message: string;
}

interface SpeechRecognitionResultList {
  length: number;
  item(index: number): SpeechRecognitionResult;
  [index: number]: SpeechRecognitionResult;
}

interface SpeechRecognitionResult {
  length: number;
  item(index: number): SpeechRecognitionAlternative;
  [index: number]: SpeechRecognitionAlternative;
  isFinal: boolean;
}

interface SpeechRecognitionAlternative {
  transcript: string;
  confidence: number;
}

interface SpeechRecognitionInterface extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  maxAlternatives: number;
  start(): void;
  stop(): void;
  abort(): void;
  onaudiostart: ((this: SpeechRecognitionInterface, ev: Event) => void) | null;
  onaudioend: ((this: SpeechRecognitionInterface, ev: Event) => void) | null;
  onend: ((this: SpeechRecognitionInterface, ev: Event) => void) | null;
  onerror: ((this: SpeechRecognitionInterface, ev: SpeechRecognitionErrorEvent) => void) | null;
  onnomatch: ((this: SpeechRecognitionInterface, ev: Event) => void) | null;
  onresult: ((this: SpeechRecognitionInterface, ev: SpeechRecognitionEvent) => void) | null;
  onsoundstart: ((this: SpeechRecognitionInterface, ev: Event) => void) | null;
  onsoundend: ((this: SpeechRecognitionInterface, ev: Event) => void) | null;
  onspeechend: ((this: SpeechRecognitionInterface, ev: Event) => void) | null;
  onstart: ((this: SpeechRecognitionInterface, ev: Event) => void) | null;
}

declare global {
  interface Window {
    SpeechRecognition: new () => SpeechRecognitionInterface;
    webkitSpeechRecognition: new () => SpeechRecognitionInterface;
  }
}

export interface UseSpeechRecognitionOptions {
  lang?: string;
  continuous?: boolean;
  interimResults?: boolean;
  onTranscriptChange?: (transcript: string, isFinal: boolean) => void;
  onError?: (error: string) => void;
  onEnd?: (transcript: string) => void; // Called when recognition ends with transcript
}

export interface UseSpeechRecognitionReturn {
  transcript: string;
  interimTranscript: string;
  isListening: boolean;
  isSupported: boolean;
  error: string | null;
  startListening: () => void;
  stopListening: () => void;
  resetTranscript: () => void;
}

export function useSpeechRecognition(
  options: UseSpeechRecognitionOptions = {}
): UseSpeechRecognitionReturn {
  const {
    lang = 'en-US',
    continuous = true,
    interimResults = true,
    onTranscriptChange,
    onError,
    onEnd,
  } = options;

  const [transcript, setTranscript] = useState('');
  const [interimTranscript, setInterimTranscript] = useState('');
  const [isListening, setIsListening] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const recognitionRef = useRef<SpeechRecognitionInterface | null>(null);
  const shouldContinueRef = useRef(false); // Track if we should keep listening

  // Check if browser supports Speech Recognition
  const isSupported =
    typeof window !== 'undefined' &&
    ('SpeechRecognition' in window || 'webkitSpeechRecognition' in window);

  // Initialize Speech Recognition
  useEffect(() => {
    if (!isSupported) return;

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    const recognition = new SpeechRecognition();

    recognition.continuous = continuous;
    recognition.interimResults = interimResults;
    recognition.lang = lang;
    recognition.maxAlternatives = 1;

    // Handle results
    recognition.onresult = (event: SpeechRecognitionEvent) => {
      let interimText = '';
      let finalText = '';

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        const transcriptPart = result[0].transcript;

        if (result.isFinal) {
          finalText += transcriptPart + ' ';
        } else {
          interimText += transcriptPart;
        }
      }

      if (finalText) {
        setTranscript((prev) => {
          const newTranscript = prev + finalText;
          onTranscriptChange?.(newTranscript, true);
          return newTranscript;
        });
        setInterimTranscript('');
      }

      if (interimText) {
        setInterimTranscript(interimText);
        onTranscriptChange?.(transcript + interimText, false);
      }
    };

    // Handle errors
    recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
      // Ignore aborted errors - they're normal when stopping/restarting
      if (event.error === 'aborted') {
        return;
      }

      // Ignore no-speech errors - just restart
      if (event.error === 'no-speech' && shouldContinueRef.current) {
        return; // Will be handled by onend
      }

      let errorMessage = 'Erro no reconhecimento de voz';

      switch (event.error) {
        case 'no-speech':
          errorMessage = 'Nenhuma fala detectada. Por favor, tente novamente.';
          break;
        case 'audio-capture':
          errorMessage = 'Nenhum microfone encontrado. Por favor, verifique seu microfone.';
          break;
        case 'not-allowed':
          errorMessage = 'Permissão de microfone negada. Por favor, permita o acesso ao microfone.';
          break;
        case 'network':
          errorMessage = 'Erro de rede. Por favor, verifique sua conexão com a internet.';
          break;
        default:
          errorMessage = `Erro no reconhecimento de voz: ${event.error}`;
      }

      setError(errorMessage);
      shouldContinueRef.current = false;
      setIsListening(false);
      onError?.(errorMessage);
    };

    // Handle end - call onEnd callback with transcript
    recognition.onend = () => {
      const wasListening = shouldContinueRef.current;
      shouldContinueRef.current = false;
      setIsListening(false);
      setInterimTranscript('');

      // If we were listening and have a transcript, notify parent to finalize
      if (wasListening && transcript.trim()) {
        onEnd?.(transcript.trim());
      }
    };

    // Handle start
    recognition.onstart = () => {
      setIsListening(true);
      setError(null);
    };

    recognitionRef.current = recognition;

    return () => {
      shouldContinueRef.current = false;
      if (recognitionRef.current) {
        recognitionRef.current.abort();
      }
    };
  }, [isSupported, continuous, interimResults, lang, transcript, onTranscriptChange, onError, onEnd]);

  // Start listening
  const startListening = useCallback(() => {
    if (!isSupported) {
      const errorMsg = 'Reconhecimento de voz não é suportado neste navegador. Por favor, use Chrome, Edge ou Safari.';
      setError(errorMsg);
      onError?.(errorMsg);
      return;
    }

    if (recognitionRef.current && !isListening) {
      try {
        setError(null);
        shouldContinueRef.current = true; // Enable auto-restart
        recognitionRef.current.start();
      } catch {
        const errorMsg = 'Falha ao iniciar reconhecimento de voz. Por favor, tente novamente.';
        setError(errorMsg);
        onError?.(errorMsg);
      }
    }
  }, [isSupported, isListening, onError]);

  // Stop listening
  const stopListening = useCallback(() => {
    shouldContinueRef.current = false; // Disable auto-restart
    if (recognitionRef.current && isListening) {
      recognitionRef.current.stop();
    }
  }, [isListening]);

  // Reset transcript
  const resetTranscript = useCallback(() => {
    setTranscript('');
    setInterimTranscript('');
    setError(null);
  }, []);

  return {
    transcript,
    interimTranscript,
    isListening,
    isSupported,
    error,
    startListening,
    stopListening,
    resetTranscript,
  };
}
