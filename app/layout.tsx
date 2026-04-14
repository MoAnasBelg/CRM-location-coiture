import "./globals.css";
import { LayoutDashboard, Inbox, Users, Calendar, CarFront, Clock, Square } from "lucide-react";
import SidebarNav from "./components/SidebarNav";

export const metadata = {
  title: "CRM Location Voiture",
  description: "CRM pour agences de location de voiture au Maroc",
};



export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="fr" className="dark">
      <body className="bg-bg-main text-white h-screen flex overflow-hidden">
        <SidebarNav />
        <main className="flex-1 flex flex-col h-full overflow-hidden">
          {children}
        </main>
      </body>
    </html>
  );
}
