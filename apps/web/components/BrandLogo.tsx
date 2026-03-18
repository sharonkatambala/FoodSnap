type BrandLogoProps = {
  size?: "nav" | "footer" | "shell";
  className?: string;
};

export default function BrandLogo({ size = "nav", className = "" }: BrandLogoProps) {
  return (
    <span className={`brand-lockup brand-${size} ${className}`.trim()} aria-label="LisheAI">
      <svg className="brand-icon-svg" viewBox="0 0 64 64" aria-hidden="true">
        <path
          d="M31.7 14.4c7.9 0 14.3 2.6 18.6 7.5 4.1 4.7 5.5 10.5 4.1 16.5-2.3 10-11 16.9-21.2 16.9-6.1 0-11.5-2.1-15.4-6-7.8-7.7-8-20.4-.4-28.4 3.9-4 8.9-6.5 14.3-6.5Z"
          fill="#2D5B45"
        />
        <path
          d="M31.4 14c2.1-5.3 5.9-8.9 11.3-10.6-.3 5.1-3.4 8.9-9.6 11.7L31.4 14Z"
          fill="#8DB171"
        />
        <path
          d="M21.1 37.9c4.2-5.4 9.6-8.1 16.1-8.1 3.9 0 7.3.9 10.5 2.8"
          fill="none"
          stroke="#F5EEE4"
          strokeWidth="2.2"
          strokeLinecap="round"
        />
        <circle cx="47.8" cy="31.4" r="4" fill="#D88947" />
        <path
          d="M31.7 14.4c7.9 0 14.3 2.6 18.6 7.5 4.1 4.7 5.5 10.5 4.1 16.5-2.3 10-11 16.9-21.2 16.9-6.1 0-11.5-2.1-15.4-6-7.8-7.7-8-20.4-.4-28.4 3.9-4 8.9-6.5 14.3-6.5Z"
          fill="none"
          stroke="rgba(18,36,28,.14)"
          strokeWidth="1.4"
        />
      </svg>
      <span className="brand-wordmark">
        <span className="brand-word">Lishe</span>
        <span className="brand-ai">AI</span>
      </span>
    </span>
  );
}
