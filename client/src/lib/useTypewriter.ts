import { useState, useEffect, useRef } from "react";

const CHAR_DELAY_MS = 18;

/**
 * Reveals `fullText` one character at a time while `enabled` is true
 * (streaming). When `enabled` flips to false the animation keeps running
 * until it has caught up — so the typewriter always finishes naturally.
 *
 * Messages that were *never* streamed (loaded from DB on page load)
 * are shown in full immediately because `enabled` was never true.
 */
export function useTypewriter(fullText: string, enabled: boolean): string {
  const [displayed, setDisplayed] = useState("");
  const indexRef = useRef(0);
  const rafRef = useRef<number | null>(null);
  const lastTimeRef = useRef(0);
  // Track whether the typewriter was ever activated for this message
  const wasEnabledRef = useRef(false);

  if (enabled) {
    wasEnabledRef.current = true;
  }

  // Message was never streamed (e.g. loaded from DB) — show immediately
  useEffect(() => {
    if (!enabled && !wasEnabledRef.current) {
      setDisplayed(fullText);
      indexRef.current = fullText.length;
    }
  }, [enabled, fullText]);

  // Run the typing animation while streaming OR while still catching up
  useEffect(() => {
    const shouldAnimate = enabled || (wasEnabledRef.current && indexRef.current < fullText.length);
    if (!shouldAnimate) return;

    const step = (time: number) => {
      if (indexRef.current >= fullText.length) {
        if (enabled) {
          // Still streaming, keep polling for new text
          rafRef.current = requestAnimationFrame(step);
        }
        // If not enabled and caught up, stop — we're done
        return;
      }

      if (time - lastTimeRef.current >= CHAR_DELAY_MS) {
        indexRef.current++;
        setDisplayed(fullText.slice(0, indexRef.current));
        lastTimeRef.current = time;
      }

      rafRef.current = requestAnimationFrame(step);
    };

    rafRef.current = requestAnimationFrame(step);
    return () => {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
    };
  }, [fullText, enabled]);

  return displayed;
}
