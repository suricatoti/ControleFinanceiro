import { AppDatabase } from "@/db/db";

export async function ensureRecurrencesProjected(db: AppDatabase) {
  const recurrences = await db.recurrences.toArray();
  if (recurrences.length === 0) return;

  const today = new Date();

  for (const recurrence of recurrences) {
    // Determine the base date to calculate our 24-month target.
    // If the recurrence starts in the future, project 24 months from the start date.
    // Otherwise, project 24 months from today.
    const start = new Date(recurrence.startDate + "T12:00:00Z");
    const baseDate = start > today ? start : today;
    
    const targetDate = new Date(baseDate);
    targetDate.setUTCMonth(targetDate.getUTCMonth() + 24);
    const targetDateStr = targetDate.toISOString().split("T")[0];

    // Get the latest transaction for this recurrence group
    const latestTx = await db.transactions
      .where("recurringGroupId")
      .equals(recurrence.id)
      .reverse()
      .sortBy("date")
      .then(txs => txs[0]);

    let nextDate = new Date(recurrence.startDate + "T12:00:00Z");

    if (latestTx) {
      nextDate = new Date(latestTx.date + "T12:00:00Z");
      // Advance by 1 period since this transaction already exists
      if (recurrence.period === 'anual') {
        nextDate.setUTCFullYear(nextDate.getUTCFullYear() + 1);
      } else {
        nextDate.setUTCMonth(nextDate.getUTCMonth() + 1);
      }
    }

    while (true) {
      const dStr = nextDate.toISOString().split("T")[0];
      if (dStr > targetDateStr) {
        break; // We've reached the target date
      }

      await db.transactions.add({
        id: crypto.randomUUID(),
        date: dStr,
        accountId: recurrence.accountId,
        categoryId: recurrence.categoryId,
        subcategoryId: recurrence.subcategoryId,
        description: recurrence.description,
        amount: recurrence.amount,
        recurringGroupId: recurrence.id,
        status: 'Pendente'
      });

      if (recurrence.period === 'anual') {
        nextDate.setUTCFullYear(nextDate.getUTCFullYear() + 1);
      } else {
        nextDate.setUTCMonth(nextDate.getUTCMonth() + 1);
      }
    }
  }
}
