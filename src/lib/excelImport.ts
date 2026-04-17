import * as XLSX from "xlsx";

export async function parseSkuFile(file: File): Promise<any[]> {
  const buf = await file.arrayBuffer();
  const wb = XLSX.read(buf, { type: "array" });
  const sheet = wb.Sheets[wb.SheetNames[0]];
  return XLSX.utils.sheet_to_json(sheet);
}

export function downloadSkuTemplate() {
  const data = [
    { sku_code: "TX-001", name: "Lino Premium Azul", fabric: "Lino", color: "Azul", size: "1.5m", stock: 50, location: "Bodega A-1", cost_usd: 8.5, price_clp: 12000, trend_score: 85 },
  ];
  const ws = XLSX.utils.json_to_sheet(data);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "SKUs");
  XLSX.writeFile(wb, "plantilla-skus.xlsx");
}
