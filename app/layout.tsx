import type { Metadata } from "next";
import type { ReactNode } from "react";
import { PlayerProvider } from "@/context/PlayerContext";
import "./globals.css";

export const metadata: Metadata = {
  title: "Daily Quest Cultivation",
  description: "Complete tasks, earn points, decorate your cat's space.",
};

export default function RootLayout({
  children,
}: Readonly<{ children: ReactNode }>) {
  return (
    <html lang="en">
      <body>
        <PlayerProvider>{children}</PlayerProvider>
      </body>
    </html>
  );
}
