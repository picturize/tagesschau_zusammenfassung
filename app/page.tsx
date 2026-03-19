import { kv } from "@vercel/kv";
import SummaryCard from "@/app/components/SummaryCard";
import type { Summary } from "@/app/api/cron/route";

// Revalidate the page every 5 minutes (in case new summaries arrive)
export const revalidate = 300;

async function getSummaries(): Promise<Summary[]> {
  try {
    const raw = await kv.lrange<string>("summaries", 0, -1);
    return raw
      .map((entry) => {
        try {
          return typeof entry === "string" ? (JSON.parse(entry) as Summary) : (entry as unknown as Summary);
        } catch {
          return null;
        }
      })
      .filter(Boolean) as Summary[];
  } catch {
    // Return empty list if KV is not configured (e.g. local dev without .env)
    return [];
  }
}

export default async function HomePage() {
  const summaries = await getSummaries();

  return (
    <>
      {/* ── Sticky Header ── */}
      <header className="site-header">
        <div className="container">
          <div className="header-logo" aria-hidden="true">
            📺
          </div>
          <span className="header-title">Tagesschau AI</span>
          <span className="header-badge">Täglich aktuell</span>
        </div>
      </header>

      <main>
        {/* ── Hero ── */}
        <section className="hero">
          <div className="container">
            <p className="hero-eyebrow">🤖 Powered by Gemini 3.1 Flash-Lite</p>
            <h1>
              Die Tagesschau,{" "}
              <span>zusammengefasst.</span>
            </h1>
            <p className="hero-subtitle">
              Jeden Abend fasst unsere KI die wichtigsten Nachrichten der
              Tagesschau 20 Uhr zusammen — inklusive detaillierter Bildbeschreibungen.
            </p>
          </div>
        </section>

        {/* ── Feed ── */}
        <section className="feed-section">
          <div className="container">
            <div className="feed-label">
              📰 Alle Zusammenfassungen ({summaries.length})
            </div>

            {summaries.length === 0 ? (
              <div className="empty-state">
                <div className="empty-state-icon">📭</div>
                <h2>Noch keine Zusammenfassungen</h2>
                <p>
                  Die erste Zusammenfassung erscheint heute Abend nach der
                  Tagesschau 20 Uhr automatisch hier.
                </p>
              </div>
            ) : (
              <div className="feed-list" role="feed" aria-label="Tagesschau-Zusammenfassungen">
                {summaries.map((s) => (
                  <SummaryCard key={s.videoId} summary={s} />
                ))}
              </div>
            )}
          </div>
        </section>
      </main>

      {/* ── Footer ── */}
      <footer className="site-footer">
        <div className="container">
          <p>
            Automatisch erstellt mit{" "}
            <a href="https://ai.google.dev" target="_blank" rel="noopener noreferrer">
              Google Gemini
            </a>{" "}
            · Quellsendung:{" "}
            <a
              href={`https://www.youtube.com/playlist?list=PL4A2F331EE86DCC22`}
              target="_blank"
              rel="noopener noreferrer"
            >
              Tagesschau auf YouTube
            </a>
          </p>
        </div>
      </footer>
    </>
  );
}
