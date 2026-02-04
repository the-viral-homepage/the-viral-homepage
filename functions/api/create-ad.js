export async function onRequestPost({ request, env }) {
  try {
    const body = await request.json();
    const { x, y, width, height, title, url, image } = body;

    if (!x || !y || !width || !height || !title || !url) {
      return new Response(
        JSON.stringify({ error: "Missing required fields" }),
        { status: 400 }
      );
    }

    await env.DB.prepare(
      `INSERT INTO ads (x, y, w, h, title, url, image)
       VALUES (?, ?, ?, ?, ?, ?, ?)`
    )
      .bind(x, y, width, height, title, url, image || "")
      .run();

    return new Response(
      JSON.stringify({ success: true }),
      { headers: { "Content-Type": "application/json" } }
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ error: err.message }),
      { status: 500 }
    );
  }
}
