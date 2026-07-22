'use client';
import { useState, useEffect } from 'react';
import { Mic, MicOff, Loader2 } from 'lucide-react';

interface VoiceSearchButtonProps {
  onResult: (text: string) => void;
  className?: string;
}

export function VoiceSearchButton({ onResult, className = '' }: VoiceSearchButtonProps) {
  const [isListening, setIsListening] = useState(false);
  const [isSupported, setIsSupported] = useState(false);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const SpeechRecognition =
        (window as unknown as { SpeechRecognition?: unknown }).SpeechRecognition ||
        (window as unknown as { webkitSpeechRecognition?: unknown }).webkitSpeechRecognition;
      setIsSupported(Boolean(SpeechRecognition));
    }
  }, []);

  const toggleListening = () => {
    if (!isSupported) {
      alert('Trình duyệt của bạn chưa hỗ trợ nhận diện giọng nói. Vui lòng thử trên Chrome hoặc Edge!');
      return;
    }

    const SpeechRecognition =
      (window as unknown as { SpeechRecognition?: any }).SpeechRecognition ||
      (window as unknown as { webkitSpeechRecognition?: any }).webkitSpeechRecognition;

    if (!SpeechRecognition) return;

    if (isListening) {
      setIsListening(false);
      return;
    }

    try {
      const recognition = new SpeechRecognition();
      recognition.lang = 'vi-VN';
      recognition.interimResults = false;
      recognition.maxAlternatives = 1;

      recognition.onstart = () => {
        setIsListening(true);
      };

      recognition.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        if (transcript) {
          onResult(transcript);
        }
        setIsListening(false);
      };

      recognition.onerror = (err: any) => {
        console.error('Speech recognition error:', err);
        setIsListening(false);
      };

      recognition.onend = () => {
        setIsListening(false);
      };

      recognition.start();
    } catch (e) {
      console.error('Voice search failed:', e);
      setIsListening(false);
    }
  };

  if (!isSupported) return null;

  return (
    <button
      type="button"
      onClick={toggleListening}
      className={`relative flex items-center justify-center p-2 rounded-xl text-neutral-400 hover:text-white transition-all duration-200 ${
        isListening
          ? 'bg-netflixRed text-white shadow-[0_0_15px_rgba(229,9,20,0.6)] animate-pulse'
          : 'bg-white/5 hover:bg-white/10'
      } ${className}`}
      title={isListening ? 'Đang lắng nghe giọng nói...' : 'Tìm kiếm bằng giọng nói'}
    >
      {isListening ? (
        <Loader2 size={16} className="animate-spin text-white" />
      ) : (
        <Mic size={16} />
      )}
    </button>
  );
}
