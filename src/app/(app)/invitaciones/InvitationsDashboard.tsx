"use client";

import { useState } from "react";
import { MessageCircle, Palette, Send } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { SendPanel } from "@/app/(app)/invitaciones/SendPanel";
import { DesignEditor, type DesignEditorValues } from "@/app/(app)/invitaciones/DesignEditor";
import { MessageEditor } from "@/app/(app)/invitaciones/MessageEditor";
import type { InvitationRow, MessageSettings } from "@/app/(app)/invitaciones/shared";
import type { InvitationData } from "@/lib/guestInvitations";
import type { LabelOption } from "@/lib/guestLabels";

export function InvitationsDashboard({
  rows,
  labels,
  data,
  editor,
  messageSettings,
  coupleNames,
  dateLabel,
  hasWeddingDate,
}: {
  rows: InvitationRow[];
  labels: LabelOption[];
  data: InvitationData;
  editor: DesignEditorValues;
  messageSettings: MessageSettings;
  coupleNames: string;
  dateLabel: string;
  hasWeddingDate: boolean;
}) {
  const [tab, setTab] = useState("enviar");
  const sample = rows.find((r) => r.token) ?? null;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Invitaciones"
        description="Diseña tu invitación digital, envíala por WhatsApp con un enlace personal y sigue quién la abrió y confirmó."
      />

      <Tabs value={tab} onValueChange={(v) => setTab(String(v))}>
        <TabsList>
          <TabsTrigger value="enviar">
            <Send className="size-4" />
            Enviar
          </TabsTrigger>
          <TabsTrigger value="diseno">
            <Palette className="size-4" />
            Diseño
          </TabsTrigger>
          <TabsTrigger value="mensaje">
            <MessageCircle className="size-4" />
            Mensaje
          </TabsTrigger>
        </TabsList>

        <TabsContent value="enviar" className="pt-4">
          <SendPanel
            rows={rows}
            labels={labels}
            messageSettings={messageSettings}
            ctx={{ coupleNames, dateLabel }}
            onGoTo={setTab}
            needsSetup={!hasWeddingDate || (!data.ceremonyPlace && !data.venueName)}
          />
        </TabsContent>
        <TabsContent value="diseno" className="pt-4">
          <DesignEditor initial={editor} base={data} sampleGuest={sample} />
        </TabsContent>
        <TabsContent value="mensaje" className="pt-4">
          <MessageEditor
            initial={messageSettings}
            sample={sample}
            ctx={{ coupleNames, dateLabel }}
            previewDescription={[dateLabel, data.ceremonyPlace || data.venueName].filter(Boolean).join(" · ")}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
