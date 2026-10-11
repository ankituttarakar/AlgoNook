import { useEffect, useState } from 'react';

export function shuffleAnswerOptions(options, random = Math.random) {
  const shuffled = [...options];
  for (let index = shuffled.length - 1; index > 0; index -= 1) {
    const otherIndex = Math.floor(random() * (index + 1));
    [shuffled[index], shuffled[otherIndex]] = [shuffled[otherIndex], shuffled[index]];
  }

  const isCorrect = (option) => option.correct === true || option.ok === true;
  if (shuffled.length > 1 && isCorrect(shuffled[0])) {
    const swapIndex = shuffled.findIndex((option, index) => index > 0 && !isCorrect(option));
    if (swapIndex > 0) [shuffled[0], shuffled[swapIndex]] = [shuffled[swapIndex], shuffled[0]];
  }

  return shuffled;
}

// Randomize choices after mount so random number generation stays out of render.
export function useShuffledOptions(options = [], key = '') {
  const [shuffled, setShuffled] = useState(null);
  const optionsFingerprint = JSON.stringify(options);

  useEffect(() => {
    setShuffled({ key, options: shuffleAnswerOptions(options) });
  // Some consumers have no option list and historically constructed [] during
  // each render. Depend on its value fingerprint so that the effect stays finite.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [optionsFingerprint, key]);

  return shuffled?.key === key ? shuffled.options : [];
}
