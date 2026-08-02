import { prisma } from "@/lib/prisma";
import MessageRow from "@/components/admin/MessageRow";

export default async function AdminMessagesPage() {
  const messages = await prisma.contactMessage.findMany({
    orderBy: { createdAt: "desc" },
  });

  return (
    <div>
      <h1 className="font-serif text-3xl font-bold text-anthracite">Nachrichten</h1>
      <p className="mt-1 text-sm text-neutral-600">
        Eingegangene Anfragen über das Kontaktformular der Website.
      </p>

      <div className="mt-8 space-y-3">
        {messages.map((message) => (
          <MessageRow
            key={message.id}
            message={{ ...message, createdAt: message.createdAt.toISOString() }}
          />
        ))}

        {messages.length === 0 && (
          <p className="text-sm text-neutral-500">Noch keine Nachrichten eingegangen.</p>
        )}
      </div>
    </div>
  );
}
