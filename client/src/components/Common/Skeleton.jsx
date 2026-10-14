import React from "react";
import "./Skeleton.css";

export const SkeletonLine = ({ width = "100%", height = "16px", className = "" }) => (
  <div className={`skeleton-shimmer skeleton-line ${className}`} style={{ width, height }} />
);

export const SkeletonCard = ({ lines = 3, className = "" }) => (
  <div className={`skeleton-card-container ${className}`}>
    <div className="skeleton-card-header">
      <SkeletonLine width="60%" height="18px" />
      <SkeletonLine width="28px" height="28px" className="skeleton-rounded" />
    </div>
    <div className="skeleton-card-body">
      {Array.from({ length: lines }).map((_, i) => (
        <SkeletonLine key={i} width={i === 0 ? "80%" : "50%"} height="14px" />
      ))}
    </div>
  </div>
);

export const SkeletonCards = ({ count = 3, lines = 3, className = "" }) => (
  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: "1rem" }}>
    {Array.from({ length: count }).map((_, i) => (
      <SkeletonCard key={i} lines={lines} className={className} />
    ))}
  </div>
);

export const SkeletonTable = ({ rows = 5, cols = 4, className = "" }) => (
  <div className={`skeleton-table-wrapper ${className}`}>
    <div className="skeleton-table-header">
      {Array.from({ length: cols }).map((_, i) => (
        <SkeletonLine key={i} width="70%" height="14px" />
      ))}
    </div>
    <div className="skeleton-table-body">
      {Array.from({ length: rows }).map((_, r) => (
        <div key={r} className="skeleton-table-row">
          {Array.from({ length: cols }).map((_, c) => (
            <SkeletonLine key={c} width={c === 0 ? "90%" : "60%"} height="14px" />
          ))}
        </div>
      ))}
    </div>
  </div>
);

export default {
  SkeletonLine,
  SkeletonCard,
  SkeletonCards,
  SkeletonTable
};
