import { db } from "@/lib/db";

type CompletedOrder = {
  id: string;
  code: string;
  waNumber: string;
  status: string;
  service: { name: string };
};

function normalizeWhatsAppNumber(value: string): string {
  const digits = value.replace(/\D/g, "");
  if (digits.startsWith("0")) return `62${digits.slice(1)}`;
  if (digits.startsWith("62")) return digits;
  return digits;
}

export async function notifyOrderCompleted(order: CompletedOrder): Promise<{ sent: boolean; reason?: string }> {
  const token = process.env.WHATSAPP_ACCESS_TOKEN;
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;
  const templateName = process.env.WHATSAPP_ORDER_COMPLETED_TEMPLATE_NAME;
  const languageCode = process.env.WHATSAPP_ORDER_COMPLETED_TEMPLATE_LANGUAGE || "id";

  if (!token || !phoneNumberId || !templateName) {
    return { sent: false, reason: "WhatsApp Business API belum dikonfigurasi" };
  }

  const recipient = normalizeWhatsAppNumber(order.waNumber);
  if (!/^62\d{8,15}$/.test(recipient)) {
    return { sent: false, reason: "Nomor WhatsApp order tidak valid" };
  }

  const claimed = await db.order.updateMany({
    where: { id: order.id, status: "SELESAI", whatsappNotifiedAt: null },
    data: { whatsappNotifiedAt: new Date() },
  });
  if (claimed.count === 0) return { sent: false, reason: "Notifikasi sudah dikirim atau order belum selesai" };

  const apiVersion = process.env.WHATSAPP_API_VERSION || "v23.0";
  const response = await fetch(`https://graph.facebook.com/${apiVersion}/${phoneNumberId}/messages`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      messaging_product: "whatsapp",
      to: recipient,
      type: "template",
      template: {
        name: templateName,
        language: { code: languageCode },
        components: [{
          type: "body",
          parameters: [
            { type: "text", text: order.code },
            { type: "text", text: order.service.name },
            { type: "text", text: order.status },
          ],
        }],
      },
    }),
  });

  if (!response.ok) {
    await db.order.update({ where: { id: order.id }, data: { whatsappNotifiedAt: null } });
    const detail = await response.text();
    return { sent: false, reason: `WhatsApp API gagal (${response.status}): ${detail}` };
  }

  return { sent: true };
}
