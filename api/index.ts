import type { VercelRequest, VercelResponse } from "@vercel/node";

const BOT_PATTERN =
  /bot|chatgpt|facebookexternalhit|WhatsApp|google|baidu|bing|msn|duckduckbot|teoma|slurp|yandex|MetaInspector|Discordbot|Twitterbot|Slack|TelegramBot|LinkedIn/i;

function isBot(userAgent: string | undefined): boolean {
  if (!userAgent) return false;
  return BOT_PATTERN.test(userAgent);
}

interface OEmbedResponse {
  title: string;
  author_name: string;
  author_url: string;
  thumbnail_url?: string;
  description?: string;
}

async function fetchSoundCloudData(
  path: string
): Promise<OEmbedResponse | null> {
  const soundcloudUrl = `https://soundcloud.com${path}`;
  const oembedUrl = `https://soundcloud.com/oembed?format=json&url=${encodeURIComponent(
    soundcloudUrl
  )}`;

  try {
    const res = await fetch(oembedUrl);
    if (!res.ok) return null;
    return (await res.json()) as OEmbedResponse;
  } catch {
    return null;
  }
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function buildOgHtml(data: OEmbedResponse, path: string): string {
  const soundcloudUrl = `https://soundcloud.com${path}`;
  const title = escapeHtml(data.title);
  const description = data.description
    ? escapeHtml(data.description.slice(0, 200))
    : title;
  const image = data.thumbnail_url || "";

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>${title}</title>
  <meta property="og:title" content="${title}">
  <meta property="og:description" content="${description}">
  <meta property="og:type" content="music.song">
  <meta property="og:url" content="${soundcloudUrl}">
  <meta property="og:site_name" content="SoundCloud">
  ${image ? `<meta property="og:image" content="${image}">` : ""}
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content="${title}">
  <meta name="twitter:description" content="${description}">
  ${image ? `<meta name="twitter:image" content="${image}">` : ""}
  <meta name="theme-color" content="#ff5500">
</head>
<body>
  <p>Redirecting to SoundCloud...</p>
  <script>window.location.href = "${soundcloudUrl}";</script>
</body>
</html>`;
}

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
): Promise<void> {
  const path = req.url || "/";
  const userAgent = req.headers["user-agent"] as string | undefined;

  if (path === "/" || path === "") {
    res.setHeader("Content-Type", "text/html");
    res.status(200).send(`<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>SoundCloud OG</title>
  <style>
    body { font-family: system-ui, sans-serif; max-width: 600px; margin: 50px auto; padding: 0 20px; }
    code { background: #f0f0f0; padding: 2px 6px; border-radius: 3px; }
  </style>
</head>
<body>
  <h1>SoundCloud OG</h1>
  <p>Fix SoundCloud embeds in Discord, Slack, iMessage, etc.</p>
  <p>Replace <code>soundcloud.com</code> with <code>soundcloud-og.com</code> in any SoundCloud link.</p>
  <p>Example: <a href="https://soundcloud.com/habiboi/habiboi-soundcloud-virtual-headquarters" target="_blank">soundcloud-og.com/habiboi/habiboi-soundcloud-virtual-headquarters</a></p>
</body>
</html>`);
    return;
  }

  const soundcloudUrl = `https://soundcloud.com${path}`;

  if (!isBot(userAgent)) {
    res.redirect(308, soundcloudUrl);
    return;
  }

  const data = await fetchSoundCloudData(path);

  if (!data) {
    // Fallback: redirect to SoundCloud if oEmbed fails
    res.redirect(308, soundcloudUrl);
    return;
  }

  res.setHeader("Content-Type", "text/html");
  res.setHeader("Cache-Control", "public, max-age=3600");
  res.status(200).send(buildOgHtml(data, path));
}
