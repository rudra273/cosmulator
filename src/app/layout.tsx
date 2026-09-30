import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Cosmulator",
  description: "Zoom from the planets out through the Sun's neighbourhood, the Milky Way, the Local Group and the cosmic web to the edge of the observable universe — real positions, real data, in 3D in your browser.",
  keywords: ["solar system", "3d solar system", "milky way", "galaxy map", "cosmic web", "observable universe", "astronomy", "kepler laws", "orrery", "three.js"],
  authors: [{ name: "Cosmulator Team" }],
  openGraph: {
    title: "Cosmulator",
    description: "From the Solar System to the edge of the observable universe, one continuous zoom built on real data.",
    type: "website"
  }
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
