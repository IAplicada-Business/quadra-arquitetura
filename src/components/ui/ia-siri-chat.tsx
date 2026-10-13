"use client";

import { Mic, MicOff, Volume2, Sparkles, Loader2 } from "lucide-react";
import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";

interface VoiceChatProps {
  onTranscript?: (transcript: string) => void;
  onStateChange?: (state: "idle" | "listening" | "processing" | "speaking") => void;
  isProcessing?: boolean;
  isSpeaking?: boolean;
  className?: string;
}

interface Particle {
  id: number;
  x: number;
  y: number;
  size: number;
  opacity: number;
  velocity: { x: number; y: number };
}

export function VoiceChat({
  onTranscript,
  onStateChange,
  isProcessing = false,
  isSpeaking = false,
  className,
}: VoiceChatProps) {
  const [isListening, setIsListening] = useState(false);
  const [volume, setVolume] = useState(0);
  const [duration, setDuration] = useState(0);
  const [particles, setParticles] = useState<Particle[]>([]);
  const [waveformData, setWaveformData] = useState(Array(32).fill(0));
  const [transcript, setTranscript] = useState("");
  const [supported, setSupported] = useState(true);
  const intervalRef = useRef<ReturnType<typeof setInterval>>();
  const animationRef = useRef<number>();
  const recognitionRef = useRef<any>(null);

  // Check Web Speech API support
  useEffect(() => {
    const SpeechRecognition = (window as any).webkitSpeechRecognition || (window as any).SpeechRecognition;
    if (!SpeechRecognition) {
      setSupported(false);
    }
  }, []);

  // Generate particles
  useEffect(() => {
    const newParticles: Particle[] = [];
    for (let i = 0; i < 20; i++) {
      newParticles.push({
        id: i,
        x: Math.random() * 400,
        y: Math.random() * 400,
        size: Math.random() * 3 + 1,
        opacity: Math.random() * 0.3 + 0.1,
        velocity: { x: (Math.random() - 0.5) * 0.5, y: (Math.random() - 0.5) * 0.5 },
      });
    }
    setParticles(newParticles);
  }, []);

  // Animate particles
  useEffect(() => {
    const animate = () => {
      setParticles((prev) =>
        prev.map((p) => ({
          ...p,
          x: (p.x + p.velocity.x + 400) % 400,
          y: (p.y + p.velocity.y + 400) % 400,
          opacity: Math.max(0.05, Math.min(0.4, p.opacity + (Math.random() - 0.5) * 0.02)),
        }))
      );
      animationRef.current = requestAnimationFrame(animate);
    };
    animationRef.current = requestAnimationFrame(animate);
    return () => {
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
    };
  }, []);

  // Waveform simulation when listening
  useEffect(() => {
    if (isListening) {
      intervalRef.current = setInterval(() => {
        setDuration((prev) => prev + 1);
        setWaveformData(Array(32).fill(0).map(() => Math.random() * 100));
        const v = Math.random() * 100;
        setVolume(v);
      }, 100);
    } else {
      if (intervalRef.current) clearInterval(intervalRef.current);
      setWaveformData(Array(32).fill(0));
      setVolume(0);
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [isListening]);

  const stopListening = useCallback(() => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
      recognitionRef.current = null;
    }
    setIsListening(false);
    setDuration(0);
  }, []);

  const startListening = useCallback(() => {
    const SpeechRecognition = (window as any).webkitSpeechRecognition || (window as any).SpeechRecognition;
    if (!SpeechRecognition) return;

    const recognition = new SpeechRecognition();
    recognition.lang = "pt-BR";
    recognition.continuous = true;
    recognition.interimResults = true;

    let finalTranscript = "";

    recognition.onresult = (event: any) => {
      let interim = "";
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const t = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          finalTranscript += t + " ";
        } else {
          interim = t;
        }
      }
      setTranscript(finalTranscript + interim);
    };

    recognition.onend = () => {
      setIsListening(false);
      setDuration(0);
      if (finalTranscript.trim()) {
        onTranscript?.(finalTranscript.trim());
      }
      onStateChange?.("idle");
    };

    recognition.onerror = (e: any) => {
      console.error("Speech recognition error:", e.error);
      setIsListening(false);
      setDuration(0);
      onStateChange?.("idle");
    };

    recognitionRef.current = recognition;
    recognition.start();
    setIsListening(true);
    setTranscript("");
    onStateChange?.("listening");
  }, [onTranscript, onStateChange]);

  const handleToggle = () => {
    if (isListening) {
      stopListening();
    } else {
      startListening();
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  const getStatusText = () => {
    if (isListening) return "Ouvindo...";
    if (isProcessing) return "Processando...";
    if (isSpeaking) return "Falando...";
    return "Toque para falar";
  };

  const getStatusColor = () => {
    if (isListening) return "text-accent-ink";
    if (isProcessing) return "text-warning-ink";
    if (isSpeaking) return "text-success";
    return "text-muted-foreground";
  };

  if (!supported) {
    return (
      <div className={cn("flex flex-col items-center justify-center p-8 text-center", className)}>
        <MicOff className="h-12 w-12 text-muted-foreground mb-4" />
        <p className="text-muted-foreground">
          Seu navegador não suporta reconhecimento de voz. Use Chrome ou Edge.
        </p>
      </div>
    );
  }

  return (
    <div className={cn("relative flex flex-col items-center justify-center min-h-[400px] w-full max-w-md mx-auto", className)}>
      {/* Ambient particles */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {particles.map((particle) => (
          <motion.div
            key={particle.id}
            className="absolute rounded-full bg-accent"
            style={{
              width: particle.size,
              height: particle.size,
              x: particle.x,
              y: particle.y,
              opacity: particle.opacity,
            }}
          />
        ))}
      </div>

      {/* Background glow */}
      <AnimatePresence>
        {(isListening || isProcessing || isSpeaking) && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 0.15, scale: 1.2 }}
            exit={{ opacity: 0, scale: 0.8 }}
            className="absolute inset-0 rounded-full bg-accent blur-3xl"
          />
        )}
      </AnimatePresence>

      <div className="relative z-10 flex flex-col items-center gap-6">
        {/* Main button */}
        <div className="relative">
          <motion.button
            onClick={handleToggle}
            whileTap={{ scale: 0.95 }}
            className={cn(
              "relative z-10 flex items-center justify-center w-24 h-24 rounded-full transition-all duration-300 shadow-lg",
              isListening
                ? "bg-accent text-accent-foreground shadow-accent/30"
                : isProcessing
                ? "bg-warning text-warning-foreground"
                : isSpeaking
                ? "bg-success text-success-foreground"
                : "bg-card text-foreground hover:bg-accent hover:text-accent-foreground border border-border"
            )}
            disabled={isProcessing || isSpeaking}
          >
            {isProcessing ? (
              <Loader2 className="h-8 w-8 animate-spin" />
            ) : isSpeaking ? (
              <Volume2 className="h-8 w-8" />
            ) : isListening ? (
              <MicOff className="h-8 w-8" />
            ) : (
              <Mic className="h-8 w-8" />
            )}
          </motion.button>

          {/* Pulse rings */}
          <AnimatePresence>
            {isListening && (
              <>
                <motion.div
                  initial={{ opacity: 0.6, scale: 1 }}
                  animate={{ opacity: 0, scale: 2 }}
                  transition={{ duration: 1.5, repeat: Infinity }}
                  className="absolute inset-0 rounded-full border-2 border-accent"
                />
                <motion.div
                  initial={{ opacity: 0.4, scale: 1 }}
                  animate={{ opacity: 0, scale: 2.5 }}
                  transition={{ duration: 2, repeat: Infinity, delay: 0.5 }}
                  className="absolute inset-0 rounded-full border border-accent"
                />
              </>
            )}
          </AnimatePresence>
        </div>

        {/* Waveform */}
        <div className="flex items-center gap-[2px] h-12">
          {waveformData.map((height, i) => (
            <motion.div
              key={i}
              className="w-1 rounded-full bg-accent/60"
              animate={{ height: Math.max(2, (height / 100) * 48) }}
              transition={{ duration: 0.1 }}
            />
          ))}
        </div>

        {/* Status */}
        <div className="flex flex-col items-center gap-2">
          <motion.p key={getStatusText()} initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} className={cn("text-sm font-medium", getStatusColor())}>
            {getStatusText()}
          </motion.p>
          <p className="text-xs text-muted-foreground font-mono">{formatTime(duration)}</p>
          {volume > 0 && (
            <div className="flex items-center gap-2">
              <Volume2 className="h-3 w-3 text-muted-foreground" />
              <div className="w-16 h-1 bg-muted rounded-full overflow-hidden">
                <motion.div className="h-full bg-accent rounded-full" animate={{ width: `${volume}%` }} />
              </div>
            </div>
          )}
        </div>

        {/* Transcript preview */}
        {transcript && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="max-w-sm text-center px-4">
            <p className="text-sm text-muted-foreground italic">"{transcript}"</p>
          </motion.div>
        )}

        {/* AI indicator */}
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Sparkles className="h-3 w-3 text-accent-ink" />
          Assistente de Voz IA
        </div>
      </div>
    </div>
  );
}
