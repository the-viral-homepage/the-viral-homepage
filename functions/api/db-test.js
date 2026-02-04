export async function onRequestGet({ env }) {
  const result = await env.DB.prepare("SELECT 1 as ok;").first();

  return new Response(JSON.stringify({
    status: "connected",
    result
  }), {
    headers: { "Content-Type": "application/json" }
  });
}
