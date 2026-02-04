function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

// GET = return all ads
export async function onRequestGet({ env }) {
  try {
    const result = await env.DB.prepare(
      "SELECT * FROM ads ORDER BY created_at ASC"
    ).all();

    return json({
      ok: true,
      ads: result.results
    });

  } catch (err) {
    return json({ ok: false, error: err.message }, 500);
  }
}
