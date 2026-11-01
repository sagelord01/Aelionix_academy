"use client";

import { usePathname } from "next/navigation";
import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import styles from "./AeroShardsBackground.module.css";

/*
 * A single WebGPU canvas mounted once from the root layout. The effect (and
 * vgpu) is imported at runtime only on browsers that expose navigator.gpu, so
 * unsupported browsers never download its chunk.
 */

const COMPACT = "(max-width: 639px)";
const HANDHELD = "(max-width: 1099px)";
const ULTRAWIDE = "(min-width: 1601px)";
const REDUCED = "(prefers-reduced-motion: reduce)";
const COARSE = "(pointer: coarse)";

const FOCUS_ROUTES = [
  "/learn",
  "/explore",
  "/practice",
  "/review",
  "/progress",
  "/assessment",
  "/settings",
];

function subscribeToSupport() {
  return () => {};
}

function getClientSupport() {
  return typeof navigator !== "undefined" && "gpu" in navigator && navigator.gpu
    ? "supported"
    : "unsupported";
}

function getServerSupport() {
  return "checking";
}

function readQuality() {
  const width = window.innerWidth;
  const height = window.innerHeight;
  const reduced = window.matchMedia(REDUCED).matches;
  const coarse = window.matchMedia(COARSE).matches;
  const compact = width < 640;
  const handheld = width < 1100;
  const ultrawide = width >= 1601;

  const cores =
    typeof navigator.hardwareConcurrency === "number"
      ? navigator.hardwareConcurrency
      : 8;
  const memory =
    typeof navigator.deviceMemory === "number" ? navigator.deviceMemory : 8;
  const lowPower = cores <= 4 || memory <= 4;

  // Shard count follows viewport area, then gets capped. The effect is a
  // background, not the subject, so it stays well below the component default.
  const area = Math.max(width * height, 1);
  let count = Math.round(area / 1900);
  count = Math.max(compact ? 180 : 240, Math.min(count, 880));
  if (lowPower) count = Math.round(count * 0.55);

  const dpr = lowPower ? 1 : ultrawide ? 1 : handheld ? 1.1 : 1.25;

  return {
    reduced,
    coarse,
    lowPower,
    settings: {
      shardColor: "#a855f7",
      accentColor: "#00f0ff",
      backgroundColor: "transparent",
      placement: "full",
      material: "glass",
      count: Math.max(100, count),
      shardSize: compact ? 1.15 : 1,
      spread: 0.92,
      twist: 0.85,
      billow: 0.9,
      speed: 0.55,
      scale: 1,
      depthOfField: lowPower ? 0.32 : 0.62,
      glow: lowPower ? 0.2 : 0.35,
      grain: 0.045,
      vignette: 0.38,
      intro: !reduced,
      mouseInteraction: !reduced,
      mouseStrength: coarse ? 0.24 : 0.4,
      markers: lowPower || compact ? "none" : "plus",
      pulseOnClick: !reduced,
      holdToGather: !reduced && !coarse,
      parallax: coarse ? 0.12 : 0.35,
      paused: reduced,
      dpr,
    },
  };
}

export default function AeroShardsBackground() {
  const pathname = usePathname();
  const support = useSyncExternalStore(
    subscribeToSupport,
    getClientSupport,
    getServerSupport,
  );
  const [quality, setQuality] = useState(null);
  const [Shards, setShards] = useState(null);
  const [failed, setFailed] = useState(false);
  const rafRef = useRef(0);

  useEffect(() => {
    if (support !== "supported") return undefined;
    let cancelled = false;
    import("./AeroShards/AeroShards")
      .then((module) => {
        if (!cancelled) setShards(() => module.default);
      })
      .catch(() => {
        if (!cancelled) setFailed(true);
      });
    return () => {
      cancelled = true;
    };
  }, [support]);

  useEffect(() => {
    if (support !== "supported") return undefined;

    const queries = [COMPACT, HANDHELD, ULTRAWIDE, REDUCED, COARSE].map(
      (query) => window.matchMedia(query),
    );

    const update = () => {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = requestAnimationFrame(() => setQuality(readQuality()));
    };

    update();
    queries.forEach((query) => query.addEventListener("change", update));
    window.addEventListener("resize", update);
    window.addEventListener("orientationchange", update);

    return () => {
      cancelAnimationFrame(rafRef.current);
      queries.forEach((query) => query.removeEventListener("change", update));
      window.removeEventListener("resize", update);
      window.removeEventListener("orientationchange", update);
    };
  }, [support]);

  const calm = FOCUS_ROUTES.some(
    (route) => pathname === route || pathname.startsWith(`${route}/`),
  );

  return (
    <div
      className={styles.wrap}
      data-intensity={calm ? "calm" : "ambient"}
      aria-hidden="true"
    >
      <div className={styles.gradient} />
      {support === "supported" && quality && Shards && !failed ? (
        <div className={styles.shards}>
          <Shards
            {...quality.settings}
            className={styles.canvasHost}
            onError={() => {
              if (process.env.NODE_ENV !== "production") {
                console.warn(
                  "[AeroShards] WebGPU initialization failed; using the static gradient fallback.",
                );
              }
              setFailed(true);
            }}
          />
        </div>
      ) : null}
      <div className={styles.scrim} />
    </div>
  );
}
