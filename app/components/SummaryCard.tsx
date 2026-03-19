"use client";

import { useState } from "react";
import type { Summary } from "@/app/api/cron/route";

interface SummaryCardProps {
  summary: Summary;
}

export default function SummaryCard({ summary }: SummaryCardProps) {
  const [expanded, setExpanded] = useState(false);

  const date = new Date(summary.publishedAt).toLocaleDateString("de-DE", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  const shortDate = new Date(summary.publishedAt).toLocaleDateString("de-DE", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });

  return (
    <article className="card">
      {/* Gradient top accent bar */}
      <div className="card-accent" />

      <div className="card-body">
        {/* Meta row */}
        <div className="card-meta">
          <span className="card-date" title={date}>
            📅 {shortDate}
          </span>
          <span className="card-tag">🤖 KI-Zusammenfassung</span>
        </div>

        {/* Title */}
        <h2 className="card-title">{summary.title}</h2>

        {/* Summary text */}
        <p className={`card-summary ${expanded ? "" : "collapsed"}`}>
          {summary.summary}
        </p>
      </div>

      {/* Footer */}
      <div className="card-footer">
        <button
          id={`expand-${summary.videoId}`}
          className="btn-expand"
          onClick={() => setExpanded(!expanded)}
          aria-expanded={expanded}
        >
          {expanded ? "▲ Weniger anzeigen" : "▼ Vollständige Zusammenfassung"}
        </button>
        <a
          href={`https://www.youtube.com/watch?v=${summary.videoId}`}
          target="_blank"
          rel="noopener noreferrer"
          className="btn-youtube"
          id={`yt-link-${summary.videoId}`}
        >
          ▶ YouTube
        </a>
      </div>
    </article>
  );
}
