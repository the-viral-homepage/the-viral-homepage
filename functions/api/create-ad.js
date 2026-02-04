function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

// GET = show a friendly message in the browser
export async function onRequestGet() {
  return json({
    ok: true,
    message: "create-ad endpoint is live. Send a POST request to create an ad."
  });
}

// POST = insert into D1
export async function onRequestPost({ request, env }) {
  try {
    const body = await request.json();

    const x = Number(body.x);
    const y = Number(body.y);
    const w = Number(body.w ?? body.width);
    const h = Number(body.h ?? body.height);
    const title = String(body.title ?? "").trim();
    const url = String(body.url ?? "").trim();
    const image_url = body.image_url ? String(body.image_url).trim() : null;

    // Validate
    if (![x, y, w, h].every(Number.isFinite) || w <= 0 || h <= 0) {
      return json({ ok: false, error: "x, y, w, h must be valid numbers (w/h > 0)" }, 400);
    }
    if (!title || !url) {
      return json({ ok: false, error: "title and url are required" }, 400);
    }

    // NOTE: your table uses image_url (not image)
    const res = await env.DB.prepare(
      `INSERT INTO ads (x, y, w, h, title, url, image_url, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, 'reserved')`
    )
      .bind(x, y, w, h, title, url, image_url)
      .run();

    return json({ ok: true, inserted: res.meta?.changes ?? 1 });
  } catch (err) {
    return json({ ok: false, error: err.message }, 500);
  }
}

