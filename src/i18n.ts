import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import LanguageDetector from "i18next-browser-languagedetector";

const common = {
  es: {
    dashboard: "Dashboard", chat: "Chat IA", inventory: "Inventario", warehouses: "Bodegas", shipments: "Embarques",
    trends: "Trend Radar", orders: "Pedidos", aiAgent: "Agente IA", costing: "Costeo", settings: "Configuración",
    logout: "Cerrar Sesión", newSku: "Nuevo SKU", newOrder: "Nuevo Pedido", newShipment: "Nuevo Embarque",
    newClient: "Nuevo Cliente", export: "Exportar CSV", import: "Importar", save: "Guardar",
    cancel: "Cancelar", stock: "Stock", price: "Precio", language: "Idioma",
    alerts: "Alertas", noAlerts: "Sin alertas activas", acknowledge: "Reconocer",
    commandCenter: "Centro de Comando", realtimeView: "Vista ejecutiva en tiempo real",
    stockValue: "Valor Stock", inTransit: "En Tránsito", lowStock: "Stock Bajo",
    activity: "Actividad", orderFunnel: "Embudo de Pedidos", topSkus: "Top 5 SKUs por Valor",
    stockByFabric: "Stock por Tela", profile: "Perfil", roles: "Roles", search: "Buscar",
    audit: "Auditoría",
  },
  en: {
    dashboard: "Dashboard", chat: "AI Chat", inventory: "Inventory", warehouses: "Warehouses", shipments: "Shipments",
    trends: "Trend Radar", orders: "Orders", aiAgent: "AI Agent", costing: "Costing", settings: "Settings",
    logout: "Sign Out", newSku: "New SKU", newOrder: "New Order", newShipment: "New Shipment",
    newClient: "New Client", export: "Export CSV", import: "Import", save: "Save",
    cancel: "Cancel", stock: "Stock", price: "Price", language: "Language",
    alerts: "Alerts", noAlerts: "No active alerts", acknowledge: "Acknowledge",
    commandCenter: "Command Center", realtimeView: "Executive real-time view",
    stockValue: "Stock Value", inTransit: "In Transit", lowStock: "Low Stock",
    activity: "Activity", orderFunnel: "Order Funnel", topSkus: "Top 5 SKUs by Value",
    stockByFabric: "Stock by Fabric", profile: "Profile", roles: "Roles", search: "Search",
    audit: "Audit Log",
  },
  zh: {
    dashboard: "仪表盘", chat: "AI 聊天", inventory: "库存", warehouses: "仓库", shipments: "货运",
    trends: "趋势雷达", orders: "订单", aiAgent: "AI 代理", costing: "成本核算", settings: "设置",
    logout: "退出登录", newSku: "新建 SKU", newOrder: "新建订单", newShipment: "新建货运",
    newClient: "新建客户", export: "导出 CSV", import: "导入", save: "保存",
    cancel: "取消", stock: "库存", price: "价格", language: "语言",
    alerts: "警报", noAlerts: "无活动警报", acknowledge: "确认",
    commandCenter: "指挥中心", realtimeView: "实时执行视图",
    stockValue: "库存价值", inTransit: "运输中", lowStock: "库存不足",
    activity: "活动", orderFunnel: "订单漏斗", topSkus: "前5名 SKU",
    stockByFabric: "按面料库存", profile: "个人资料", roles: "角色", search: "搜索",
    audit: "审计日志",
  },
};

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: {
      es: { translation: common.es },
      en: { translation: common.en },
      zh: { translation: common.zh },
    },
    fallbackLng: "es",
    supportedLngs: ["es", "en", "zh"],
    interpolation: { escapeValue: false },
  });

export default i18n;
