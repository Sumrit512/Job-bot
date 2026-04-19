import "./globals.css";
import { Inter } from "next/font/google";
import ConvexClientProvider from "@/components/ConvexClientProvider";


const inter = Inter({ subsets: ["latin"] });

export const metadata = {
  title: "AutoJob Applier | Smart Job Automation",
  description: "Automate your job search and applications effortlessly.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <ConvexClientProvider>
          <div className="min-h-screen bg-slate-950 text-slate-100">
            <nav className="border-b border-slate-800 bg-slate-900/50 backdrop-blur-md sticky top-0 z-50">
              <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex items-center justify-between h-16">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center font-bold text-white shadow-lg shadow-blue-500/20">
                      A
                    </div>
                    <span className="font-bold text-xl tracking-tight">AutoJob</span>
                  </div>
                  <div className="flex gap-6 text-sm font-medium text-slate-400">
                    <a href="#" className="hover:text-white transition-colors">Dashboard</a>
                    <a href="#" className="hover:text-white transition-colors">Settings</a>
                    <a href="#" className="hover:text-white transition-colors">History</a>
                  </div>
                </div>
              </div>
            </nav>
            <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
              {children}
            </main>
          </div>
        </ConvexClientProvider>
      </body>
    </html>
  );
}
