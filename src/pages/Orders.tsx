import { useEffect, useState } from "react";
import { Plus, Download, FileDown, MessageCircle, DollarSign } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { exportToCsv } from "@/lib/exportCsv";
import { cn } from "@/lib/utils";
import { OrderForm } from "@/components/forms/OrderForm";
import { ClientForm } from "@/components/forms/ClientForm";
import { downloadInvoice, whatsappShareUrl } from "@/lib/invoicePdf";
import { toast } from "sonner";

type OrderStatus = "borrador" | "confirmado" | "preparando" | "despachado" | "pagado";

const orderStatusLabels: Record<OrderStatus, string> = {
  borrador: "Borrador", confirmado: "Confirmado", preparando: "Preparando", despachado: "Despachado", pagado: "Pagado",
};

type Order = {
  id: string; client_id: string | null; status: OrderStatus;
  total: number | null; paid_amount: number | null; payment_method: string | null; paid_at: string | null;
  created_at: string; clients?: any;
};

function statusColor(status: OrderStatus) {
  return {
    borrador: "bg-muted text-muted-foreground", confirmado: "bg-chart-2/10 text-chart-2",
    preparando: "bg-warning/10 text-accent-foreground", despachado: "bg-primary/10 text-primary",
    pagado: "bg-primary text-primary-foreground",
  }[status];
}

export default function Orders() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [clients, setClients] = useState<any[]>([]);
  const [payOrder, setPayOrder] = useState<Order | null>(null);
  const [payAmount, setPayAmount] = useState("");
  const [payMethod, setPayMethod] = useState("transferencia");
  const [payReference, setPayReference] = useState("");
  const [payHistory, setPayHistory] = useState<any[]>([]);

  const load = () => {
    supabase.from("orders").select("*, clients(name, rut, phone, city)").order("created_at", { ascending: false }).then(({ data }) => setOrders((data as any) || []));
    supabase.from("clients").select("*").order("name").then(({ data }) => setClients(data || []));
  };

  useEffect(() => { load(); }, []);

  const handleInvoice = async (orderId: string) => {
    const { data: order } = await supabase.from("orders").select("*, clients(*)").eq("id", orderId).single();
    if (!order) return toast.error("No encontrado");
    const { data: items } = await supabase.from("order_items").select("quantity, unit_price, skus(sku_code, name)").eq("order_id", orderId);
    downloadInvoice({
      orderId: order.id,
      clientName: (order as any).clients?.name || "Cliente",
      clientRut: (order as any).clients?.rut, clientCity: (order as any).clients?.city,
      items: (items || []).map((i: any) => ({ sku_code: i.skus?.sku_code || "", name: i.skus?.name || "", quantity: i.quantity, unit_price: i.unit_price })),
      total: order.total || 0,
      date: new Date(order.created_at).toLocaleDateString("es-CL"),
    });
  };

  const handleWhatsapp = (o: any) => {
    const phone = o.clients?.phone;
    if (!phone) return toast.error("Cliente sin teléfono");
    window.open(whatsappShareUrl(phone, o.id, o.total || 0), "_blank");
  };

  const openPayment = async (o: Order) => {
    setPayOrder(o); setPayAmount(""); setPayReference("");
    const { data } = await supabase.from("payments").select("*").eq("order_id", o.id).order("paid_at", { ascending: false });
    setPayHistory(data || []);
  };

  const registerPayment = async () => {
    if (!payOrder) return;
    const amount = parseFloat(payAmount);
    if (!amount || amount <= 0) return toast.error("Monto inválido");
    const balance = (payOrder.total || 0) - (payOrder.paid_amount || 0);
    if (amount > balance + 0.01) return toast.error(`Excede saldo ($${balance.toLocaleString()})`);

    const user = (await supabase.auth.getUser()).data.user;
    const { error } = await supabase.from("payments").insert({
      order_id: payOrder.id, amount, method: payMethod,
      reference: payReference || null, recorded_by: user?.id, currency: "CLP",
    });
    if (error) return toast.error(error.message);

    const fullyPaid = amount >= balance - 0.01;
    if (fullyPaid) {
      await supabase.from("orders").update({ status: "pagado" }).eq("id", payOrder.id);
    }
    await supabase.from("audit_log").insert({ action: "payment_registered", entity_type: "order", entity_id: payOrder.id, user_id: user?.id, performed_by: "human", details: { amount, method: payMethod, reference: payReference } });
    toast.success(fullyPaid ? "Pedido saldado completo" : `Abono de $${amount.toLocaleString()} registrado`);
    setPayOrder(null); setPayAmount(""); setPayReference("");
    load();
  };

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-heading text-2xl font-bold">Pedidos & Clientes</h1>
          <p className="text-sm text-muted-foreground">{orders.length} pedidos · {clients.length} clientes</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => exportToCsv("pedidos", orders.map(o => ({ ID: o.id, Cliente: o.clients?.name, Estado: o.status, Total: o.total, Pagado: o.paid_amount, Fecha: o.created_at })))}>
            <Download className="h-4 w-4 mr-1" />Exportar
          </Button>
          <ClientForm trigger={<Button variant="outline" size="sm"><Plus className="h-4 w-4 mr-1" />Cliente</Button>} onCreated={load} />
          <OrderForm trigger={<Button size="sm"><Plus className="h-4 w-4 mr-1" />Nuevo Pedido</Button>} onCreated={load} />
        </div>
      </div>

      <Tabs defaultValue="orders">
        <TabsList>
          <TabsTrigger value="orders">Pedidos</TabsTrigger>
          <TabsTrigger value="clients">Clientes</TabsTrigger>
        </TabsList>

        <TabsContent value="orders" className="mt-4">
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>ID</TableHead><TableHead>Cliente</TableHead>
                    <TableHead className="text-right">Total</TableHead><TableHead className="text-right">Pagado</TableHead>
                    <TableHead>Estado</TableHead><TableHead>Fecha</TableHead><TableHead></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {orders.map((o) => {
                    const balance = (o.total || 0) - (o.paid_amount || 0);
                    return (
                      <TableRow key={o.id}>
                        <TableCell className="font-mono text-xs">{o.id.slice(0, 8)}</TableCell>
                        <TableCell className="font-medium">{o.clients?.name || "—"}</TableCell>
                        <TableCell className="text-right font-semibold">${(o.total || 0).toLocaleString()}</TableCell>
                        <TableCell className="text-right">
                          <div className="text-xs">
                            <div className={cn("font-semibold", balance > 0 ? "text-destructive" : "text-primary")}>${(o.paid_amount || 0).toLocaleString()}</div>
                            {balance > 0 && <div className="text-muted-foreground">Saldo: ${balance.toLocaleString()}</div>}
                          </div>
                        </TableCell>
                        <TableCell><Badge className={cn("text-[10px]", statusColor(o.status))}>{orderStatusLabels[o.status]}</Badge></TableCell>
                        <TableCell className="text-muted-foreground text-xs">{new Date(o.created_at).toLocaleDateString()}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openPayment(o)} title="Registrar pago"><DollarSign className="h-3.5 w-3.5" /></Button>
                            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleInvoice(o.id)} title="Factura PDF"><FileDown className="h-3.5 w-3.5" /></Button>
                            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleWhatsapp(o)} title="WhatsApp"><MessageCircle className="h-3.5 w-3.5" /></Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                  {orders.length === 0 && <TableRow><TableCell colSpan={7} className="text-center text-sm text-muted-foreground py-8">Sin pedidos</TableCell></TableRow>}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="clients" className="mt-4">
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nombre</TableHead><TableHead>RUT</TableHead><TableHead>Email</TableHead>
                    <TableHead>Ciudad</TableHead><TableHead className="text-right">Compras</TableHead><TableHead>Último</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {clients.map((c) => (
                    <TableRow key={c.id}>
                      <TableCell className="font-medium">{c.name}</TableCell>
                      <TableCell className="font-mono text-xs">{c.rut}</TableCell>
                      <TableCell className="text-xs">{c.email}</TableCell>
                      <TableCell>{c.city}</TableCell>
                      <TableCell className="text-right font-semibold">${((c.total_purchases || 0) / 1000000).toFixed(1)}M</TableCell>
                      <TableCell className="text-muted-foreground text-xs">{c.last_order_date || "—"}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <Dialog open={!!payOrder} onOpenChange={(o) => !o && setPayOrder(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>Registrar Pago</DialogTitle></DialogHeader>
          {payOrder && (() => {
            const total = payOrder.total || 0;
            const paid = payOrder.paid_amount || 0;
            const balance = total - paid;
            const pct = total > 0 ? Math.min(100, Math.round((paid / total) * 100)) : 0;
            return (
              <div className="space-y-4">
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span>Pedido <span className="font-mono">{payOrder.id.slice(0, 8)}</span></span>
                    <span>{pct}% pagado</span>
                  </div>
                  <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
                    <div className="h-full bg-primary transition-all" style={{ width: `${pct}%` }} />
                  </div>
                  <div className="flex justify-between text-xs">
                    <span>Pagado: <b className="text-primary">${paid.toLocaleString()}</b></span>
                    <span>Saldo: <b className={balance > 0 ? "text-destructive" : "text-primary"}>${balance.toLocaleString()}</b></span>
                    <span>Total: <b>${total.toLocaleString()}</b></span>
                  </div>
                </div>

                {balance > 0 ? (
                  <div className="grid grid-cols-2 gap-3">
                    <div className="col-span-2"><Label>Monto del pago</Label>
                      <Input type="number" value={payAmount} onChange={(e) => setPayAmount(e.target.value)} placeholder="0" />
                      <div className="flex gap-1 mt-1">
                        <Button type="button" variant="ghost" size="sm" className="h-6 text-[10px]" onClick={() => setPayAmount(String(Math.round(balance / 2)))}>50%</Button>
                        <Button type="button" variant="ghost" size="sm" className="h-6 text-[10px]" onClick={() => setPayAmount(String(balance))}>Saldo total</Button>
                      </div>
                    </div>
                    <div><Label>Método</Label>
                      <select value={payMethod} onChange={(e) => setPayMethod(e.target.value)} className="w-full border rounded px-3 py-2 text-sm bg-background">
                        <option value="transferencia">Transferencia</option><option value="efectivo">Efectivo</option>
                        <option value="tarjeta">Tarjeta</option><option value="cheque">Cheque</option>
                      </select>
                    </div>
                    <div><Label>Referencia</Label>
                      <Input value={payReference} onChange={(e) => setPayReference(e.target.value)} placeholder="N° comprobante" />
                    </div>
                  </div>
                ) : (
                  <div className="rounded-md border border-primary/30 bg-primary/5 p-3 text-sm text-primary">Pedido saldado completo.</div>
                )}

                {payHistory.length > 0 && (
                  <div className="space-y-1">
                    <div className="text-xs font-medium text-muted-foreground">Historial ({payHistory.length})</div>
                    <div className="max-h-32 overflow-y-auto space-y-1">
                      {payHistory.map((p) => (
                        <div key={p.id} className="flex items-center justify-between text-xs border rounded px-2 py-1">
                          <span className="text-muted-foreground">{new Date(p.paid_at).toLocaleDateString()}</span>
                          <span className="capitalize">{p.method}</span>
                          {p.reference && <span className="font-mono text-[10px] text-muted-foreground">{p.reference}</span>}
                          <span className="font-semibold">${Number(p.amount).toLocaleString()}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            );
          })()}
          <DialogFooter>
            <Button variant="outline" onClick={() => setPayOrder(null)}>Cerrar</Button>
            {payOrder && (payOrder.total || 0) - (payOrder.paid_amount || 0) > 0 && (
              <Button onClick={registerPayment}>Registrar pago</Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
