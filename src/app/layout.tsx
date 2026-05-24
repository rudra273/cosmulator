import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Cosmulator",
  description: "Explore the solar system in Cosmulator, a stunning, physics-accurate 3D educational platform. Solve orbital mechanics via Kepler's Laws, adjust time speed multipliers, and discover astronomical facts.",
  keywords: ["solar system", "3d solar system", "astronomy", "physics simulation", "kepler laws", "planets 3d", "astronomical library", "orrery", "next.js three.js", "three.js solar system"],
  authors: [{ name: "Cosmulator Team" }]
};

// Enables true mobile rendering: without this the page renders at desktop
// width and zooms out, so no media query would ever fire. user-scalable is
// disabled so pinch gestures drive the 3D OrbitControls, not browser zoom.
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  interactiveWidget: "resizes-visual",
  viewportFit: "cover", // lets the layout extend under notches so safe-area insets resolve
  themeColor: "#030408"
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>
        {children}
      </body>
    </html>
  );
}
