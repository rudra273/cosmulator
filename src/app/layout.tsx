import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Cosmulator",
  description: "Explore the solar system in Cosmulator, a stunning, physics-accurate 3D educational platform. Solve orbital mechanics via Kepler's Laws, adjust time speed multipliers, and discover astronomical facts.",
  keywords: ["solar system", "3d solar system", "astronomy", "physics simulation", "kepler laws", "planets 3d", "astronomical library", "orrery", "next.js three.js", "three.js solar system"],
  authors: [{ name: "Cosmulator Team" }]
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
