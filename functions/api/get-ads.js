function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

export async function onRequestGet({ env }) {
  try {
    const { results } = await env.DB
      .prepare("SELECT * FROM ads ORDER BY id ASC")
      .all();

    return json({
      ok: true,
      ads: results
    });
  } catch (err) {
    return json({ ok: false, error: err.message }, 500);
  }
}
