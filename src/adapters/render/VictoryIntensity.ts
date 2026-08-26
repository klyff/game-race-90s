/** Confetti / firework counts for a podium finish. P1 is the biggest burst. */
export function celebrationIntensity(place: number): { readonly confetti: number; readonly fireworks: number } {
  if (place <= 1) {
    return { confetti: 220, fireworks: 16 };
  }
  if (place === 2) {
    return { confetti: 160, fireworks: 12 };
  }
  return { confetti: 130, fireworks: 8 };
}
