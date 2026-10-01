export function BrandMark({ className = '' }: { className?: string }) {
  return (
    <svg viewBox="0 0 40 40" fill="none" aria-hidden="true" className={className}>
      <rect width="40" height="40" rx="12" fill="currentColor" />
      <path
        d="M12 11.5c-5 3 .3 17.5 3.2 17.5 2 0 1.6-7 4.8-7s2.8 7 4.8 7C27.7 29 33 14.5 28 11.5c-3.5-2.1-5.4.5-8 .5s-4.5-2.6-8-.5Z"
        stroke="white"
        strokeWidth="1.7"
        strokeLinejoin="round"
      />
      <path d="M17 15.2c1 .8 2 .9 3.2.9" stroke="white" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  )
}
