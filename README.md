# 📺 Tagesschau AI Summary

Eine Next.js Web-App, die täglich die Nachrichten der Tagesschau 20 Uhr zusammenfasst.
Besonderheit: Nutzt **Gemini 3.1 Flash-Lite** mit Video-Understanding für detaillierte visuelle Beschreibungen.

## Tech-Stack
- **Framework:** [Next.js](https://nextjs.org/) (App Router)
- **Database:** [Vercel KV](https://vercel.com/storage/kv) (Redis)
- **AI:** [Google Gemini 3.1 Flash-Lite](https://ai.google.dev/)
- **Email:** [Resend](https://resend.com/)
- **API:** [YouTube Data API v3](https://developers.google.com/youtube/v3)

## Setup & Lokale Entwicklung

### 1. Repository klonen & Abhängigkeiten installieren
```bash
npm install
```

### 2. Umgebungsvariablen konfigurieren
Kopiere die Datei `.env.local.example` zu `.env.local` und fülle die Werte aus:
```bash
cp .env.local.example .env.local
```
- **YouTube API Key:** In der Google Cloud Console erstellen.
- **Gemini API Key:** Im Google AI Studio erstellen.
- **Resend API Key:** In Resend erstellen.
- **Vercel KV:** Im Vercel Dashboard anlegen und URL/TOKEN kopieren.

### 3. Server starten
```bash
npm run dev
```

## Funktionsweise Backend
Der Cron Job ist unter `/api/cron` erreichbar.
1. **YouTube-Update:** Fragt das neueste Video der Playlist ID `PL4A2F331EE86DCC22` ab.
2. **Duplikats-Check:** Prüft in Vercel KV, ob die `videoId` bereits verarbeitet wurde.
3. **KI-Analyse:** Sendet die YouTube-Video-URL an Gemini 3.1 Flash-Lite.
4. **E-Mail-Versand:** Sendet die Zusammenfassung als HTML-E-Mail via Resend.
5. **Dauerhafte Speicherung:** Legt die Zusammenfassung in einer Vercel KV-Liste (`summaries`) ab.

## Deployment auf Vercel
1. Projekt mit Vercel verbinden.
2. Alle Umgebungsvariablen aus der `.env.local` im Vercel Dashboard unter **Settings → Environment Variables** hinzufügen.
3. Der Cron Job (`/api/cron`) wird automatisch durch die `vercel.json` registriert (täglich 19:45 UTC).
4. **WICHTIG:** Den `CRON_SECRET` Wert sowohl in der `.env.local` als auch im Vercel Dashboard identisch setzen!
