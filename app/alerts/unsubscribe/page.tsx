import { getRequestContext } from '@cloudflare/next-on-pages';
import { getSubscriptionsByToken, deleteSubscription } from '@/lib/db';

export const runtime = 'edge';

interface Props {
  searchParams: Promise<{ token?: string }>;
}

export default async function UnsubscribePage({ searchParams }: Props) {
  const { token } = await searchParams;

  if (!token) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center p-4">
        <div className="bg-gray-900 rounded-xl p-8 max-w-md w-full border border-gray-700 text-center">
          <div className="text-4xl mb-4">❌</div>
          <h1 className="text-xl font-bold text-white mb-2">Invalid Link</h1>
          <p className="text-gray-400">This unsubscribe link is missing a token. Please use the link from your alert email.</p>
        </div>
      </div>
    );
  }

  let siteName: string | null = null;
  let found = false;

  try {
    const { env } = getRequestContext();
    const sub = await getSubscriptionsByToken(env.DB, token);
    if (sub) {
      siteName = sub.site_name;
      await deleteSubscription(env.DB, token);
      found = true;
    }
  } catch (err) {
    console.error('Unsubscribe error:', err);
  }

  return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center p-4">
      <div className="bg-gray-900 rounded-xl p-8 max-w-md w-full border border-gray-700 text-center">
        {found ? (
          <>
            <div className="text-4xl mb-4">✅</div>
            <h1 className="text-xl font-bold text-white mb-2">Unsubscribed</h1>
            <p className="text-gray-400">
              You&apos;ve been unsubscribed from flood alerts for <strong className="text-white">{siteName}</strong>.
            </p>
          </>
        ) : (
          <>
            <div className="text-4xl mb-4">⚠️</div>
            <h1 className="text-xl font-bold text-white mb-2">Link Expired</h1>
            <p className="text-gray-400">This link is expired or invalid. You may have already unsubscribed.</p>
          </>
        )}
        <a
          href="/"
          className="mt-6 inline-block text-blue-400 hover:text-blue-300 text-sm"
        >
          ← Back to Dashboard
        </a>
      </div>
    </div>
  );
}
