export class TelegramReviewNotifier {
  async notify(message: string): Promise<"sent" | "disabled"> {
    if (process.env.TELEGRAM_NOTIFICATIONS_ENABLED !== "true") return "disabled";
    const token = process.env.TELEGRAM_BOT_TOKEN;
    const chatId = process.env.TELEGRAM_REVIEW_CHAT_ID;
    if (!token || !chatId) throw new Error("Telegram notification is enabled but credentials are incomplete");

    const response = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ chat_id: chatId, text: message, disable_web_page_preview: true }),
      signal: AbortSignal.timeout(15_000)
    });
    if (!response.ok) throw new Error(`Telegram notification returned HTTP ${response.status}`);
    return "sent";
  }
}
