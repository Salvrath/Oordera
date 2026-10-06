import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const validateEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return typeof email === "string" && email.length <= 254 && emailRegex.test(email);
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
      apiVersion: "2025-08-27.basil",
    });

    let requestBody: { email?: string } = {};
    try {
      requestBody = await req.json();
    } catch {
      // No body is acceptable — email is optional
    }

    const origin = req.headers.get("origin") || "https://timpris-boss.lovable.app";

    const sessionParams: Stripe.Checkout.SessionCreateParams = {
      line_items: [
        {
          price: "price_1T2Ru4Cu1kSYbWFMam7QdeSy",
          quantity: 1,
        },
      ],
      mode: "payment",
      success_url: `${origin}/?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/?payment=canceled`,
    };

    if (requestBody.email) {
      if (!validateEmail(requestBody.email)) {
        return new Response(
          JSON.stringify({ error: "Invalid email format" }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
        );
      }
      sessionParams.customer_email = requestBody.email;
    }

    const session = await stripe.checkout.sessions.create(sessionParams);

    return new Response(JSON.stringify({ url: session.url }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    console.error("Payment creation failed:", error);
    return new Response(
      JSON.stringify({ error: "Payment processing failed. Please try again." }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      }
    );
  }
});