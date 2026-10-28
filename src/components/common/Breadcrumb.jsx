import React from 'react';
import { Link } from 'react-router-dom';

/**
 * Reusable Breadcrumb Component for Vietnam National Museum Portal
 *
 * @param {Array<{ label: string, path?: string }>} items - Breadcrumb items list
 * @param {'dark' | 'light'} variant - 'dark' for dark hero/banner (default), 'light' for light backgrounds
 * @param {string} className - Optional container className
 */
export const Breadcrumb = ({ items = [], variant = 'dark', className = '' }) => {
  if (!items || items.length === 0) return null;

  const isDark = variant === 'dark';

  return (
    <nav
      aria-label="Breadcrumb"
      className={`typo-breadcrumb text-[11px] font-bold tracking-widest uppercase mb-1.5 flex items-center select-none ${className}`}
    >
      <ol className="flex items-center gap-1.5 flex-wrap">
        {items.map((item, index) => {
          const isLast = index === items.length - 1;

          return (
            <li key={index} className="inline-flex items-center gap-1.5">
              {index > 0 && (
                <span
                  aria-hidden="true"
                  className={`${isDark ? 'text-[#D4A359]/60' : 'text-[#8B5A1E]/40'} select-none`}
                >
                  /
                </span>
              )}
              {isLast || !item.path ? (
                <span
                  aria-current={isLast ? 'page' : undefined}
                  className={isDark ? 'text-white/90' : 'text-[#3E2712] font-extrabold'}
                >
                  {item.label}
                </span>
              ) : (
                <Link
                  to={item.path}
                  className={`transition-colors duration-150 ${
                    isDark
                      ? 'text-[#D4A359] hover:text-[#F5E6B3] hover:underline'
                      : 'text-[#8B5A1E] hover:text-[#734814] hover:underline'
                  }`}
                >
                  {item.label}
                </Link>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
};
