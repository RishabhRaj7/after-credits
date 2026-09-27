/* the /// AFTERCREDITS. lockup */
export default function Logo({ className = '' }: { className?: string }) {
  return (
    <span className={`flex items-center gap-2 ${className}`}>
      <svg viewBox="0 0 28 24" className="h-4 w-5 shrink-0" aria-hidden>
        <path d="M3 22 L10 2 h3.4 L6.4 22 Z" className="fill-blood" />
        <path d="M11 22 L18 2 h3.4 L14.4 22 Z" className="fill-blood" />
        <path d="M19 22 L26 2 h2 L21 22 Z" className="fill-blood" />
      </svg>
      <span className="font-display text-[19px] font-extrabold leading-none tracking-[0.06em] text-bone">
        AFTERCREDITS<span className="text-blood">.</span>
      </span>
    </span>
  );
}
