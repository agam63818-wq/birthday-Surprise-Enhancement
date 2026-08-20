// Shared CORS headers — mirrors the pattern used by the existing
// create-razorpay-order and verify-razorpay-payment Edge Functions.
// Import this in every Edge Function that needs CORS support.

export const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
