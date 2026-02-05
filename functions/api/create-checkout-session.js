function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json",
      // same-origin is fine; add CORS later only if needed
    },
  });
}

// Optional: browser GET shows a friendly message
export async function onRequestGet() {
  return json({
    ok: true,
    message: "POST to /api/create-checkout-session to create a Stripe Checkout session.",
  });
}

export async function onRequestPost({ request, env }) {
  try {
    // ✅ REQUIRED: set this in Cloudflare Pages -> Settings -> Variables & Secrets
    const STRIPE_SECRET_KEY = env.STRIPE_SECRET_KEY;
    if (!STRIPE_SECRET_KEY) {
      return json(
        {
          ok: false,
          error:
            "Missing STRIPE_SECRET_KEY in environment variables (Cloudflare Pages -> Variables & Secrets).",
        },
        500
      );
    }

    // You can send whatever you want from the frontend, but here’s the expected payload:
    // {
    //   "pixels": 2500,              // how many pixels they’re buying (w*h)
    //   "price_per_pixel": 0.01,     // dollars per pixel (ex: 0.01 = 1 cent)
    //   "success_path": "/success",  // optional
    //   "cancel_path": "/cancel"     // optional
    // }

    const body = await request.json().catch(() => ({}));

    const pixels = Number(body.pixels);
    const pricePerPixel = Number(body.price_per_pixel);

    if (!Number.isFinite(pixels) || pixels <= 0) {
      return json({ ok: false, error: "pixels must be a positive number." }, 400);
    }
    if (!Number.isFinite(pricePerPixel) || pricePerPixel <= 0) {
      return json(
        { ok: false, error: "price_per_pixel must be a positive number." },
        400
      );
    }

    // Amount in cents
    const amountCents = Math.round(pixels * pricePerPixel * 100);
    if (amountCents < 50) {
      return json(
        { ok: false, error: "Minimum charge is $0.50 (50 cents) on Stripe Checkout." },
        400
      );
    }

    // Base URL for redirect (best: set env.BASE_URL = https://yourdomain.com)
    // Fallback: use request origin.
    const origin = new URL(request.url).origin;
    const baseUrl = env.BASE_URL || origin;

    const successPath = typeof body.success_path === "string" ? body.success_path : "/?success=1";
    const cancelPath = typeof body.cancel_path === "string" ? body.cancel_path : "/?canceled=1";

    const successUrl = new URL(successPath, baseUrl).toString();
    const cancelUrl = new URL(cancelPath, baseUrl).toString();

    // Build Stripe form-encoded params (Stripe expects x-www-form-urlencoded)
    const params = new URLSearchParams();
    params.set("mode", "payment");
    params.set("success_url", successUrl);
    params.set("cancel_url", cancelUrl);

    // Optional: collect email
    params.set("customer_creation", "always");

    // Line item
    params.set("line_items[0][quantity]", "1");
    params.set("line_items[0][price_data][currency]", "usd");
    params.set("line_items[0][price_data][unit_amount]", String(amountCents));
    params.set(
      "line_items[0][price_data][product_data][name]",
      `Pixel purchase (${pixels.toLocaleString()} px)`
    );
    params.set(
      "line_items[0][price_data][product_data][description]",
      `${pixels.toLocaleString()} pixels @ $${pricePerPixel} per pixel`
    );

    // ✅ IMPORTANT (for later): you’ll want metadata so your webhook can mark pixels as sold.
    // You can pass extra stuff like x,y,w,h or block_id here.
    // Example:
    // params.set("metadata[pixels]", String(pixels));

    params.set("metadata[pixels]", String(pixels));
    params.set("metadata[price_per_pixel]", String(pricePerPixel));

    // Create Checkout Session via Stripe API
    const stripeRes = await fetch("https://api.stripe.com/v1/checkout/sessions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${STRIPE_SECRET_KEY}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: params.toString(),
    });

    const stripeData = await stripeRes.json();

    if (!stripeRes.ok) {
      return json(
        {
          ok: false,
          error: "Stripe error",
          stripe: stripeData,
        },
        400
      );
    }

    // stripeData.url is the hosted checkout link
    return json({
      ok: true,
      id: stripeData.id,
      url: stripeData.url,
    });
  } catch (err) {
    return json(
      {
        ok: false,
        error: err?.message || "Unknown error",
      },
      500
    );
  }
}
