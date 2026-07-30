'use client';

import { ArrowUp } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Button } from './ui/button';

const VISIBILITY_THRESHOLD = 400;

export function BackToTopButton() {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const updateVisibility = () => {
      setIsVisible(window.scrollY > VISIBILITY_THRESHOLD);
    };

    updateVisibility();
    window.addEventListener('scroll', updateVisibility, { passive: true });

    return () => window.removeEventListener('scroll', updateVisibility);
  }, []);

  if (!isVisible) {
    return null;
  }

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <Button
      type="button"
      size="icon"
      aria-label="Voltar ao topo"
      title="Voltar ao topo"
      onClick={scrollToTop}
      className="fixed bottom-4 left-4 z-50 size-12 rounded-full shadow-elevated md:bottom-6 md:left-6"
    >
      <ArrowUp className="size-5" aria-hidden="true" />
    </Button>
  );
}
