import { NextRequest, NextResponse } from "next/server";
import { google } from "googleapis";
import { kv } from "@vercel/kv";
import { Resend } from "resend";
import { GoogleGenAI } from "@google/genai";
import { revalidatePath } from "next/cache";

const PLAYLIST_ID = "PL4A2F331EE86DCC22";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface Summary {
  videoId: string;
  title: string;
  publishedAt: string;
  summary: string;
  createdAt: string;
}

// ─── Helper: build HTML email body ────────────────────────────────────────────

function buildEmailHtml(summary: Summary): string {
  const date = new Date(summary.publishedAt).toLocaleDateString("de-DE", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  // Convert markdown-like line breaks to <p> tags for the summary
  const summaryHtml = summary.summary
    .split(/\n\n+/)
    .map((p) => `<p style="margin:0 0 12px 0;line-height:1.7">${p.replace(/\n/g, "<br>")}</p>`)
    .join("");

  return `<!DOCTYPE html>
<html lang="de">
<head><meta charset="UTF-8"><title>Tagesschau-Zusammenfassung</title></head>
<body style="margin:0;padding:0;background:#0f172a;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;color:#e2e8f0">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#0f172a;padding:40px 16px">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#1e293b;border-radius:16px;overflow:hidden;box-shadow:0 25px 50px rgba(0,0,0,0.5)">

          <!-- Header -->
          <tr>
            <td style="background:linear-gradient(135deg,#1d4ed8,#7c3aed);padding:32px 40px">
              <p style="margin:0 0 6px 0;font-size:12px;font-weight:600;letter-spacing:0.1em;text-transform:uppercase;color:#a5b4fc">Automatische KI-Zusammenfassung</p>
              <h1 style="margin:0;font-size:28px;font-weight:800;color:#ffffff">Tagesschau 20 Uhr</h1>
              <p style="margin:10px 0 0 0;font-size:15px;color:#c7d2fe">${date}</p>
            </td>
          </tr>

          <!-- Title -->
          <tr>
            <td style="padding:28px 40px 0">
              <h2 style="margin:0;font-size:18px;font-weight:700;color:#f1f5f9">${summary.title}</h2>
            </td>
          </tr>

          <!-- Divider -->
          <tr>
            <td style="padding:20px 40px">
              <hr style="border:none;border-top:1px solid #334155;margin:0">
            </td>
          </tr>

          <!-- Summary -->
          <tr>
            <td style="padding:0 40px 28px;font-size:15px;color:#cbd5e1">
              ${summaryHtml}
            </td>
          </tr>

          <!-- CTA Button -->
          <tr>
            <td style="padding:0 40px 40px;text-align:center">
              <a href="https://www.youtube.com/watch?v=${summary.videoId}"
                 style="display:inline-block;background:linear-gradient(135deg,#1d4ed8,#7c3aed);color:#ffffff;text-decoration:none;padding:14px 32px;border-radius:10px;font-weight:700;font-size:15px;letter-spacing:0.02em">
                ▶ Sendung auf YouTube ansehen
              </a>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding:20px 40px 28px;border-top:1px solid #334155;text-align:center;font-size:12px;color:#64748b">
              Automatisch erstellt mit Gemini 3.1 Flash-Lite · Tagesschau-AI-Mail
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

// ─── Route Handler ─────────────────────────────────────────────────────────────

export async function GET(req: NextRequest) {
  // 1. Auth guard — Vercel sends "Authorization: Bearer <CRON_SECRET>" automatically
  const authHeader = req.headers.get("authorization");
  const expectedAuth = `Bearer ${process.env.CRON_SECRET}`;
  
  if (authHeader !== expectedAuth) {
    console.error(`[cron] Auth failed. Received: ${authHeader ? "present" : "missing"}, Expected matches secret: ${!!process.env.CRON_SECRET}`);
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    // 2. YouTube — fetch latest video from Tagesschau playlist
    const youtube = google.youtube({ version: "v3", auth: process.env.YOUTUBE_API_KEY });
    const playlistRes = await youtube.playlistItems.list({
      part: ["snippet"],
      playlistId: PLAYLIST_ID,
      maxResults: 1,
    });

    const item = playlistRes.data.items?.[0];
    if (!item?.snippet) {
      return NextResponse.json({ ok: false, message: "No playlist items found" }, { status: 200 });
    }

    const videoId = item.snippet.resourceId?.videoId;
    const title = item.snippet.title ?? "Tagesschau 20 Uhr";
    const publishedAt = item.snippet.publishedAt ?? new Date().toISOString();

    if (!videoId) {
      return NextResponse.json({ ok: false, message: "Could not extract videoId" }, { status: 200 });
    }

    // 3. Vercel KV — duplicate check
    const alreadyProcessed = await kv.get<boolean>(`processed:${videoId}`);
    if (alreadyProcessed) {
      return NextResponse.json({ ok: true, message: "Already processed", videoId }, { status: 200 });
    }

    // 4. Gemini — video understanding via fileData (YouTube URL as fileUri)
    const ai = new GoogleGenAI({ apiKey: process.env.GOOGLE_GENERATIVE_AI_API_KEY });

    const geminiResponse = await ai.models.generateContent({
      model: "gemini-3.1-flash-lite-preview",
      config: {
        systemInstruction:
          "Fasse diese Nachrichtensendung zusammen. Beschreibe dabei zwingend auch detailliert das visuelle Bildmaterial und die eingeblendeten Szenen.",
      },
      contents: [
        {
          role: "user",
          parts: [
            {
              fileData: {
                mimeType: "video/*",
                fileUri: `https://www.youtube.com/watch?v=${videoId}`,
              },
            },
            {
              text: "Bitte fasse diese Sendung wie im System-Prompt beschrieben zusammen.",
            },
          ],
        },
      ],
    });

    const summaryText = geminiResponse.text ?? "";
    if (!summaryText) {
      return NextResponse.json({ ok: false, message: "Gemini returned empty response" }, { status: 200 });
    }

    // 5. Resend — send formatted HTML email
    const resend = new Resend(process.env.RESEND_API_KEY);
    const summaryObj: Summary = {
      videoId,
      title,
      publishedAt,
      summary: summaryText,
      createdAt: new Date().toISOString(),
    };

    await resend.emails.send({
      from: process.env.RESEND_FROM_EMAIL ?? "onboarding@resend.dev",
      to: process.env.RESEND_TO_EMAIL ?? "frommann.paul@gmail.com",
      subject: `📺 Tagesschau-Zusammenfassung – ${new Date(publishedAt).toLocaleDateString("de-DE")}`,
      html: buildEmailHtml(summaryObj),
    });

    // 6. KV — mark as processed + push summary to list
    await kv.set(`processed:${videoId}`, true);
    await kv.lpush("summaries", JSON.stringify(summaryObj));

    return NextResponse.json({ ok: true, message: "Summary created", videoId }, { status: 200 });
  } catch (err) {
    console.error("[cron] Error:", err);
    return NextResponse.json(
      { ok: false, message: "Internal error", error: String(err) },
      { status: 500 }
    );
  }
}
