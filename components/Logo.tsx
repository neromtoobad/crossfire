// CROSSFIRE logomark — two tapered laser beams crossing in an X: a crimson
// Bear beam and an azure Bull beam colliding at a white-hot flare. Literally
// "crossfire," and a 1:1 map onto the Bull/Bear thesis.
//
// One source of truth (replaces the flat 4-copy inline LogoMark). Server-safe:
// no hooks. Gradient/filter ids are made unique per instance via a module
// counter so multiple marks on one page never collide.
//
// Two tuned variants:
//   · mode="dark"  — full bloom on dark surfaces (the reference look)
//   · mode="light" — solid tapered beams + gold-ringed core that read on the
//                    editorial off-white paper (glow can't bloom on light)

import { CF } from '../lib/theme'

let __cfLogoSeq = 0

export type LogoMode = 'light' | 'dark'

// Theme-aware header mark. Renders BOTH variants and lets CSS show the right
// one per data-theme (rules live in app/layout.tsx) — no client JS, no
// hydration flash. Use this in headers; use <Logo mode=…> when you need a
// fixed variant (e.g. on a known-dark canvas).
export function BrandLogo({ size = 28 }: { size?: number }) {
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', lineHeight: 0 }}>
      <span className="cf-logo-light" style={{ display: 'inline-flex', lineHeight: 0 }}>
        <Logo size={size} mode="light" />
      </span>
      <span className="cf-logo-dark" style={{ display: 'none', lineHeight: 0 }}>
        <Logo size={size} mode="dark" />
      </span>
    </span>
  )
}

export function Logo({
  size = 26,
  mode = 'light',
  title,
}: {
  size?: number
  mode?: LogoMode
  title?: string
}) {
  const uid = `cf${(__cfLogoSeq = (__cfLogoSeq + 1) % 1_000_000)}`
  const isDark = mode === 'dark'

  // ── beam geometry (viewBox 0 0 64 64, center 32,32) ──────────────────────
  // Thin "needle" lenses: tips taper to a point, widest at the crossing.
  const bear = '13.62,13.62 33.91,30.09 50.38,50.38 30.09,33.91' // TL → BR
  const bull = '13.62,50.38 33.91,33.91 50.38,13.62 30.09,30.09' // BL → TR

  // vivid, logo-grade versions of the brand accents
  const RED = '#EF1D3A'
  const RED_HI = '#FF8A98'
  const BLU = isDark ? '#2E8BFF' : '#2563EB'
  const BLU_HI = isDark ? '#7CC4FF' : '#93C5FD'

  const glowSD = isDark ? 2.4 : 0.9
  const glowOpacity = isDark ? 0.85 : 0.42

  // Dark blooms with a soft white core; light keeps a narrow core so the beam
  // colors stay saturated against the off-white paper.
  const coreLo = isDark ? '42%' : '46%'
  const coreHi = isDark ? '58%' : '54%'

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      style={{ display: 'block' }}
      role={title ? 'img' : undefined}
      aria-label={title}
      aria-hidden={title ? undefined : true}
    >
      <defs>
        {/* bear beam gradient — transparent tips, hot white core */}
        <linearGradient id={`${uid}-bear`} gradientUnits="userSpaceOnUse" x1="13.62" y1="13.62" x2="50.38" y2="50.38">
          <stop offset="0%" stopColor={RED} stopOpacity="0" />
          <stop offset="16%" stopColor={RED} />
          <stop offset={coreLo} stopColor={RED_HI} />
          <stop offset="50%" stopColor="#FFFFFF" />
          <stop offset={coreHi} stopColor={RED_HI} />
          <stop offset="84%" stopColor={RED} />
          <stop offset="100%" stopColor={RED} stopOpacity="0" />
        </linearGradient>
        {/* bull beam gradient */}
        <linearGradient id={`${uid}-bull`} gradientUnits="userSpaceOnUse" x1="13.62" y1="50.38" x2="50.38" y2="13.62">
          <stop offset="0%" stopColor={BLU} stopOpacity="0" />
          <stop offset="16%" stopColor={BLU} />
          <stop offset={coreLo} stopColor={BLU_HI} />
          <stop offset="50%" stopColor="#FFFFFF" />
          <stop offset={coreHi} stopColor={BLU_HI} />
          <stop offset="84%" stopColor={BLU} />
          <stop offset="100%" stopColor={BLU} stopOpacity="0" />
        </linearGradient>
        {/* center bloom (dark only) */}
        <radialGradient id={`${uid}-flare`} cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#FFFFFF" stopOpacity="1" />
          <stop offset="14%" stopColor="#FFFFFF" stopOpacity="0.92" />
          <stop offset="38%" stopColor="#FFE6C2" stopOpacity="0.40" />
          <stop offset="100%" stopColor="#FFE6C2" stopOpacity="0" />
        </radialGradient>
        <filter id={`${uid}-glow`} x="-60%" y="-60%" width="220%" height="220%">
          <feGaussianBlur stdDeviation={glowSD} />
        </filter>
      </defs>

      {/* soft colored glow behind the beams */}
      <g filter={`url(#${uid}-glow)`} opacity={glowOpacity}>
        <polygon points={bear} fill={RED} />
        <polygon points={bull} fill={BLU} />
      </g>

      {/* dark-mode bloom halo at the crossing */}
      {isDark ? <circle cx="32" cy="32" r="15" fill={`url(#${uid}-flare)`} /> : null}

      {/* the beams */}
      <polygon points={bear} fill={`url(#${uid}-bear)`} />
      <polygon points={bull} fill={`url(#${uid}-bull)`} />

      {/* the crossing core */}
      {isDark ? (
        <>
          {/* 4-point sparkle */}
          <path d="M32 24 L33 32 L32 40 L31 32 Z" fill="#FFFFFF" opacity="0.95" />
          <path d="M24 32 L32 33 L40 32 L32 31 Z" fill="#FFFFFF" opacity="0.95" />
          <circle cx="32" cy="32" r="2" fill="#FFFFFF" />
        </>
      ) : (
        // light mode: a crisp white core ringed in editorial gold (on-chain accent)
        <>
          <circle cx="32" cy="32" r="3.1" fill="#FFFFFF" />
          <circle cx="32" cy="32" r="3.1" fill="none" stroke={CF.gold} strokeWidth="0.9" />
          <circle cx="32" cy="32" r="1.1" fill={CF.gold} />
        </>
      )}
    </svg>
  )
}
