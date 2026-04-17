import QRCode from "qrcode";
import jsPDF from "jspdf";

export async function downloadSkuQr(sku: { sku_code: string; name: string }) {
  const dataUrl = await QRCode.toDataURL(sku.sku_code, { width: 512, margin: 2 });
  const a = document.createElement("a");
  a.href = dataUrl;
  a.download = `qr-${sku.sku_code}.png`;
  a.click();
}

export async function downloadSkuSheetPdf(skus: { sku_code: string; name: string }[]) {
  const pdf = new jsPDF({ unit: "mm", format: "a4" });
  const pageW = 210;
  const margin = 10;
  const cols = 3;
  const cellW = (pageW - margin * 2) / cols;
  const cellH = 60;
  let x = margin, y = margin;

  for (let i = 0; i < skus.length; i++) {
    const s = skus[i];
    const dataUrl = await QRCode.toDataURL(s.sku_code, { width: 256, margin: 1 });
    pdf.addImage(dataUrl, "PNG", x + cellW / 2 - 20, y + 5, 40, 40);
    pdf.setFontSize(8);
    pdf.text(s.sku_code, x + cellW / 2, y + 50, { align: "center" });
    pdf.setFontSize(7);
    pdf.text(s.name.slice(0, 20), x + cellW / 2, y + 55, { align: "center" });

    x += cellW;
    if ((i + 1) % cols === 0) {
      x = margin;
      y += cellH;
      if (y + cellH > 297 - margin && i < skus.length - 1) {
        pdf.addPage();
        y = margin;
      }
    }
  }
  pdf.save(`qr-skus-${Date.now()}.pdf`);
}
