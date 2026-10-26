import { Geist, Geist_Mono } from "next/font/google";
import AeroShardsBackground from "@/components/backgrounds/AeroShardsBackground";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
  display: "swap",
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
  display: "swap",
});

export const metadata = {
  title: {
    default: "Learning Workspace — Learn by understanding",
    template: "%s · Learning Workspace",
  },
  description:
    "An adaptive learning workspace for programming: personalized explanations, real code execution, evidence-based feedback, and spaced recall.",
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000",
  ),
  openGraph: {
    title: "Learning Workspace",
    description:
      "Learn by understanding. Build by doing. An adaptive workspace for learning to program.",
    type: "website",
  },
};

export default function RootLayout({ children }) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable}`}
    >
      <body>
        <AeroShardsBackground />
        <a className="skip-link" href="#main-content">
          Skip to content
        </a>
        <div className="site-content">{children}</div>
      </body>
    </html>
  );
}
