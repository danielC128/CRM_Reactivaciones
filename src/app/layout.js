import "./globals.css"; // Importa los estilos globales aquí
import ClientWrapper from "./components/ClientWrapper";
import { AppRouterCacheProvider } from "@mui/material-nextjs/v15-appRouter";

export const metadata = {
  title: "Maqui+",
  description: "Descripción de tu aplicación",
  icons: {
    icon: "/logo_maqui.png"
  }
};

export default function RootLayout({ children }) {
  return (
    <html lang="es">
      <body>
        <AppRouterCacheProvider>
          <ClientWrapper>{children}</ClientWrapper>
        </AppRouterCacheProvider>
      </body>
    </html>
  );
}
