import { Card, CardContent } from "@/components/ui/card";
import { AlertCircle } from "lucide-react";
import { usePageMeta } from "@/hooks/use-page-meta";

export default function NotFound() {
  // Unknown SPA routes are served with HTTP 200 by the Vercel rewrite, so the
  // client-side robots signal is what keeps stray URLs out of the index.
  usePageMeta({ title: "Page not found — Birthday Surprise", noindex: true });

  return (
    <main className="min-h-screen w-full flex items-center justify-center bg-gray-50">
      <Card className="w-full max-w-md mx-4">
        <CardContent className="pt-6">
          <div className="flex mb-4 gap-2">
            <AlertCircle className="h-8 w-8 text-red-500" aria-hidden="true" />
            <h1 className="text-2xl font-bold text-gray-900">404 Page Not Found</h1>
          </div>

          <p className="mt-4 text-sm text-gray-600">
            This page doesn't exist. <a href="/" className="underline">Go back to Birthday Surprise</a>.
          </p>
        </CardContent>
      </Card>
    </main>
  );
}
