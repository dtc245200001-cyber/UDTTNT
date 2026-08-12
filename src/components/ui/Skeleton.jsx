import React from 'react';

export const Skeleton = ({ className = '' }) => {
  return (
    <div
      className={`bg-gradient-to-r from-gray-200 via-gray-100 to-gray-200 animate-pulse rounded-lg ${className}`}
    />
  );
};
