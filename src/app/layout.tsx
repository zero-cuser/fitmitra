import type { Metadata } from 'next';
import './globals.css';
import { AuthProvider } from '@/context/AuthContext';
import { WorkoutProvider } from '@/context/WorkoutContext';
import { AuthModal } from '@/components/Auth/AuthModal';

import { NetworkProvider } from '@/context/NetworkContext';

export const metadata: Metadata = {
  title: 'FitMitra - AI Biometric Fitness Coach',
  description: 'Zero-hardware client-side AI fitness coach with real-time pose estimation, kinematic rep counting, and posture guidance for student life.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&display=swap"
          rel="stylesheet"
        />
        {/* MediaPipe CDN scripts with defer for non-blocking browser fallback */}
        <script defer src="https://cdn.jsdelivr.net/npm/@mediapipe/camera_utils/camera_utils.js" crossOrigin="anonymous"></script>
        <script defer src="https://cdn.jsdelivr.net/npm/@mediapipe/pose/pose.js" crossOrigin="anonymous"></script>
      </head>
      <body className="bg-background text-text-primary min-h-screen antialiased selection:bg-primary selection:text-white">
        <NetworkProvider>
          <AuthProvider>
            <WorkoutProvider>
              {children}
              <AuthModal />
            </WorkoutProvider>
          </AuthProvider>
        </NetworkProvider>
      </body>
    </html>
  );
}
