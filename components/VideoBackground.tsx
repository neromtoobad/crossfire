// Fixed full-page video wallpaper — the rotating World Cup trophy behind the
// arena. Heavily dimmed so content stays legible; the poster paints instantly
// and is what reduced-motion users see (the <video> is hidden via CSS).

import { A } from '../lib/arena'

export function VideoBackground() {
  return (
    <div aria-hidden style={{ position: 'fixed', inset: 0, zIndex: 0, overflow: 'hidden', pointerEvents: 'none', background: A.bg }}>
      {/* poster underlay — instant paint + reduced-motion still */}
      <div style={{
        position: 'absolute', inset: 0,
        backgroundImage: 'url(/wallpaper-poster.jpg)', backgroundSize: 'cover',
        backgroundPosition: 'center', opacity: 0.42,
      }} />
      <video
        className="cf-wallpaper-video"
        autoPlay muted loop playsInline preload="auto"
        poster="/wallpaper-poster.jpg"
        style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', opacity: 0.42 }}
      >
        <source src="/wallpaper.mp4" type="video/mp4" />
      </video>
      {/* legibility scrim — keeps headline/cards readable over the trophy */}
      <div style={{
        position: 'absolute', inset: 0,
        background: 'radial-gradient(1100px 720px at 62% 36%, rgba(3,7,12,0.45) 0%, rgba(3,7,12,0.78) 55%, rgba(3,7,12,0.94) 100%)',
      }} />
    </div>
  )
}
