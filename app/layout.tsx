import type { Metadata } from "next";
import "./globals.css";
import { CinemaModeProvider } from "@/components/providers/CinemaModeProvider";
import { ToastProvider } from "@/components/providers/ToastProvider";
import { NewProjectModalProvider } from "@/components/providers/NewProjectModalProvider";
import Sidebar from "@/components/Sidebar";
import Topbar from "@/components/Topbar";
import PageTransition from "@/components/PageTransition";

export const metadata: Metadata = {
  title: "AZ Raven — Toda arte em busca da perfeição",
  description:
    "Transformando literatura em experiências cinematográficas com inteligência artificial.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Sora:wght@300;400;500;600;700;800&family=JetBrains+Mono:wght@400;500&display=swap"
        />
      </head>
      <body className="bg-bg text-white antialiased">
        <ToastProvider>
          <CinemaModeProvider>
            <NewProjectModalProvider>
              <div className="flex min-h-screen">
                <Sidebar />
                <div className="flex min-w-0 flex-1 flex-col">
                  <Topbar />
                  <main className="max-w-[1360px] px-7 pb-16 pt-6">
                    <PageTransition>{children}</PageTransition>
                  </main>
                </div>
              </div>
            </NewProjectModalProvider>
          </CinemaModeProvider>
        </ToastProvider>
      </body>
    </html>
  );
}
