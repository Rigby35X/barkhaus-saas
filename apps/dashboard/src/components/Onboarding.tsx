import { useState, useEffect, useCallback } from 'react';
import type { TabKey } from './Sidebar';
import { ONBOARDING_STEPS, markOnboardingComplete } from '../lib/onboarding';

interface SpotlightRect {
  top: number;
  left: number;
  width: number;
  height: number;
}

interface OnboardingProps {
  onComplete: () => void;
  onNavigateTab: (tab: TabKey) => void;
}

const PADDING = 8; // px around spotlight target

function getTargetRect(selector: string): SpotlightRect | null {
  const el = document.querySelector(`[data-tour="${selector}"]`);
  if (!el) return null;
  const r = el.getBoundingClientRect();
  return {
    top: r.top - PADDING,
    left: r.left - PADDING,
    width: r.width + PADDING * 2,
    height: r.height + PADDING * 2,
  };
}

function clamp(val: number, min: number, max: number) {
  return Math.max(min, Math.min(max, val));
}

export default function Onboarding({ onComplete, onNavigateTab }: OnboardingProps) {
  const [stepIndex, setStepIndex] = useState(0);
  const [rect, setRect] = useState<SpotlightRect | null>(null);
  const [tooltipPos, setTooltipPos] = useState({ top: 0, left: 0 });
  const [ready, setReady] = useState(false);

  const step = ONBOARDING_STEPS[stepIndex];

  const updateSpotlight = useCallback(() => {
    if (!step) return;

    if (step.placement === 'center') {
      setRect(null);
      setTooltipPos({
        top: window.innerHeight / 2 - 120,
        left: window.innerWidth / 2 - 200,
      });
      setReady(true);
      return;
    }

    const r = getTargetRect(step.targetSelector);
    if (!r) {
      // Element not found — show centered fallback
      setRect(null);
      setTooltipPos({
        top: window.innerHeight / 2 - 120,
        left: window.innerWidth / 2 - 200,
      });
      setReady(true);
      return;
    }

    setRect(r);

    // Calculate tooltip position
    const TW = 320; // tooltip width
    const TH = 200; // approx tooltip height
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    let top = 0;
    let left = 0;

    switch (step.placement) {
      case 'right':
        top = clamp(r.top, 16, vh - TH - 16);
        left = clamp(r.left + r.width + 16, 16, vw - TW - 16);
        break;
      case 'left':
        top = clamp(r.top, 16, vh - TH - 16);
        left = clamp(r.left - TW - 16, 16, vw - TW - 16);
        break;
      case 'bottom':
        top = clamp(r.top + r.height + 16, 16, vh - TH - 16);
        left = clamp(r.left + r.width / 2 - TW / 2, 16, vw - TW - 16);
        break;
      case 'top':
      default:
        top = clamp(r.top - TH - 16, 16, vh - TH - 16);
        left = clamp(r.left + r.width / 2 - TW / 2, 16, vw - TW - 16);
        break;
    }

    setTooltipPos({ top, left });
    setReady(true);
  }, [step]);

  // Navigate tab first, then wait for DOM, then spotlight
  useEffect(() => {
    setReady(false);
    if (step?.tab) {
      onNavigateTab(step.tab);
    }
    // Short delay for tab render + animations
    const timer = setTimeout(updateSpotlight, 350);
    return () => clearTimeout(timer);
  }, [stepIndex]); // eslint-disable-line react-hooks/exhaustive-deps

  // Reposition on resize
  useEffect(() => {
    window.addEventListener('resize', updateSpotlight);
    return () => window.removeEventListener('resize', updateSpotlight);
  }, [updateSpotlight]);

  const handleNext = () => {
    if (stepIndex < ONBOARDING_STEPS.length - 1) {
      setStepIndex((i) => i + 1);
    } else {
      handleComplete();
    }
  };

  const handlePrev = () => {
    if (stepIndex > 0) setStepIndex((i) => i - 1);
  };

  const handleComplete = () => {
    markOnboardingComplete();
    onComplete();
  };

  const isLast = stepIndex === ONBOARDING_STEPS.length - 1;
  const progress = ((stepIndex + 1) / ONBOARDING_STEPS.length) * 100;

  // Build overlay using box-shadow cutout
  const overlayStyle: React.CSSProperties = rect
    ? {
        position: 'fixed',
        inset: 0,
        zIndex: 9000,
        pointerEvents: 'none',
        boxShadow: `0 0 0 9999px rgba(0,0,0,0.65)`,
        clipPath: `polygon(
          0% 0%, 100% 0%, 100% 100%, 0% 100%,
          0% ${rect.top}px,
          ${rect.left}px ${rect.top}px,
          ${rect.left}px ${rect.top + rect.height}px,
          ${rect.left + rect.width}px ${rect.top + rect.height}px,
          ${rect.left + rect.width}px ${rect.top}px,
          0% ${rect.top}px
        )`,
      }
    : {
        position: 'fixed',
        inset: 0,
        zIndex: 9000,
        pointerEvents: 'none',
        backgroundColor: 'rgba(0,0,0,0.65)',
      };

  // Spotlight border highlight
  const spotlightBorderStyle: React.CSSProperties | null = rect
    ? {
        position: 'fixed',
        top: rect.top,
        left: rect.left,
        width: rect.width,
        height: rect.height,
        zIndex: 9001,
        borderRadius: '10px',
        boxShadow: '0 0 0 3px rgba(128, 78, 63, 0.8)',
        pointerEvents: 'none',
      }
    : null;

  return (
    <>
      {/* Dark overlay */}
      <div style={overlayStyle} />

      {/* Spotlight border */}
      {spotlightBorderStyle && <div style={spotlightBorderStyle} />}

      {/* Click-blocker for outside tooltip area */}
      <div
        style={{ position: 'fixed', inset: 0, zIndex: 9002 }}
        onClick={(e) => {
          // only close if clicking the overlay itself, not the tooltip
          const target = e.target as HTMLElement;
          if (target.dataset.tourOverlay) handleComplete();
        }}
        data-tour-overlay="true"
      />

      {/* Tooltip card */}
      {ready && (
        <div
          style={{
            position: 'fixed',
            top: tooltipPos.top,
            left: tooltipPos.left,
            width: 320,
            zIndex: 9010,
          }}
          className="bg-white rounded-2xl shadow-2xl border border-silver-gray overflow-hidden"
        >
          {/* Progress bar */}
          <div className="h-1 bg-cloud">
            <div
              className="h-full bg-warm-brown transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>

          <div className="p-5">
            {/* Step counter */}
            <p className="text-xs font-semibold text-stone mb-1 uppercase tracking-wider">
              Step {stepIndex + 1} of {ONBOARDING_STEPS.length}
            </p>

            <h3 className="text-base font-serif font-semibold text-deep-taupe mb-2">
              {step.title}
            </h3>
            <p className="text-sm text-stone leading-relaxed">{step.description}</p>
          </div>

          {/* Footer actions */}
          <div className="px-5 pb-5 flex items-center justify-between gap-2">
            <button
              onClick={handleComplete}
              className="text-xs text-stone hover:text-deep-taupe transition underline"
            >
              Skip tour
            </button>

            <div className="flex gap-2">
              {stepIndex > 0 && (
                <button
                  onClick={handlePrev}
                  className="px-4 py-2 text-sm font-semibold border border-silver-gray text-deep-taupe rounded-xl hover:bg-cloud transition"
                >
                  Back
                </button>
              )}
              <button
                onClick={handleNext}
                className="px-4 py-2 text-sm font-semibold bg-warm-brown text-white rounded-xl hover:opacity-90 transition"
              >
                {isLast ? 'Finish' : 'Next'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
