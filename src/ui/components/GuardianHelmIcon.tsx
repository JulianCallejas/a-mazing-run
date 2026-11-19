interface GuardianHelmIconProps {
  className?: string;
  /** Dim variant for "empty" slots. */
  muted?: boolean;
}

/** Horned great helm with burning eye slits: the guardian mark used across the UI. */
const GuardianHelmIcon = ({ className = 'w-4 h-4', muted = false }: GuardianHelmIconProps) => (
  <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
    <path
      d="M4 3.5 7.5 8M20 3.5 16.5 8"
      stroke={muted ? '#5a5446' : '#c9a25a'}
      strokeWidth="1.8"
      strokeLinecap="round"
      fill="none"
    />
    <path d="M6 9.5a6 6 0 0 1 12 0V20l-2.5 1.5h-7L6 20Z" fill={muted ? '#262a33' : '#3d424d'} stroke={muted ? '#3a3d45' : '#8a6d22'} />
    <rect x="7.6" y="12" width="3.4" height="1.6" rx=".5" fill={muted ? '#3a2a2a' : '#ff4630'} />
    <rect x="13" y="12" width="3.4" height="1.6" rx=".5" fill={muted ? '#3a2a2a' : '#ff4630'} />
    <rect x="11.2" y="10.5" width="1.6" height="7" fill={muted ? '#1d2027' : '#22252c'} />
  </svg>
);

export default GuardianHelmIcon;
