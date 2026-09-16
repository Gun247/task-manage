"use client";

import { useEffect, useState } from "react";

/** Wait until after the browser paints so route navigation feels instant. */
export function useAfterPaint() {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const frame = window.requestAnimationFrame(() => {
      window.requestAnimationFrame(() => {
        if (!cancelled) setReady(true);
      });
    });
    return () => {
      cancelled = true;
      window.cancelAnimationFrame(frame);
    };
  }, []);

  return ready;
}
