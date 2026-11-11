export default function Logo({ compact = false }) {
  return (
    <span className="inline-flex items-center gap-2" aria-label="SkillConnect-HUB">
      <svg className="h-9 w-9 shrink-0" viewBox="0 0 40 40" role="img" aria-hidden="true">
        <rect width="40" height="40" rx="12" fill="#15805b" />
        <path d="M28.4 11.5c-2.5-2-5.2-3-8.2-3-4.1 0-7.1 2.1-7.1 5.4 0 3.1 2.5 4.4 7.1 5.4 4.4 1 6.8 2 6.8 5.1 0 3.4-3.1 5.9-7.8 5.9-3.4 0-6.3-1.1-8.8-3.4" fill="none" stroke="white" strokeWidth="3.5" strokeLinecap="round" />
        <circle cx="28.5" cy="11.5" r="2" fill="#b9f0d2" />
      </svg>
      {!compact && <span className="text-xl font-black tracking-[-.05em]">SkillConnect<span className="text-brand">HUB</span></span>}
    </span>
  );
}
