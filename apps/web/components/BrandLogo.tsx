import { useId } from "react";

type BrandLogoProps = {
  size?: "nav" | "footer" | "shell";
  className?: string;
};

export default function BrandLogo({ size = "nav", className = "" }: BrandLogoProps) {
  const id = useId().replace(/:/g, "");
  const fruitGradientId = `${id}-fruit`;
  const leafGradientId = `${id}-leaf`;
  const accentGradientId = `${id}-accent`;

  return (
    <span className={`brand-lockup brand-${size} ${className}`.trim()} aria-label="LisheAI">
      <svg className="brand-icon-svg" viewBox="0 0 64 64" aria-hidden="true">
        <defs>
          <linearGradient id={fruitGradientId} x1="14" y1="10" x2="48" y2="52" gradientUnits="userSpaceOnUse">
            <stop offset="0" stopColor="#5C9B67" />
            <stop offset="1" stopColor="#224C34" />
          </linearGradient>
          <linearGradient id={leafGradientId} x1="26" y1="4" x2="39" y2="18" gradientUnits="userSpaceOnUse">
            <stop offset="0" stopColor="#B9D989" />
            <stop offset="1" stopColor="#64945A" />
          </linearGradient>
          <linearGradient id={accentGradientId} x1="38" y1="24" x2="50" y2="39" gradientUnits="userSpaceOnUse">
            <stop offset="0" stopColor="#F3C58C" />
            <stop offset="1" stopColor="#D6783A" />
          </linearGradient>
        </defs>
        <path
          d="M33.5 13.5c9.7 0 18 7.7 18 18.8 0 11.7-8.7 19.7-20.3 19.7-10.8 0-18.7-7.6-18.7-18.9 0-10.8 8.2-19.6 18.8-19.6 1 0 1.5 0 2.2 0Z"
          fill={`url(#${fruitGradientId})`}
        />
        <path
          d="M31.2 14.2c4.6-3.1 8-7.7 8.7-11.2 3.7 1.9 5.5 4.6 5.5 7.8-2.4 1.5-6.5 3-12.4 3.4l-1.8.1Z"
          fill={`url(#${leafGradientId})`}
        />
        <path
          d="M26.8 10.8c-3.1-2.2-6-3.2-9.1-3.1 1 3.4 3.7 6.2 7.6 8.5l1.5-5.4Z"
          fill="#7BAE66"
          opacity=".92"
        />
        <path
          d="M17.4 33.9c0-9.6 7.1-16.6 16.7-16.6 5 0 8.8 1.5 11.9 4.2-2.4-1.1-5-1.6-7.9-1.6-10.7 0-18.4 7.1-18.4 17.7 0 4.3 1.5 8.3 4.3 11.4-4.2-2.3-6.6-7.8-6.6-15.1Z"
          fill="#88BF72"
          opacity=".18"
        />
        <circle cx="43.5" cy="35.5" r="7.3" fill={`url(#${accentGradientId})`} />
        <path
          d="M33.5 13.5c9.7 0 18 7.7 18 18.8 0 11.7-8.7 19.7-20.3 19.7-10.8 0-18.7-7.6-18.7-18.9 0-10.8 8.2-19.6 18.8-19.6 1 0 1.5 0 2.2 0Z"
          fill="none"
          stroke="rgba(27,53,35,.14)"
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
