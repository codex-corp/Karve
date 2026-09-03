import React from "react";
import {
  AbsoluteFill,
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig
} from "remotion";
import { getStyleProfile, resolveStyleTokens } from "../../../src/p7/style-profile.ts";

/**
 * Continuous Visual Scene for Beats 1 & 2 (14.68s -> 24.96s)
 * Powered by:
 *   - `video-talkcraft:chapter-progress-list` (structured progressive ecosystem list + cinematic corner brackets)
 *   - `video-talkcraft:long-take-world` (spatial world grid backdrop + continuous micro-drift)
 *   - `video-talkcraft:news-card-desk` (elevated card surface, border discipline, subtle depth)
 *
 * Safe Area Discipline:
 *   - Anchored firmly in the left-to-center zone (left: 64px, top: 70px).
 *   - Absolutely zero overlap with the host PiP (bottom-right: 912px-1232px) or captions (bottom-center).
 */
export const IntegrationEcosystemScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();
  const timeSeconds = frame / fps;

  const profile = getStyleProfile("karve-technical-v1");
  const tokens = resolveStyleTokens(profile, { width, height });

  // Active range: 14.68s to 24.96s
  if (timeSeconds < 14.68 || timeSeconds >= 25.1) {
    return null;
  }

  // Entrance spring (14.68s -> 15.20s)
  const enterProgress = spring({
    frame: Math.max(0, frame - Math.round(14.68 * fps)),
    fps,
    config: { damping: 16, stiffness: 95 }
  });

  // Exit fade (24.60s -> 24.96s)
  const exitOpacity = interpolate(
    timeSeconds,
    [24.60, 24.96],
    [1, 0],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
  );

  const sceneOpacity = enterProgress * exitOpacity;

  // Transition to Beat 2 Ecosystem World ("ولكن اكتشفت انه هو عالم كتير كبير")
  // Begins at 21.80s, settles by 22.80s
  const travelStart = 21.80;
  const ecoProgress = spring({
    frame: Math.max(0, frame - Math.round(travelStart * fps)),
    fps,
    config: { damping: 18, stiffness: 90 }
  });

  // Subtle continuous micro-drift from long-take-world
  const driftY = Math.sin(timeSeconds * 0.7 + 1.5) * 3;

  // Ecosystem List Rows (chapter-progress-list model)
  const ecosystemRows = [
    {
      icon: "💬",
      title: "قنوات المراسلة المعتمدة",
      desc: "واتساب وتيليجرام بتكامل مباشر",
      active: true,
      badge: "الأساس المعتمد"
    },
    {
      icon: "🌐",
      title: "تكاملات وخدمات خارجية",
      desc: "ربط سلس مع الأنظمة والواجهات البرمجية",
      active: false
    },
    {
      icon: "⚡",
      title: "إمكانيات أوسع وسير عمل",
      desc: "معالجة آلية وأدوات ذكية تدعم الإنتاجية",
      active: false
    },
    {
      icon: "🔗",
      title: "تطبيقات ومنصات متصلة",
      desc: "بيئة عمل موحدة وتوسيع نطاق الاستخدام",
      active: false
    }
  ];

  return (
    <AbsoluteFill
      style={{
        opacity: sceneOpacity,
        overflow: "hidden",
        pointerEvents: "none",
        zIndex: 5
      }}
    >
      {/* World Grid Backdrop (from long-take-world) */}
      <div
        style={{
          position: "absolute",
          left: 0,
          top: 0,
          width: "100%",
          height: "100%",
          backgroundImage: `
            linear-gradient(rgba(56, 189, 248, 0.04) 1px, transparent 1px),
            linear-gradient(90deg, rgba(56, 189, 248, 0.04) 1px, transparent 1px)
          `,
          backgroundSize: "64px 64px",
          maskImage: "radial-gradient(circle at 35% 45%, black 45%, transparent 80%)",
          WebkitMaskImage: "radial-gradient(circle at 35% 45%, black 45%, transparent 80%)",
          zIndex: 0
        }}
      />

      {/* =========================================================================
          STAGE CONTAINER: Anchored in upper-left safe area
          ========================================================================= */}
      <div
        style={{
          position: "absolute",
          left: "56px",
          top: "60px",
          transform: `translateY(${driftY}px)`,
          zIndex: 2
        }}
      >
        {/* BEAT 1 (14.68s -> 21.80s): Core Integration Badges */}
        {ecoProgress < 0.95 && (
          <div
            style={{
              position: "absolute",
              left: 0,
              top: 0,
              width: "560px",
              opacity: 1 - ecoProgress,
              transform: `scale(${interpolate(ecoProgress, [0, 1], [1, 0.92])})`,
              pointerEvents: "none"
            }}
          >
            {/* Top Tag */}
            <div
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "8px",
                padding: "6px 14px",
                backgroundColor: tokens.colors.card_surface,
                borderRadius: `${tokens.radius.badge}px`,
                border: `1px solid ${tokens.colors.accent_primary}`,
                marginBottom: "16px"
              }}
            >
              <div
                style={{
                  width: "8px",
                  height: "8px",
                  borderRadius: "50%",
                  backgroundColor: tokens.colors.accent_primary
                }}
              />
              <span
                style={{
                  color: tokens.colors.accent_primary,
                  fontSize: `${tokens.typography.scale.micro}px`,
                  fontWeight: tokens.typography.weights.bold,
                  fontFamily: tokens.typography.font_family_arabic
                }}
              >
                تكامل مباشر على منصات المحادثة
              </span>
            </div>

            {/* Central Headline */}
            <h1
              style={{
                color: tokens.colors.text_primary,
                fontSize: `${tokens.typography.scale.title}px`,
                fontWeight: tokens.typography.weights.bold,
                fontFamily: tokens.typography.font_family_arabic,
                margin: "0 0 20px 0",
                lineHeight: tokens.typography.line_heights.tight
              }}
            >
              ميزة التضمين المباشر
            </h1>

            {/* Dual Platform Cards (WhatsApp + Telegram) */}
            <div style={{ display: "flex", gap: "16px" }}>
              {/* WhatsApp Card */}
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "14px",
                  padding: "16px 22px",
                  backgroundColor: tokens.colors.card_surface,
                  backdropFilter: "blur(16px)",
                  borderRadius: `${tokens.radius.card}px`,
                  border: `${tokens.stroke.card_border}px solid #25D366`,
                  boxShadow: "0 14px 36px rgba(37, 211, 102, 0.22)"
                }}
              >
                <div
                  style={{
                    width: "44px",
                    height: "44px",
                    borderRadius: "50%",
                    backgroundColor: "#25D366",
                    display: "flex",
                    justifyContent: "center",
                    alignItems: "center"
                  }}
                >
                  <svg viewBox="0 0 24 24" width="26" height="26" fill="#FFFFFF">
                    <path d="M12.04 2c-5.46 0-9.91 4.45-9.91 9.91 0 1.75.46 3.45 1.32 4.95L2.05 22l5.25-1.38c1.45.79 3.08 1.21 4.74 1.21 5.46 0 9.91-4.45 9.91-9.91 0-2.65-1.03-5.14-2.9-7.01A9.816 9.816 0 0 0 12.04 2zm0 18.15c-1.48 0-2.93-.4-4.2-1.15l-.3-.18-3.12.82.83-3.04-.2-.31a8.19 8.19 0 0 1-1.26-4.38c0-4.54 3.7-8.24 8.24-8.24 2.2 0 4.27.86 5.82 2.42a8.18 8.18 0 0 1 2.41 5.83c.01 4.54-3.68 8.23-8.22 8.23zm4.52-6.16c-.25-.12-1.47-.72-1.7-.81-.23-.08-.39-.12-.56.12-.17.25-.64.81-.79.97-.14.17-.29.19-.54.06-.25-.12-1.05-.39-2-1.23-.74-.66-1.23-1.47-1.38-1.72-.14-.25-.02-.38.11-.51.11-.11.25-.29.37-.44.12-.14.17-.25.25-.41.08-.17.04-.31-.02-.44-.06-.12-.56-1.34-.76-1.84-.2-.48-.41-.42-.56-.43h-.48c-.17 0-.44.06-.66.31-.23.25-.88.86-.88 2.1 0 1.23.9 2.43 1.02 2.6.12.17 1.77 2.7 4.29 3.79.6.26 1.07.41 1.43.53.6.19 1.15.16 1.58.1.48-.07 1.47-.6 1.68-1.18.21-.58.21-1.07.14-1.18-.06-.11-.22-.17-.47-.29z" />
                  </svg>
                </div>
                <div>
                  <div
                    style={{
                      color: tokens.colors.text_primary,
                      fontSize: `${tokens.typography.scale.subhead}px`,
                      fontWeight: tokens.typography.weights.bold,
                      fontFamily: tokens.typography.font_family_arabic
                    }}
                  >
                    واتساب
                  </div>
                  <div
                    style={{
                      color: "#25D366",
                      fontSize: "12px",
                      fontFamily: tokens.typography.font_family_arabic,
                      fontWeight: 600
                    }}
                  >
                    منصة معتمدة
                  </div>
                </div>
              </div>

              {/* Telegram Card */}
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "14px",
                  padding: "16px 22px",
                  backgroundColor: tokens.colors.card_surface,
                  backdropFilter: "blur(16px)",
                  borderRadius: `${tokens.radius.card}px`,
                  border: `${tokens.stroke.card_border}px solid #229ED9`,
                  boxShadow: "0 14px 36px rgba(34, 158, 217, 0.22)"
                }}
              >
                <div
                  style={{
                    width: "44px",
                    height: "44px",
                    borderRadius: "50%",
                    backgroundColor: "#229ED9",
                    display: "flex",
                    justifyContent: "center",
                    alignItems: "center"
                  }}
                >
                  <svg viewBox="0 0 24 24" width="26" height="26" fill="#FFFFFF">
                    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm4.64 6.8c-.15 1.58-.8 5.42-1.13 7.19-.14.75-.42 1-.68 1.03-.58.05-1.02-.38-1.58-.75-.88-.58-1.38-.94-2.23-1.5-.99-.65-.35-1.01.22-1.59.15-.15 2.71-2.48 2.76-2.69a.2.2 0 0 0-.05-.18c-.06-.05-.14-.03-.21-.02-.09.02-1.49.95-4.22 2.79-.4.27-.76.41-1.08.4-.36-.01-1.04-.2-1.55-.37-.63-.2-1.12-.31-1.08-.66.02-.18.27-.36.74-.55 2.92-1.27 4.86-2.11 5.83-2.51 2.78-1.16 3.35-1.36 3.73-1.36.08 0 .27.02.39.12.1.08.13.19.14.27-.01.06.01.24 0 .37z" />
                  </svg>
                </div>
                <div>
                  <div
                    style={{
                      color: tokens.colors.text_primary,
                      fontSize: `${tokens.typography.scale.subhead}px`,
                      fontWeight: tokens.typography.weights.bold,
                      fontFamily: tokens.typography.font_family_arabic
                    }}
                  >
                    تيليجرام
                  </div>
                  <div
                    style={{
                      color: "#229ED9",
                      fontSize: "12px",
                      fontFamily: tokens.typography.font_family_arabic,
                      fontWeight: 600
                    }}
                  >
                    منصة معتمدة
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* BEAT 2 (21.80s -> 24.96s): Chapter Progress List / Desk Panel */}
        {ecoProgress > 0.05 && (
          <div
            style={{
              position: "relative",
              width: "550px",
              opacity: ecoProgress,
              transform: `translateY(${interpolate(ecoProgress, [0, 1], [24, 0])}px)`
            }}
          >
            {/* Cinematic Corner Brackets (from chapter-progress-list card) */}
            <div
              style={{
                position: "absolute",
                top: "-8px",
                left: "-8px",
                width: "16px",
                height: "16px",
                borderTop: `2px solid ${tokens.colors.accent_primary}`,
                borderLeft: `2px solid ${tokens.colors.accent_primary}`
              }}
            />
            <div
              style={{
                position: "absolute",
                top: "-8px",
                right: "-8px",
                width: "16px",
                height: "16px",
                borderTop: `2px solid ${tokens.colors.accent_primary}`,
                borderRight: `2px solid ${tokens.colors.accent_primary}`
              }}
            />
            <div
              style={{
                position: "absolute",
                bottom: "-8px",
                left: "-8px",
                width: "16px",
                height: "16px",
                borderBottom: `2px solid ${tokens.colors.accent_primary}`,
                borderLeft: `2px solid ${tokens.colors.accent_primary}`
              }}
            />
            <div
              style={{
                position: "absolute",
                bottom: "-8px",
                right: "-8px",
                width: "16px",
                height: "16px",
                borderBottom: `2px solid ${tokens.colors.accent_primary}`,
                borderRight: `2px solid ${tokens.colors.accent_primary}`
              }}
            />

            {/* Main Structured Panel Card */}
            <div
              style={{
                backgroundColor: tokens.colors.card_surface,
                backdropFilter: "blur(20px)",
                borderRadius: `${tokens.radius.card}px`,
                border: `${tokens.stroke.card_border}px solid ${tokens.colors.card_border}`,
                padding: "20px 24px",
                boxShadow: "0 22px 50px rgba(0, 0, 0, 0.5)"
              }}
            >
              {/* Header Bar */}
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  marginBottom: "16px",
                  paddingBottom: "12px",
                  borderBottom: `1px solid ${tokens.colors.card_border}`
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                  <div
                    style={{
                      width: "8px",
                      height: "8px",
                      borderRadius: "50%",
                      backgroundColor: tokens.colors.accent_primary,
                      boxShadow: `0 0 10px ${tokens.colors.accent_primary}`
                    }}
                  />
                  <span
                    style={{
                      color: tokens.colors.text_primary,
                      fontSize: `${tokens.typography.scale.subhead}px`,
                      fontWeight: tokens.typography.weights.bold,
                      fontFamily: tokens.typography.font_family_arabic
                    }}
                  >
                    عالم متصل واسع · منظومة متكاملة
                  </span>
                </div>
                <span
                  style={{
                    color: tokens.colors.accent_primary,
                    fontSize: `${tokens.typography.scale.micro}px`,
                    fontWeight: tokens.typography.weights.bold,
                    fontFamily: tokens.typography.font_family_arabic,
                    backgroundColor: "rgba(56, 189, 248, 0.12)",
                    padding: "4px 10px",
                    borderRadius: "6px"
                  }}
                >
                  اكتشاف المنظومة
                </span>
              </div>

              {/* Progressive List Rows */}
              <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                {ecosystemRows.map((row, idx) => {
                  const rowStagger = travelStart + 0.15 + idx * 0.12;
                  const rowProgress = spring({
                    frame: Math.max(0, frame - Math.round(rowStagger * fps)),
                    fps,
                    config: { damping: 18, stiffness: 120 }
                  });

                  return (
                    <div
                      key={idx}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        padding: "10px 14px",
                        borderRadius: "10px",
                        backgroundColor: row.active
                          ? "rgba(56, 189, 248, 0.12)"
                          : "rgba(255, 255, 255, 0.02)",
                        border: row.active
                          ? `1.5px solid ${tokens.colors.accent_primary}`
                          : "1px solid rgba(255, 255, 255, 0.05)",
                        opacity: rowProgress,
                        transform: `translateX(${interpolate(rowProgress, [0, 1], [-16, 0])}px)`
                      }}
                    >
                      <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                        <span style={{ fontSize: "20px" }}>{row.icon}</span>
                        <div>
                          <div
                            style={{
                              color: row.active
                                ? tokens.colors.accent_primary
                                : tokens.colors.text_primary,
                              fontSize: `${tokens.typography.scale.body}px`,
                              fontWeight: tokens.typography.weights.bold,
                              fontFamily: tokens.typography.font_family_arabic,
                              lineHeight: 1.2
                            }}
                          >
                            {row.title}
                          </div>
                          <div
                            style={{
                              color: tokens.colors.text_secondary,
                              fontSize: `${tokens.typography.scale.micro}px`,
                              fontFamily: tokens.typography.font_family_arabic,
                              marginTop: "2px"
                            }}
                          >
                            {row.desc}
                          </div>
                        </div>
                      </div>

                      {row.badge && (
                        <div
                          style={{
                            color: "#25D366",
                            fontSize: "11px",
                            fontWeight: 700,
                            fontFamily: tokens.typography.font_family_arabic,
                            backgroundColor: "rgba(37, 211, 102, 0.12)",
                            padding: "2px 8px",
                            borderRadius: "4px",
                            border: "1px solid rgba(37, 211, 102, 0.3)"
                          }}
                        >
                          {row.badge}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </div>
    </AbsoluteFill>
  );
};
