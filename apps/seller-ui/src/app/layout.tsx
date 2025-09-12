import "./global.css";
import Providers from "./providers";
import { Poppins } from "next/font/google";

export const metadata = {
  title: "Micro-Commerce Seller",
  description:
    "An E-Commerce store to power visibility and sales for micro-commerce entrepreneurs.",
};

const poppins = Poppins({
  subsets: ["latin"],
  weight: ["100", "200", "300", "400", "500", "600", "700", "800", "900"],
  variable: "--font-poppins",
});

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body
        className={`min-h-screen bg-slate-900 font-sans antialiased ${poppins.variable}`}
      >
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
