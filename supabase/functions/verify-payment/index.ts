import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
      apiVersion: "2025-08-27.basil",
    });

    const { session_id, calculator_inputs, calculator_results } = await req.json();

    if (!session_id || typeof session_id !== "string" || !session_id.startsWith("cs_")) {
      return new Response(
        JSON.stringify({ verified: false, error: "Invalid session ID" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
      );
    }

    const session = await stripe.checkout.sessions.retrieve(session_id);
    const verified = session.payment_status === "paid";

    if (verified) {
      const supabaseAdmin = createClient(
        Deno.env.get("SUPABASE_URL") ?? "",
        Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
      );

      const customerEmail = session.customer_email || session.customer_details?.email || "";

      // Upsert purchase record (idempotent)
      const { error: upsertError } = await supabaseAdmin
        .from("purchases")
        .upsert(
          {
            stripe_session_id: session_id,
            customer_email: customerEmail,
            calculator_inputs: calculator_inputs || {},
            calculator_results: calculator_results || {},
          },
          { onConflict: "stripe_session_id" }
        );

      if (upsertError) {
        console.error("Purchase upsert error:", upsertError);
      }

      // PDF will be generated on-demand when user downloads

      return new Response(
        JSON.stringify({ verified: true, email: customerEmail }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
      );
    }

    return new Response(
      JSON.stringify({ verified: false }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
    );
  } catch (error) {
    console.error("Payment verification failed:", error);
    return new Response(
      JSON.stringify({ verified: false, error: "Verification failed" }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
    );
  }
});