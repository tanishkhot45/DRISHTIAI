"use client";

import { motion, AnimatePresence } from "framer-motion";

export function LoadingOverlay({
  open,
  title = "Working…",
  subtitle,
}: {
  open: boolean;
  title?: string;
  subtitle?: string;
}) {
  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-bg/70 backdrop-blur-md"
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
            className="glass mx-6 w-full max-w-md rounded-2xl p-8 text-center shadow-glow"
          >
            <BlinkingEye />
            <h3 className="mt-6 font-display text-lg font-semibold text-fg">
              {title}
            </h3>
            {subtitle && (
              <p className="mt-1 text-sm text-muted">{subtitle}</p>
            )}
            <div className="mt-6 overflow-hidden rounded-full bg-fg/5">
              <div className="h-1 w-full shimmer-bar" />
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function BlinkingEye() {
  return (
    <div className="mx-auto flex h-24 w-24 items-center justify-center">
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 100 100"
        className="h-24 w-24"
      >
        <defs>
          <linearGradient id="eyeStroke" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="rgb(var(--accent))" />
            <stop offset="100%" stopColor="rgb(var(--accent2))" />
          </linearGradient>
          <radialGradient id="irisGrad" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="rgb(var(--accent))" />
            <stop offset="70%" stopColor="rgb(var(--accent2))" />
            <stop offset="100%" stopColor="rgb(var(--accent))" stopOpacity="0.3" />
          </radialGradient>
          <clipPath id="eyeClip">
            <path d="M 8,50 Q 50,12 92,50 Q 50,88 8,50 Z" />
          </clipPath>
        </defs>

        {/* White of the eye — solid fill so iris contrasts in any theme */}
        <path
          d="M 8,50 Q 50,12 92,50 Q 50,88 8,50 Z"
          fill="rgb(var(--elevated))"
        />

        {/* Iris + pupil */}
        <g clipPath="url(#eyeClip)">
          <circle cx="50" cy="50" r="20" fill="url(#irisGrad)" />
          <circle cx="50" cy="50" r="8" fill="rgb(var(--fg))" />
          <circle cx="45" cy="45" r="2.8" fill="white" />
        </g>

        {/* Eyelid — fills with elevated surface, same colour as white of eye,
            so when it closes it looks like the eye itself has shut */}
        <g clipPath="url(#eyeClip)">
          <rect
            x="0"
            y="0"
            width="100"
            height="100"
            fill="rgb(var(--elevated))"
            className="eyelid"
          />
        </g>

        {/* Outer eye outline — drawn last so it's always on top */}
        <path
          d="M 8,50 Q 50,12 92,50 Q 50,88 8,50 Z"
          fill="none"
          stroke="url(#eyeStroke)"
          strokeWidth="3"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>

      <style jsx>{`
        .eyelid {
          transform-origin: 50% 12%;
          transform: scaleY(0);
          animation: blink 2.6s ease-in-out infinite;
        }
        @keyframes blink {
          0%, 38% { transform: scaleY(0); }
          44% { transform: scaleY(1); }
          50% { transform: scaleY(0); }
          86% { transform: scaleY(0); }
          92% { transform: scaleY(1); }
          98% { transform: scaleY(0); }
          100% { transform: scaleY(0); }
        }
        @media (prefers-reduced-motion: reduce) {
          .eyelid { animation: none; }
        }
      `}</style>
    </div>
  );
}