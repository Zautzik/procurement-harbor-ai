import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import LanguageDetector from "i18next-browser-languagedetector";

const resources = {
  es: {
    translation: {
      dashboard: "Dashboard",
      chat: "Chat IA",
      inventory: "Inventario",
      shipments: "Embarques",
      trends: "Trend Radar",
      orders: "Pedidos",
      aiAgent: "Agente IA",
      settings: "Configuración",
      logout: "Cerrar Sesión",
      newSku: "Nuevo SKU",
      newOrder: "Nuevo Pedido",
      newShipment: "Nuevo Embarque",
      newClient: "Nuevo Cliente",
      export: "Exportar CSV",
      import: "Importar",
      save: "Guardar",
      cancel: "Cancelar",
      stock: "Stock",
      price: "Precio",
      language: "Idioma",
    },
  },
  en: {
    translation: {
      dashboard: "Dashboard",
      chat: "AI Chat",
      inventory: "Inventory",
      shipments: "Shipments",
      trends: "Trend Radar",
      orders: "Orders",
      aiAgent: "AI Agent",
      settings: "Settings",
      logout: "Sign Out",
      newSku: "New SKU",
      newOrder: "New Order",
      newShipment: "New Shipment",
      newClient: "New Client",
      export: "Export CSV",
      import: "Import",
      save: "Save",
      cancel: "Cancel",
      stock: "Stock",
      price: "Price",
      language: "Language",
    },
  },
};

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources,
    fallbackLng: "es",
    supportedLngs: ["es", "en"],
    interpolation: { escapeValue: false },
  });

export default i18n;
