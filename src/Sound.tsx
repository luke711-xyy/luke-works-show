import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { PondAudio } from "./pond-audio";

const SoundContext = createContext<PondAudio | null>(null);
export const useOptionalSound = () => useContext(SoundContext);
export function useSound() {
  const audio = useOptionalSound();
  if (!audio) throw Error("SoundProvider is required");
  return audio;
}
export function SoundProvider({ children }: { children: ReactNode }) {
  const [audio] = useState(() => new PondAudio());
  useEffect(() => {
    audio.setVisible(!document.hidden);
    audio.activate();
    const gesture = (event: Event) => {
      if (
        event instanceof KeyboardEvent &&
        (event.metaKey || event.ctrlKey || event.altKey)
      )
        return;
      audio.activate();
    };
    const visibility = () => audio.setVisible(!document.hidden);
    document.addEventListener("pointerdown", gesture, true);
    document.addEventListener("keydown", gesture, true);
    document.addEventListener("visibilitychange", visibility);
    return () => {
      document.removeEventListener("pointerdown", gesture, true);
      document.removeEventListener("keydown", gesture, true);
      document.removeEventListener("visibilitychange", visibility);
      audio.dispose();
    };
  }, [audio]);
  return (
    <SoundContext.Provider value={audio}>{children}</SoundContext.Provider>
  );
}
