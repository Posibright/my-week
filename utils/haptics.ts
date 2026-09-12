export const triggerHaptic = (type: 'light' | 'medium' | 'heavy' = 'light') => {
  if (typeof window !== 'undefined' && 'navigator' in window && 'vibrate' in navigator) {
    const patterns = { 
      light: 10,     // Quick subtle tap (e.g., card press, day switch)
      medium: 25,    // Satisfying tick (e.g., checkbox toggle)
      heavy: 40      // Distinct bump (e.g., saving or deleting a block)
    };
    navigator.vibrate(patterns[type]);
  }
};