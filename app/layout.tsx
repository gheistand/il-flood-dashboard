import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Illinois Flood Dashboard',
  description: 'Real-time flood monitoring for Illinois stream gages',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link href="https://api.mapbox.com/mapbox-gl-js/v3.0.1/mapbox-gl.css" rel="stylesheet" />
      </head>
      <body className="bg-gray-950 text-white antialiased">{children}</body>
    </html>
  );
}
