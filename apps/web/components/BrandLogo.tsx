import { useId } from "react";

type BrandLogoProps = {
  size?: "nav" | "footer" | "shell";
  className?: string;
};

export default function BrandLogo({ size = "nav", className = "" }: BrandLogoProps) {
  const id = useId().replace(/:/g, "");
  const fruitGradientId = `${id}-fruit`;
  const leafGradientId = `${id}-leaf`;

  return (
    <span className={`brand-lockup brand-${size} ${className}`.trim()} aria-label="LisheAI">
      <svg className="brand-icon-svg" viewBox="0 0 64 64" aria-hidden="true">
        <defs>
          <linearGradient id={fruitGradientId} x1="17" y1="12" x2="48" y2="50" gradientUnits="userSpaceOnUse">
            <stop offset="0" stopColor="#4E8C60" />
            <stop offset="1" stopColor="#27513C" />
          </linearGradient>
          <linearGradient id={leafGradientId} x1="28" y1="4" x2="43" y2="18" gradientUnits="userSpaceOnUse">
            <stop offset="0" stopColor="#B7D787" />
            <stop offset="1" stopColor="#6D9D5D" />
          </linearGradient>
        </defs>
        <path
          d="M32.3 14.5c8.1 0 14.6 2.6 18.8 7.6 4 4.7 5.3 10.8 3.8 16.8-2.5 9.6-11.1 16.1-21 16.1-6 0-11.3-2.1-15.2-5.9-8-7.7-8.1-20.4-.3-28.4 3.8-4 8.8-6.2 13.9-6.2Z"
          fill={`url(#${fruitGradientId})`}
        />
        <path
          d="M31.4 14.1c1.6-5.4 5.4-9.2 11-11.1-.2 5.4-3.4 9.4-9.8 12.3l-1.2-1.2Z"
          fill={`url(#${leafGradientId})`}
        />
        <path
          d="M20.6 37.8c4.2-5.7 9.7-8.5 16.4-8.5 3.8 0 7.4 1 10.8 2.9"
          fill="none"
          stroke="#F6F1E8"
          strokeWidth="2.4"
          strokeLinecap="round"
        />
        <circle cx="48.3" cy="31.8" r="4.2" fill="#D88947" />
        <path
          d="M32.3 14.5c8.1 0 14.6 2.6 18.8 7.6 4 4.7 5.3 10.8 3.8 16.8-2.5 9.6-11.1 16.1-21 16.1-6 0-11.3-2.1-15.2-5.9-8-7.7-8.1-20.4-.3-28.4 3.8-4 8.8-6.2 13.9-6.2Z"
          fill="none"
          stroke="rgba(22,44,33,.14)"
          strokeWidth="1.5"
        />
      </svg>
      <span className="brand-wordmark">
        <span className="brand-word">Lishe</span>
        <span className="brand-ai">AI</span>
      </span>
    </span>
  );
}
