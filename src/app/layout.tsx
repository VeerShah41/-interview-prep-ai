import type { Metadata } from "next";
import "./globals.css";
import { AuthProvider } from "@/lib/hooks/useAuth";
import { ThemeProvider } from "@/lib/hooks/useTheme";

export const metadata: Metadata = {
  title: "MentorQ — AI Mock Interview Platform",
  description: "Practice behavioral interviews with an AI interviewer that listens, adapts, and gives you real-time feedback. Powered by voice AI.",
  keywords: ["mock interview", "AI interview", "behavioral interview", "STAR method", "interview practice"],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="stylesheet" href="https://cdn.jsdelivr.net/gh/devicons/devicon@latest/devicon.min.css" />
      </head>
      <body>
        <ThemeProvider>
          <AuthProvider>
            {children}
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
