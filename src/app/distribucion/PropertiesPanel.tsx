"use client";

import { useCanvasStore } from "@/app/distribucion/canvasStore";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { ELEMENT_LABELS, isChairBlock, isTableType, type ElementType } from "@/lib/seatGeometry";

export function PropertiesPanel() {
  const elements = useCanvasStore((s) => s.elements);
  const selectedId = useCanvasStore((s) => s.selectedId);
  const updateElement = useCanvasStore((s) => s.updateElement);
  const removeElement = useCanvasStore((s) => s.removeElement);
  const selectElement = useCanvasStore((s) => s.selectElement);

  const selected = elements.find((el) => el.id === selectedId);

  if (!selected) {
    return (
      <Card>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Selecciona un elemento del canvas para ver y editar sus propiedades.
          </p>
        </CardContent>
      </Card>
    );
  }

  const isTable = isTableType(selected.type as ElementType);
  const isChairs = isChairBlock(selected.type as ElementType);

  return (
    <Card>
      <CardContent className="space-y-3">
        <h3 className="font-heading text-base font-medium text-foreground">
          {ELEMENT_LABELS[selected.type as ElementType]}
        </h3>

        <div>
          <Label htmlFor="prop-label">Etiqueta</Label>
          <Input
            id="prop-label"
            className="mt-1"
            value={selected.label}
            onChange={(e) => updateElement(selected.id, { label: e.target.value })}
          />
        </div>

        {isTable && (
          <>
            <div>
              <Label htmlFor="prop-table-number">Número de mesa</Label>
              <Input
                id="prop-table-number"
                type="number"
                min={1}
                className="mt-1"
                value={selected.tableNumber ?? 1}
                onChange={(e) => updateElement(selected.id, { tableNumber: Number(e.target.value) })}
              />
            </div>
            <div>
              <Label htmlFor="prop-capacity">Capacidad (personas)</Label>
              <Input
                id="prop-capacity"
                type="number"
                min={1}
                max={24}
                className="mt-1"
                value={selected.capacity ?? 1}
                onChange={(e) => updateElement(selected.id, { capacity: Number(e.target.value) })}
              />
            </div>
          </>
        )}

        {isChairs && (
          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label htmlFor="prop-rows">Filas</Label>
              <Input
                id="prop-rows"
                type="number"
                min={1}
                max={20}
                className="mt-1"
                value={selected.rows ?? 1}
                onChange={(e) => updateElement(selected.id, { rows: Number(e.target.value) })}
              />
            </div>
            <div>
              <Label htmlFor="prop-columns">Columnas</Label>
              <Input
                id="prop-columns"
                type="number"
                min={1}
                max={20}
                className="mt-1"
                value={selected.columns ?? 1}
                onChange={(e) => updateElement(selected.id, { columns: Number(e.target.value) })}
              />
            </div>
          </div>
        )}

        <div className="grid grid-cols-2 gap-2">
          <div>
            <Label htmlFor="prop-width">Ancho</Label>
            <Input
              id="prop-width"
              type="number"
              min={20}
              className="mt-1"
              value={Math.round(selected.width)}
              onChange={(e) =>
                updateElement(selected.id, {
                  width: Number(e.target.value),
                  ...(selected.type === "table-round" ? { height: Number(e.target.value) } : {}),
                })
              }
            />
          </div>
          <div>
            <Label htmlFor="prop-height">Alto</Label>
            <Input
              id="prop-height"
              type="number"
              min={20}
              className="mt-1"
              value={Math.round(selected.height)}
              disabled={selected.type === "table-round"}
              onChange={(e) => updateElement(selected.id, { height: Number(e.target.value) })}
            />
          </div>
        </div>

        <div>
          <Label htmlFor="prop-rotation">Rotación (grados)</Label>
          <Input
            id="prop-rotation"
            type="number"
            className="mt-1"
            value={Math.round(selected.rotation)}
            onChange={(e) => updateElement(selected.id, { rotation: Number(e.target.value) })}
          />
        </div>

        <div className="flex gap-2 pt-2">
          <Button
            variant="destructive"
            size="sm"
            onClick={() => {
              if (confirm(`¿Eliminar "${selected.label || ELEMENT_LABELS[selected.type as ElementType]}"?`)) {
                removeElement(selected.id);
              }
            }}
          >
            Eliminar
          </Button>
          <Button variant="outline" size="sm" onClick={() => selectElement(null)}>
            Deseleccionar
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
