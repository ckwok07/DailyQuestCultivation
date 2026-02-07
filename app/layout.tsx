import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Daily Quest Cultivation",
  description: "Complete tasks, earn points, decorate your cat's space.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
