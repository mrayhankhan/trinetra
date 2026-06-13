// Browser-native voice using the Web Speech API — real STT + TTS with no
// backend. In production this maps to Catalyst Zia STT/TTS (kn-IN/en-IN),
// but for the demo the browser engine works live and offline-ish.

export type Lang = "en-IN" | "kn-IN";

export const LANG_LABEL: Record<Lang, string> = {
  "en-IN": "EN",
  "kn-IN": "ಕನ್ನಡ",
};

type SpeechRecognitionLike = {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  start: () => void;
  stop: () => void;
  onresult: ((e: any) => void) | null;
  onerror: ((e: any) => void) | null;
  onend: (() => void) | null;
};

export function speechSupported(): boolean {
  if (typeof window === "undefined") return false;
  return Boolean(
    (window as any).SpeechRecognition ||
      (window as any).webkitSpeechRecognition
  );
}

// Starts listening; calls onText with the final transcript. Returns a stop fn.
export function listen(
  lang: Lang,
  onText: (text: string) => void,
  onStateChange?: (listening: boolean) => void
): () => void {
  if (typeof window === "undefined") return () => {};
  const Ctor =
    (window as any).SpeechRecognition ||
    (window as any).webkitSpeechRecognition;
  if (!Ctor) {
    onStateChange?.(false);
    return () => {};
  }
  const rec: SpeechRecognitionLike = new Ctor();
  rec.lang = lang;
  rec.continuous = false;
  rec.interimResults = false;
  rec.onresult = (e: any) => {
    const transcript = e.results?.[0]?.[0]?.transcript ?? "";
    if (transcript) onText(transcript);
  };
  rec.onerror = () => onStateChange?.(false);
  rec.onend = () => onStateChange?.(false);
  onStateChange?.(true);
  rec.start();
  return () => {
    try {
      rec.stop();
    } catch {
      /* no-op */
    }
  };
}

// Text-to-speech for agent answers.
export function speak(text: string, lang: Lang) {
  if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
  window.speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(text);
  u.lang = lang;
  u.rate = 1.02;
  window.speechSynthesis.speak(u);
}

export function stopSpeaking() {
  if (typeof window !== "undefined" && "speechSynthesis" in window) {
    window.speechSynthesis.cancel();
  }
}
