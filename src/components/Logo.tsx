import React from 'react';

interface LogoProps {
  size?: number;
  className?: string;
  showText?: boolean;
  onClick?: () => void;
  onGoHome?: () => void;
}

export const Logo: React.FC<LogoProps> = ({
  size = 26,
  className = '',
  showText = true,
  onClick,
  onGoHome,
}) => {
  const handleClick = onClick || onGoHome;

  if (handleClick) {
    return (
      <a
        href="/"
        className={`brand-logo-group ${className} bg-transparent border-0 p-0 text-left no-underline cursor-pointer`}
        onClick={(e) => {
          e.preventDefault();
          handleClick();
        }}
        aria-label="未来レーダー (MiraiRadar) トップページへ"
      >
        {/* Polymarket Style Geometric Minimal Glyph */}
        <svg
          width={size}
          height={size}
          viewBox="0 0 40 40"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          style={{ flexShrink: 0 }}
        >
          <rect width="40" height="40" rx="8" fill="#0f172a" stroke="#1e293b" strokeWidth="1.5" />
          <path
            d="M10 28 L18 19 L23 23 L30 12"
            stroke="url(#logoGrad)"
            strokeWidth="3.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <circle cx="30" cy="12" r="3" fill="#38bdf8" />
          <circle cx="30" cy="12" r="6" stroke="#38bdf8" strokeWidth="1" strokeOpacity="0.4" />

          <defs>
            <linearGradient id="logoGrad" x1="10" y1="28" x2="30" y2="12" gradientUnits="userSpaceOnUse">
              <stop stopColor="#0284c7" />
              <stop offset="1" stopColor="#38bdf8" />
            </linearGradient>
          </defs>
        </svg>

        {showText && (
          <div className="brand-text-single-line">
            <span className="brand-name-bold">MiraiRadar</span>
            <span className="brand-sub-tagline hide-on-mobile">世界の集合知×日本の世論</span>
          </div>
        )}
      </a>
    );
  }

  return (
    <div
      className={`brand-logo-group ${className} bg-transparent border-0 p-0 text-left`}
      aria-label="未来レーダー (MiraiRadar)"
    >
      {/* Polymarket Style Geometric Minimal Glyph */}
      <svg
        width={size}
        height={size}
        viewBox="0 0 40 40"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        style={{ flexShrink: 0 }}
      >
        <rect width="40" height="40" rx="8" fill="#0f172a" stroke="#1e293b" strokeWidth="1.5" />
        <path
          d="M10 28 L18 19 L23 23 L30 12"
          stroke="url(#logoGrad)"
          strokeWidth="3.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <circle cx="30" cy="12" r="3" fill="#38bdf8" />
        <circle cx="30" cy="12" r="6" stroke="#38bdf8" strokeWidth="1" strokeOpacity="0.4" />

        <defs>
          <linearGradient id="logoGrad" x1="10" y1="28" x2="30" y2="12" gradientUnits="userSpaceOnUse">
            <stop stopColor="#0284c7" />
            <stop offset="1" stopColor="#38bdf8" />
          </linearGradient>
        </defs>
      </svg>

      {showText && (
        <div className="brand-text-single-line">
          <span className="brand-name-bold">MiraiRadar</span>
          <span className="brand-sub-tagline hide-on-mobile">世界の集合知×日本の世論</span>
        </div>
      )}
    </div>
  );
};
