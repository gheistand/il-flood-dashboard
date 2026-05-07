'use client';

import dynamic from 'next/dynamic';
import { Suspense } from 'react';

const MapView = dynamic(() => import('./components/MapView'), { ssr: false });

export default function HomePage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center h-screen bg-gray-950 text-white">Loading map...</div>}>
      <MapView />
    </Suspense>
  );
}
