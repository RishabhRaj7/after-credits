/* the /// AFTERCREDITS. brand lockup */
export default function Logo({ className = '' }: { className?: string }) {
  return (
    <span className={`flex items-center gap-2.5 ${className}`}>
      <svg viewBox="0 0 28 24" className="h-5 w-6 shrink-0" aria-hidden>
        <path d="M3 22 L10 2 h3.4 L6.4 22 Z" className="fill-blood" />
        <path d="M11 22 L18 2 h3.4 L14.4 22 Z" className="fill-blood" />
        <path d="M19 22 L26 2 h2 L21 22 Z" className="fill-blood" />
      </svg>
      <span className="font-display text-lg leading-none tracking-[0.08em] text-bone">
        AFTERCREDITS<span className="text-blood">.</span>
      </span>
    </span>
  );
}
