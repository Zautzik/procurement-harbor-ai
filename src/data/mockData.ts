// ============ SKU / INVENTORY ============
export interface SKU {
  id: string;
  sku: string;
  name: string;
  fabric: string;
  color: string;
  size: string;
  stock: number;
  location: string;
  lastMovement: string;
  trendScore: number;
  price: number;
  image: string;
}

export const skus: SKU[] = [
  { id: "1", sku: "LIN-AZN-001", name: "Lino Azul Navy", fabric: "Lino", color: "Azul Navy", size: "1.5m", stock: 8, location: "Bodega A1", lastMovement: "2026-03-04", trendScore: 87, price: 12500, image: "🧵" },
  { id: "2", sku: "ALG-BLA-002", name: "Algodón Blanco Premium", fabric: "Algodón", color: "Blanco", size: "1.5m", stock: 45, location: "Bodega A2", lastMovement: "2026-03-05", trendScore: 72, price: 8900, image: "🧶" },
  { id: "3", sku: "POL-NEG-003", name: "Poliéster Negro Industrial", fabric: "Poliéster", color: "Negro", size: "1.5m", stock: 120, location: "Bodega B1", lastMovement: "2026-03-03", trendScore: 45, price: 5200, image: "🪡" },
  { id: "4", sku: "LIN-VER-004", name: "Lino Verde Oliva", fabric: "Lino", color: "Verde Oliva", size: "1.5m", stock: 22, location: "Bodega A1", lastMovement: "2026-03-01", trendScore: 91, price: 13200, image: "🧵" },
  { id: "5", sku: "ALG-ROS-005", name: "Algodón Rosa Palo", fabric: "Algodón", color: "Rosa Palo", size: "1.5m", stock: 35, location: "Bodega A3", lastMovement: "2026-03-02", trendScore: 68, price: 9100, image: "🧶" },
  { id: "6", sku: "SED-CRE-006", name: "Seda Crema Natural", fabric: "Seda", color: "Crema", size: "1.2m", stock: 15, location: "Bodega C1", lastMovement: "2026-02-28", trendScore: 95, price: 28500, image: "✨" },
  { id: "7", sku: "POL-GRI-007", name: "Poliéster Gris Acero", fabric: "Poliéster", color: "Gris", size: "1.5m", stock: 88, location: "Bodega B2", lastMovement: "2026-03-04", trendScore: 38, price: 4800, image: "🪡" },
  { id: "8", sku: "ALG-AZC-008", name: "Algodón Azul Cielo", fabric: "Algodón", color: "Azul Cielo", size: "1.5m", stock: 52, location: "Bodega A2", lastMovement: "2026-03-05", trendScore: 76, price: 9300, image: "🧶" },
  { id: "9", sku: "LIN-BEI-009", name: "Lino Beige Sand", fabric: "Lino", color: "Beige", size: "1.5m", stock: 18, location: "Bodega A1", lastMovement: "2026-02-25", trendScore: 82, price: 12800, image: "🧵" },
  { id: "10", sku: "MIX-TER-010", name: "Mezcla Terracota", fabric: "Algodón/Lino", color: "Terracota", size: "1.5m", stock: 30, location: "Bodega A3", lastMovement: "2026-03-01", trendScore: 89, price: 11200, image: "🧵" },
  { id: "11", sku: "SED-NEG-011", name: "Seda Negro Elegante", fabric: "Seda", color: "Negro", size: "1.2m", stock: 10, location: "Bodega C1", lastMovement: "2026-02-27", trendScore: 78, price: 32000, image: "✨" },
  { id: "12", sku: "ALG-VER-012", name: "Algodón Verde Menta", fabric: "Algodón", color: "Verde Menta", size: "1.5m", stock: 42, location: "Bodega A2", lastMovement: "2026-03-03", trendScore: 84, price: 8700, image: "🧶" },
  { id: "13", sku: "POL-AZR-013", name: "Poliéster Azul Royal", fabric: "Poliéster", color: "Azul Royal", size: "1.5m", stock: 95, location: "Bodega B1", lastMovement: "2026-03-04", trendScore: 52, price: 5500, image: "🪡" },
  { id: "14", sku: "LIN-LAV-014", name: "Lino Lavanda", fabric: "Lino", color: "Lavanda", size: "1.5m", stock: 12, location: "Bodega A1", lastMovement: "2026-02-20", trendScore: 93, price: 14000, image: "🧵" },
  { id: "15", sku: "ALG-AMA-015", name: "Algodón Amarillo Sol", fabric: "Algodón", color: "Amarillo", size: "1.5m", stock: 28, location: "Bodega A3", lastMovement: "2026-03-02", trendScore: 61, price: 8500, image: "🧶" },
];

// ============ SHIPMENTS ============
export type ShipmentStatus = "ordered" | "production" | "shipped" | "customs" | "warehouse";

export interface Shipment {
  id: string;
  po: string;
  supplier: string;
  status: ShipmentStatus;
  value: number;
  eta: string;
  itemCount: number;
  items: string[];
  createdAt: string;
}

export const shipmentStatusLabels: Record<ShipmentStatus, string> = {
  ordered: "Ordenado",
  production: "En Producción",
  shipped: "Embarcado",
  customs: "En Aduana",
  warehouse: "En Bodega",
};

export const shipments: Shipment[] = [
  { id: "s1", po: "PO-2026-001", supplier: "Suzhou Textiles Ltd.", status: "shipped", value: 18500000, eta: "2026-03-20", itemCount: 4, items: ["LIN-AZN-001", "LIN-VER-004", "LIN-BEI-009", "LIN-LAV-014"], createdAt: "2026-01-15" },
  { id: "s2", po: "PO-2026-002", supplier: "Guangzhou Cotton Co.", status: "production", value: 12300000, eta: "2026-04-10", itemCount: 3, items: ["ALG-BLA-002", "ALG-ROS-005", "ALG-AZC-008"], createdAt: "2026-02-01" },
  { id: "s3", po: "PO-2026-003", supplier: "Shanghai Silk House", status: "customs", value: 9800000, eta: "2026-03-12", itemCount: 2, items: ["SED-CRE-006", "SED-NEG-011"], createdAt: "2026-01-20" },
];

// ============ CLIENTS ============
export interface Client {
  id: string;
  name: string;
  rut: string;
  email: string;
  phone: string;
  city: string;
  totalPurchases: number;
  lastOrder: string;
}

export const clients: Client[] = [
  { id: "c1", name: "Textiles del Pacífico Ltda.", rut: "76.543.210-K", email: "compras@texpacifico.cl", phone: "+56 9 8765 4321", city: "Santiago", totalPurchases: 45200000, lastOrder: "2026-03-01" },
  { id: "c2", name: "Moda Sustentable SpA", rut: "77.123.456-7", email: "pedidos@modasustentable.cl", phone: "+56 9 1234 5678", city: "Valparaíso", totalPurchases: 28900000, lastOrder: "2026-02-15" },
  { id: "c3", name: "Confecciones Andinas", rut: "78.987.654-3", email: "ventas@andinas.cl", phone: "+56 9 5555 1234", city: "Concepción", totalPurchases: 15600000, lastOrder: "2026-02-28" },
  { id: "c4", name: "Diseños Atacama", rut: "79.111.222-1", email: "info@atacamadisenos.cl", phone: "+56 9 7777 8888", city: "Antofagasta", totalPurchases: 8300000, lastOrder: "2026-01-20" },
  { id: "c5", name: "Telas Premium Chile", rut: "80.222.333-5", email: "contacto@telaspremium.cl", phone: "+56 9 3333 4444", city: "Santiago", totalPurchases: 62100000, lastOrder: "2026-03-05" },
];

// ============ ORDERS ============
export type OrderStatus = "draft" | "confirmed" | "preparing" | "dispatched" | "paid";

export interface Order {
  id: string;
  clientId: string;
  clientName: string;
  items: { sku: string; name: string; qty: number; unitPrice: number }[];
  total: number;
  status: OrderStatus;
  createdAt: string;
  dueDate: string;
}

export const orderStatusLabels: Record<OrderStatus, string> = {
  draft: "Borrador",
  confirmed: "Confirmado",
  preparing: "Preparando",
  dispatched: "Despachado",
  paid: "Pagado",
};

export const orders: Order[] = [
  { id: "o1", clientId: "c1", clientName: "Textiles del Pacífico Ltda.", items: [{ sku: "LIN-AZN-001", name: "Lino Azul Navy", qty: 5, unitPrice: 12500 }, { sku: "ALG-BLA-002", name: "Algodón Blanco Premium", qty: 10, unitPrice: 8900 }], total: 151500, status: "confirmed", createdAt: "2026-03-01", dueDate: "2026-03-15" },
  { id: "o2", clientId: "c5", clientName: "Telas Premium Chile", items: [{ sku: "SED-CRE-006", name: "Seda Crema Natural", qty: 3, unitPrice: 28500 }, { sku: "LIN-LAV-014", name: "Lino Lavanda", qty: 4, unitPrice: 14000 }], total: 141500, status: "preparing", createdAt: "2026-03-03", dueDate: "2026-03-18" },
  { id: "o3", clientId: "c2", clientName: "Moda Sustentable SpA", items: [{ sku: "ALG-VER-012", name: "Algodón Verde Menta", qty: 20, unitPrice: 8700 }], total: 174000, status: "paid", createdAt: "2026-02-15", dueDate: "2026-03-01" },
];

// ============ TRENDS ============
export interface Trend {
  id: string;
  name: string;
  category: string;
  score: number;
  change: number;
  season: string;
  market: string;
  description: string;
  sparkline: number[];
  matchedSkus: string[];
}

export const trends: Trend[] = [
  { id: "t1", name: "Lino Natural Sin Teñir", category: "Telas", score: 94, change: 12, season: "Primavera 2026", market: "Chile", description: "Fuerte demanda de linos sin procesos químicos. Movimiento eco-conscious en moda chilena.", sparkline: [40, 55, 60, 72, 78, 85, 94], matchedSkus: ["LIN-BEI-009", "LIN-VER-004"] },
  { id: "t2", name: "Colores Tierra & Terracota", category: "Color", score: 91, change: 8, season: "Otoño 2026", market: "Chile", description: "Paleta earth-tone dominando pasarelas latinoamericanas. Terracota, arena, oliva.", sparkline: [50, 58, 65, 70, 80, 88, 91], matchedSkus: ["MIX-TER-010", "LIN-BEI-009"] },
  { id: "t3", name: "Seda Sustentable", category: "Telas", score: 89, change: 15, season: "Todo el año", market: "Colombia", description: "Seda con certificación ética. Mercado premium en expansión.", sparkline: [30, 42, 55, 68, 75, 82, 89], matchedSkus: ["SED-CRE-006", "SED-NEG-011"] },
  { id: "t4", name: "Lavanda & Lila", category: "Color", score: 86, change: 20, season: "Primavera 2026", market: "México", description: "Gen Z impulsa tonos lavanda en moda casual y streetwear.", sparkline: [25, 38, 50, 62, 70, 78, 86], matchedSkus: ["LIN-LAV-014"] },
  { id: "t5", name: "Algodón Orgánico", category: "Telas", score: 82, change: 5, season: "Todo el año", market: "Perú", description: "Estándar GOTS cada vez más exigido por retailers grandes.", sparkline: [60, 65, 68, 72, 75, 79, 82], matchedSkus: ["ALG-BLA-002", "ALG-ROS-005", "ALG-VER-012"] },
  { id: "t6", name: "Azul Cielo Pastel", category: "Color", score: 76, change: -3, season: "Verano 2026", market: "Chile", description: "Tendencia estable pero sin crecimiento. Saturación en mercado fast fashion.", sparkline: [78, 80, 79, 78, 77, 77, 76], matchedSkus: ["ALG-AZC-008"] },
  { id: "t7", name: "Texturas Mixtas", category: "Técnica", score: 72, change: 10, season: "Otoño 2026", market: "Chile", description: "Mezclas de fibras naturales con sintéticos reciclados en alza.", sparkline: [35, 42, 50, 55, 62, 68, 72], matchedSkus: ["MIX-TER-010"] },
  { id: "t8", name: "Poliéster Reciclado", category: "Telas", score: 58, change: -8, season: "Todo el año", market: "Chile", description: "Percepción negativa por greenwashing. Demanda cayendo.", sparkline: [75, 70, 68, 65, 62, 60, 58], matchedSkus: ["POL-NEG-003", "POL-GRI-007", "POL-AZR-013"] },
];

// ============ REVENUE DATA ============
export const revenueByMonth = [
  { month: "Oct", revenue: 4200000 },
  { month: "Nov", revenue: 5100000 },
  { month: "Dic", revenue: 6800000 },
  { month: "Ene", revenue: 3900000 },
  { month: "Feb", revenue: 5500000 },
  { month: "Mar", revenue: 4800000 },
];

export const topSkusBySales = [
  { name: "Algodón Blanco", value: 890 },
  { name: "Poliéster Negro", value: 720 },
  { name: "Algodón Azul Cielo", value: 580 },
  { name: "Algodón Verde Menta", value: 520 },
  { name: "Lino Azul Navy", value: 450 },
];

export const stockByFabric = [
  { name: "Algodón", value: 202, fill: "hsl(var(--chart-1))" },
  { name: "Poliéster", value: 303, fill: "hsl(var(--chart-2))" },
  { name: "Lino", value: 60, fill: "hsl(var(--chart-3))" },
  { name: "Seda", value: 25, fill: "hsl(var(--chart-4))" },
  { name: "Mezcla", value: 30, fill: "hsl(var(--chart-5))" },
];

// ============ ACTIVITY FEED ============
export interface Activity {
  id: string;
  action: string;
  actor: string;
  method: "manual" | "ai";
  timestamp: string;
}

export const activities: Activity[] = [
  { id: "a1", action: "Stock actualizado: Algodón Blanco +20 rollos", actor: "Carlos M.", method: "manual", timestamp: "2026-03-06 09:15" },
  { id: "a2", action: "Alerta: Stock bajo Lino Azul Navy (8 rollos)", actor: "ThreadOps AI", method: "ai", timestamp: "2026-03-06 08:45" },
  { id: "a3", action: "Orden #o2 creada para Telas Premium Chile", actor: "María P.", method: "manual", timestamp: "2026-03-05 17:30" },
  { id: "a4", action: "Embarque PO-2026-003 pasó a En Aduana", actor: "ThreadOps AI", method: "ai", timestamp: "2026-03-05 14:20" },
  { id: "a5", action: "Tendencia detectada: Lino Natural Sin Teñir ↑12pts", actor: "ThreadOps AI", method: "ai", timestamp: "2026-03-05 10:00" },
  { id: "a6", action: "Factura generada para Moda Sustentable SpA", actor: "Carlos M.", method: "manual", timestamp: "2026-03-04 16:45" },
  { id: "a7", action: "Nuevo cliente registrado: Diseños Atacama", actor: "María P.", method: "manual", timestamp: "2026-03-04 11:30" },
  { id: "a8", action: "Pago recibido: Orden #o3 $174.000 CLP", actor: "Sistema", method: "manual", timestamp: "2026-03-03 15:00" },
];

// ============ CHAT MESSAGES ============
export interface ChatMessage {
  id: string;
  role: "user" | "bot";
  content: string;
  timestamp: string;
  attachments?: { type: "image" | "file"; name: string }[];
  actions?: { label: string; icon: string; action: string }[];
  card?: { type: "sku" | "shipment" | "alert"; data: Record<string, unknown> };
}

export const chatMessages: ChatMessage[] = [
  {
    id: "m1", role: "bot", content: "¡Buenos días! 👋 Soy **ThreadOps**, tu asistente de Procurement & Harbor. ¿En qué puedo ayudarte hoy?",
    timestamp: "09:00",
  },
  {
    id: "m2", role: "bot", content: "⚠️ **Alerta de Stock Bajo**\n\n**Lino Azul Navy** (LIN-AZN-001) tiene solo **8 rollos** en Bodega A1. El score de tendencia es **87/100** — alta demanda.\n\n¿Genero una orden de compra?",
    timestamp: "09:01",
    actions: [
      { label: "✅ Generar OC", icon: "check", action: "generate_po" },
      { label: "📋 Ver detalles", icon: "list", action: "view_details" },
      { label: "⏰ Recordar mañana", icon: "clock", action: "remind" },
    ],
  },
  {
    id: "m3", role: "user", content: "¿Cuánto lino azul me queda?",
    timestamp: "09:05",
  },
  {
    id: "m4", role: "bot", content: "📦 **Lino Azul Navy** (LIN-AZN-001)\n\n- Stock actual: **8 rollos**\n- Ubicación: Bodega A1\n- Último movimiento: 4 Mar 2026\n- Trend Score: **87/100** 📈\n- Precio: $12.500 CLP/rollo\n\nHay un embarque en camino (PO-2026-001) con más unidades, ETA: **20 Mar 2026**.",
    timestamp: "09:05",
    card: {
      type: "sku",
      data: { sku: "LIN-AZN-001", stock: 8, trend: 87 },
    },
  },
  {
    id: "m5", role: "user", content: "Muéstrame el estado de los embarques",
    timestamp: "09:10",
  },
  {
    id: "m6", role: "bot", content: "🚢 **Embarques Activos**\n\n1. **PO-2026-001** — Suzhou Textiles\n   - Estado: 🌊 Embarcado\n   - Valor: $18.5M CLP\n   - ETA: 20 Mar 2026\n\n2. **PO-2026-002** — Guangzhou Cotton\n   - Estado: 🏭 En Producción\n   - Valor: $12.3M CLP\n   - ETA: 10 Abr 2026\n\n3. **PO-2026-003** — Shanghai Silk\n   - Estado: 🛃 En Aduana\n   - Valor: $9.8M CLP\n   - ETA: 12 Mar 2026\n\n¿Quieres ver los detalles de algún embarque?",
    timestamp: "09:10",
    actions: [
      { label: "📋 PO-001", icon: "list", action: "view_po_001" },
      { label: "📋 PO-002", icon: "list", action: "view_po_002" },
      { label: "📋 PO-003", icon: "list", action: "view_po_003" },
    ],
  },
];
