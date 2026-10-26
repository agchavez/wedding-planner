"use client";

import { useState } from "react";
import { MessageCircle, Palette, Send } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { SendPanel } from "@/app/(app)/invitaciones/SendPanel";
import type { Guest } from "@/generated/prisma";
import { DesignEditor, type DesignEditorValues } from "@/app/(app)/invitaciones/DesignEditor";
import { MessageEditor } from "@/app/(app)/invitaciones/MessageEditor";
import type { InvitationRow, MessageSettings } from "@/app/(app)/invitaciones/shared";
import type { InvitationData } from "@/lib/guestInvitations";
import type { LabelOption } from "@/lib/guestLabels";

export function InvitationsDashboard({
  rows,
  guests,
  groupSuggestions,
  labels,
  data,
  editor,
  messageSettings,
  coupleNames,
  dateLabel,
  hasWeddingDate,
  initialTab = "enviar",
  highlightExample,
}: {
  rows: InvitationRow[];
  guests: Guest[];
  groupSuggestions: string[];
  labels: LabelOption[];
  data: InvitationData;
  editor: DesignEditorValues;
  messageSettings: MessageSettings;
  coupleNames: string;
  dateLabel: string;
  hasWeddingDate: boolean;
  initialTab?: string;
  highlightExample?: string;
}) {
  const [tab, setTab] = useState(initialTab);
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
            guests={guests}
            groupSuggestions={groupSuggestions}
            labels={labels}
            messageSettings={messageSettings}
            ctx={{ coupleNames, dateLabel }}
            onGoTo={setTab}
            needsSetup={!hasWeddingDate || (!data.ceremonyPlace && !data.venueName)}
          />
        </TabsContent>
        <TabsContent value="diseno" className="pt-4">
          {/* `key`: al aplicar un ejemplo llegan valores nuevos y el editor se reinicia con ellos. */}
          <DesignEditor
            key={JSON.stringify(editor)}
            initial={editor}
            base={data}
            sampleGuest={sample}
            highlightExample={highlightExample}
          />
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
