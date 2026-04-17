import jsPDF from "jspdf";

type InvoiceData = {
  orderId: string;
  clientName: string;
  clientRut?: string | null;
  clientCity?: string | null;
  items: { sku_code: string; name: string; quantity: number; unit_price: number }[];
  total: number;
  date: string;
};

export function generateInvoicePdf(data: InvoiceData): jsPDF {
  const pdf = new jsPDF();
  pdf.setFontSize(18);
  pdf.setFont("helvetica", "bold");
  pdf.text("FACTURA", 14, 20);

  pdf.setFontSize(10);
  pdf.setFont("helvetica", "normal");
  pdf.text("Procurement & Harbor SpA", 14, 28);
  pdf.text("Importadora Textil — Santiago, Chile", 14, 33);

  pdf.text(`N°: ${data.orderId.slice(0, 8).toUpperCase()}`, 150, 28);
  pdf.text(`Fecha: ${data.date}`, 150, 33);

  pdf.setFont("helvetica", "bold");
  pdf.text("Cliente:", 14, 48);
  pdf.setFont("helvetica", "normal");
  pdf.text(data.clientName, 14, 54);
  if (data.clientRut) pdf.text(`RUT: ${data.clientRut}`, 14, 59);
  if (data.clientCity) pdf.text(data.clientCity, 14, 64);

  let y = 80;
  pdf.setFont("helvetica", "bold");
  pdf.text("SKU", 14, y);
  pdf.text("Descripción", 50, y);
  pdf.text("Cant.", 130, y);
  pdf.text("Precio", 150, y);
  pdf.text("Total", 175, y);
  pdf.line(14, y + 2, 196, y + 2);

  pdf.setFont("helvetica", "normal");
  y += 8;
  data.items.forEach((it) => {
    pdf.text(it.sku_code, 14, y);
    pdf.text(it.name.slice(0, 35), 50, y);
    pdf.text(String(it.quantity), 130, y);
    pdf.text(`$${it.unit_price.toLocaleString("es-CL")}`, 150, y);
    pdf.text(`$${(it.quantity * it.unit_price).toLocaleString("es-CL")}`, 175, y);
    y += 7;
  });

  pdf.line(14, y, 196, y);
  y += 8;
  pdf.setFont("helvetica", "bold");
  pdf.text("TOTAL CLP:", 130, y);
  pdf.text(`$${data.total.toLocaleString("es-CL")}`, 175, y);

  return pdf;
}

export function downloadInvoice(data: InvoiceData) {
  const pdf = generateInvoicePdf(data);
  pdf.save(`factura-${data.orderId.slice(0, 8)}.pdf`);
}

export function whatsappShareUrl(phone: string, orderId: string, total: number) {
  const cleanPhone = phone.replace(/\D/g, "");
  const msg = encodeURIComponent(
    `Hola! Te envío la factura del pedido ${orderId.slice(0, 8).toUpperCase()} por un total de $${total.toLocaleString("es-CL")} CLP. Gracias por tu compra 🙏`
  );
  return `https://wa.me/${cleanPhone}?text=${msg}`;
}
