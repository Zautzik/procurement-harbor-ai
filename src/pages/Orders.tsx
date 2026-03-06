import { Plus, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { orders, clients, orderStatusLabels, type OrderStatus } from "@/data/mockData";
import { cn } from "@/lib/utils";

function statusColor(status: OrderStatus) {
  const map: Record<OrderStatus, string> = {
    draft: "bg-muted text-muted-foreground",
    confirmed: "bg-chart-2/10 text-chart-2",
    preparing: "bg-warning/10 text-accent-foreground",
    dispatched: "bg-primary/10 text-primary",
    paid: "bg-primary text-primary-foreground",
  };
  return map[status];
}

export default function Orders() {
  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-heading text-2xl font-bold">Pedidos & Clientes</h1>
          <p className="text-sm text-muted-foreground">{orders.length} pedidos · {clients.length} clientes</p>
        </div>
        <Button size="sm"><Plus className="h-4 w-4 mr-1" />Nuevo Pedido</Button>
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
                    <TableHead>ID</TableHead>
                    <TableHead>Cliente</TableHead>
                    <TableHead>Ítems</TableHead>
                    <TableHead className="text-right">Total</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead>Fecha</TableHead>
                    <TableHead>Vence</TableHead>
                    <TableHead></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {orders.map((o) => (
                    <TableRow key={o.id} className="cursor-pointer">
                      <TableCell className="font-mono text-xs">{o.id.toUpperCase()}</TableCell>
                      <TableCell className="font-medium">{o.clientName}</TableCell>
                      <TableCell>{o.items.length} SKUs</TableCell>
                      <TableCell className="text-right font-semibold">${o.total.toLocaleString()}</TableCell>
                      <TableCell>
                        <Badge className={cn("text-[10px]", statusColor(o.status))}>
                          {orderStatusLabels[o.status]}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-muted-foreground text-xs">{o.createdAt}</TableCell>
                      <TableCell className="text-muted-foreground text-xs">{o.dueDate}</TableCell>
                      <TableCell>
                        <Button variant="ghost" size="icon" className="h-7 w-7">
                          <Send className="h-3.5 w-3.5" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
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
                    <TableHead>Nombre</TableHead>
                    <TableHead>RUT</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Ciudad</TableHead>
                    <TableHead className="text-right">Compras Totales</TableHead>
                    <TableHead>Último Pedido</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {clients.map((c) => (
                    <TableRow key={c.id} className="cursor-pointer">
                      <TableCell className="font-medium">{c.name}</TableCell>
                      <TableCell className="font-mono text-xs">{c.rut}</TableCell>
                      <TableCell className="text-xs">{c.email}</TableCell>
                      <TableCell>{c.city}</TableCell>
                      <TableCell className="text-right font-semibold">${(c.totalPurchases / 1000000).toFixed(1)}M</TableCell>
                      <TableCell className="text-muted-foreground text-xs">{c.lastOrder}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
