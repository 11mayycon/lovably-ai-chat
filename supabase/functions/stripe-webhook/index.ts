import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@14.21.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") as string, {
  apiVersion: "2023-10-16",
});

const webhookSecret = Deno.env.get("STRIPE_WEBHOOK_SECRET");
const supabaseUrl = Deno.env.get("SUPABASE_URL") as string;
const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") as string;

serve(async (req) => {
  const signature = req.headers.get("stripe-signature");

  if (!signature || !webhookSecret) {
    console.error("Missing signature or webhook secret");
    return new Response("Webhook signature missing", { status: 400 });
  }

  try {
    const body = await req.text();
    const event = stripe.webhooks.constructEvent(body, signature, webhookSecret);

    console.log("Webhook event received:", event.type);

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        console.log("Checkout completed:", session.id);

        const userId = session.metadata?.userId;
        const email = session.customer_email || session.customer_details?.email;

        if (!userId || !email) {
          console.error("Missing userId or email in session metadata");
          break;
        }

        // Calculate expiration date (30 days from now)
        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + 30);

        // Update or create subscription
        const { error } = await supabase
          .from("subscriptions")
          .upsert({
            user_id: userId,
            email: email,
            status: "active",
            expires_at: expiresAt.toISOString(),
            stripe_customer_id: session.customer as string,
            stripe_subscription_id: session.subscription as string,
          }, {
            onConflict: "user_id",
          });

        if (error) {
          console.error("Error updating subscription:", error);
          throw error;
        }

        console.log("Subscription activated for user:", userId);
        break;
      }

      case "invoice.payment_succeeded": {
        const invoice = event.data.object as Stripe.Invoice;
        console.log("Payment succeeded:", invoice.id);

        const customerId = invoice.customer as string;

        // Find subscription by customer ID
        const { data: subscription, error: findError } = await supabase
          .from("subscriptions")
          .select("*")
          .eq("stripe_customer_id", customerId)
          .single();

        if (findError || !subscription) {
          console.error("Subscription not found for customer:", customerId);
          break;
        }

        // Add 30 days to current expiration (or from now if expired)
        const currentExpiry = new Date(subscription.expires_at || new Date());
        const now = new Date();
        const baseDate = currentExpiry > now ? currentExpiry : now;
        
        baseDate.setDate(baseDate.getDate() + 30);

        const { error: updateError } = await supabase
          .from("subscriptions")
          .update({
            status: "active",
            expires_at: baseDate.toISOString(),
          })
          .eq("stripe_customer_id", customerId);

        if (updateError) {
          console.error("Error updating subscription:", updateError);
          throw updateError;
        }

        console.log("Subscription renewed for customer:", customerId);
        break;
      }

      case "invoice.payment_failed": {
        const invoice = event.data.object as Stripe.Invoice;
        console.log("Payment failed:", invoice.id);

        const customerId = invoice.customer as string;

        const { error } = await supabase
          .from("subscriptions")
          .update({
            status: "past_due",
          })
          .eq("stripe_customer_id", customerId);

        if (error) {
          console.error("Error updating subscription:", error);
          throw error;
        }

        console.log("Subscription marked as past_due for customer:", customerId);
        break;
      }

      default:
        console.log("Unhandled event type:", event.type);
    }

    return new Response(JSON.stringify({ received: true }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error: any) {
    console.error("Webhook error:", error.message);
    return new Response(`Webhook Error: ${error.message}`, {
      status: 400,
    });
  }
});