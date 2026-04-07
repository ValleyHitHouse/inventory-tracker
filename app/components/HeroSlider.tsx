"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";

const DEFAULT_SLIDES = [
  {
    id: 1,
    title: "WELCOME TO THE",
    titleAccent: "VALLEY OF HEAT",
    subtitle: "Home of Bo Jackson Battle Arena breaks — where legends are pulled and champions are made.",
    ctaText: "Join a Break",
    ctaLink: "https://www.whatnot.com/user/valleyhithouse",
    ctaExternal: true,
    bgColor: "linear-gradient(135deg, #0a0a0a 0%, #1a0800 100%)",
    image: null,
  },
  {
    id: 2,
    title: "LATEST",
    titleAccent: "TOP HITS",
    subtitle: "See the hottest cards pulled from recent VHH breaks. New hits added every week.",
    ctaText: "View Top Hits",
    ctaLink: "/breaks/top-hits",
    ctaExternal: false,
    bgColor: "linear-gradient(135deg, #0a0a0a 0%, #0d0d1a 100%)",
    image: null,
  },
  {
    id: 3,
    title: "REP THE",
    titleAccent: "VALLEY",
    subtitle: "VHH apparel coming soon. Stay tuned for drops.",
    ctaText: "Coming Soon",
    ctaLink: "/store",
    ctaExternal: false,
    bgColor: "linear-gradient(135deg, #0a0a0a 0%, #0f0a1a 100%)",
    image: null,
  },
];

export default function HeroSlider() {
  const [slides, setSlides] = useState(DEFAULT_SLIDES);
  const [current, setCurrent] = useState(0);
  const [transitioning, setTransitioning] = useState(false);

  useEffect(() => {
    async function loadSlides() {
      const { data } = await supabase.from("hero_slides").select("*").eq("active", true).order("slide_order");
      if (data && data.length > 0) {
        // Merge with defaults or use DB slides
      }
    }
    loadSlides();
  }, []);

  useEffect(() => {
    const timer = setInterval(() => {
      goToNext();
    }, 5000);
    return () => clearInterval(timer);
  }, [current]);

  function goToNext() {
    setTransitioning(true);
    setTimeout(() => {
      setCurrent(prev => (prev + 1) % slides.length);
      setTransitioning(false);
    }, 300);
  }

  function goTo(index: number) {
    setTransitioning(true);
    setTimeout(() => {
      setCurrent(index);
      setTransitioning(false);
    }, 300);
  }

  const slide = slides[current];

  return (
    <div style={{
      position: "relative",
      minHeight: "100vh",
      background: slide.bgColor,
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      overflow: "hidden",
      transition: "background 0.5s ease",
    }}>
      {/* Background pattern */}
      <div style={{
        position: "absolute", inset: 0,
        backgroundImage: "radial-gradient(circle at 20% 50%, rgba(251,146,60,0.08) 0%, transparent 50%), radial-gradient(circle at 80% 50%, rgba(167,139,250,0.06) 0%, transparent 50%)",
        pointerEvents: "none",
      }} />

      {/* Grid overlay */}
      <div style={{
        position: "absolute", inset: 0,
        backgroundImage: "linear-gradient(rgba(251,146,60,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(251,146,60,0.03) 1px, transparent 1px)",
        backgroundSize: "60px 60px",
        pointerEvents: "none",
      }} />

      {/* Content */}
      <div style={{
        maxWidth: 900, margin: "0 auto", padding: "120px 24px 80px",
        textAlign: "center", position: "relative", zIndex: 1,
        opacity: transitioning ? 0 : 1,
        transform: transitioning ? "translateY(10px)" : "translateY(0)",
        transition: "opacity 0.3s ease, transform 0.3s ease",
      }}>
        {/* Eyebrow */}
        <div style={{ display: "inline-flex", alignItems: "center", gap: 8, background: "rgba(251,146,60,0.1)", border: "1px solid rgba(251,146,60,0.2)", borderRadius: 20, padding: "6px 16px", marginBottom: 24 }}>
          <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#fb923c", display: "inline-block", boxShadow: "0 0 8px #fb923c" }} />
          <span style={{ fontSize: 11, color: "#fb923c", fontWeight: 700, textTransform: "uppercase", letterSpacing: ".8px" }}>Bo Jackson Battle Arena</span>
        </div>

        {/* Main headline */}
        <h1 style={{ margin: 0, marginBottom: 8, lineHeight: 1.05 }}>
          <span style={{ display: "block", fontSize: "clamp(36px, 7vw, 80px)", fontWeight: 900, color: "#e5e5e5", letterSpacing: "-2px", textTransform: "uppercase" }}>
            {slide.title}
          </span>
          <span style={{ display: "block", fontSize: "clamp(36px, 7vw, 80px)", fontWeight: 900, color: "#fb923c", letterSpacing: "-2px", textTransform: "uppercase", WebkitTextStroke: "1px rgba(251,146,60,0.3)" }}>
            {slide.titleAccent}
          </span>
        </h1>

        {/* Subtitle */}
        <p style={{ fontSize: "clamp(14px, 2.5vw, 18px)", color: "#666", maxWidth: 600, margin: "20px auto 40px", lineHeight: 1.6 }}>
          {slide.subtitle}
        </p>

        {/* CTA buttons */}
        <div style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap" }}>
          {slide.ctaExternal ? (
            <a href={slide.ctaLink} target="_blank" rel="noopener noreferrer" style={{
              padding: "14px 32px", borderRadius: 10, fontSize: 15, fontWeight: 700,
              color: "#fff", textDecoration: "none",
              background: "linear-gradient(135deg,#fb923c,#f472b6)",
              boxShadow: "0 8px 32px rgba(251,146,60,0.3)",
              transition: "transform 0.2s, box-shadow 0.2s",
            }}>
              {slide.ctaText} ↗
            </a>
          ) : (
            <Link href={slide.ctaLink} style={{
              padding: "14px 32px", borderRadius: 10, fontSize: 15, fontWeight: 700,
              color: "#fff", textDecoration: "none",
              background: "linear-gradient(135deg,#fb923c,#f472b6)",
              boxShadow: "0 8px 32px rgba(251,146,60,0.3)",
            }}>
              {slide.ctaText}
            </Link>
          )}
          <Link href="/breaks/boba" style={{
            padding: "14px 32px", borderRadius: 10, fontSize: 15, fontWeight: 700,
            color: "#fb923c", textDecoration: "none",
            border: "1px solid rgba(251,146,60,0.3)",
            background: "rgba(251,146,60,0.05)",
          }}>
            View Schedule
          </Link>
        </div>
      </div>

      {/* Slide indicators */}
      <div style={{
        position: "absolute", bottom: 32, left: "50%", transform: "translateX(-50%)",
        display: "flex", gap: 8, zIndex: 2,
      }}>
        {slides.map((_, i) => (
          <button key={i} onClick={() => goTo(i)} style={{
            width: i === current ? 24 : 8, height: 8,
            borderRadius: 4, border: "none", cursor: "pointer",
            background: i === current ? "#fb923c" : "rgba(255,255,255,0.2)",
            transition: "all 0.3s ease",
            padding: 0,
          }} />
        ))}
      </div>

      {/* Arrow navigation */}
      <button onClick={() => goTo((current - 1 + slides.length) % slides.length)} style={{
        position: "absolute", left: 16, top: "50%", transform: "translateY(-50%)",
        background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)",
        borderRadius: "50%", width: 40, height: 40, cursor: "pointer",
        color: "#aaa", fontSize: 16, display: "flex", alignItems: "center", justifyContent: "center",
        zIndex: 2,
      }}>‹</button>
      <button onClick={() => goToNext()} style={{
        position: "absolute", right: 16, top: "50%", transform: "translateY(-50%)",
        background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)",
        borderRadius: "50%", width: 40, height: 40, cursor: "pointer",
        color: "#aaa", fontSize: 16, display: "flex", alignItems: "center", justifyContent: "center",
        zIndex: 2,
      }}>›</button>
    </div>
  );
}