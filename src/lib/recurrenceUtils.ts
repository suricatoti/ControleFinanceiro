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

    const [origY, origM, origD] = recurrence.startDate.split('-').map(Number);
    let step = 0;

    if (latestTx) {
      const [latestY, latestM] = latestTx.date.split('-').map(Number);
      if (recurrence.period === 'anual') {
        step = (latestY - origY) + 1;
      } else {
        step = (latestY - origY) * 12 + (latestM - origM) + 1;
      }
    }

    while (true) {
      let dStr = "";
      if (recurrence.period === 'anual') {
        const targetY = origY + step;
        const maxDays = new Date(targetY, origM, 0).getDate();
        const actualD = Math.min(origD, maxDays);
        dStr = `${targetY}-${String(origM).padStart(2, '0')}-${String(actualD).padStart(2, '0')}`;
      } else {
        const totalMonths = (origM - 1) + step;
        const targetY = origY + Math.floor(totalMonths / 12);
        const targetM = ((totalMonths % 12) + 12) % 12; // 0-11
        const maxDays = new Date(targetY, targetM + 1, 0).getDate();
        const actualD = Math.min(origD, maxDays);
        dStr = `${targetY}-${String(targetM + 1).padStart(2, '0')}-${String(actualD).padStart(2, '0')}`;
      }

      if (dStr > targetDateStr) {
        break; // We've reached the target date
      }

      if (recurrence.destinationAccountId) {
        const id1 = crypto.randomUUID();
        const id2 = crypto.randomUUID();

        await db.transactions.add({
          id: id1,
          date: dStr,
          accountId: recurrence.accountId,
          categoryId: recurrence.categoryId,
          subcategoryId: recurrence.subcategoryId,
          description: recurrence.description,
          amount: -Math.abs(recurrence.amount),
          recurringGroupId: recurrence.id,
          linkedTransactionId: id2,
          status: 'Pendente'
        });

        await db.transactions.add({
          id: id2,
          date: dStr,
          accountId: recurrence.destinationAccountId,
          categoryId: recurrence.categoryId,
          subcategoryId: recurrence.subcategoryId,
          description: recurrence.description,
          amount: Math.abs(recurrence.amount),
          recurringGroupId: recurrence.id,
          linkedTransactionId: id1,
          status: 'Pendente'
        });
      } else {
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
      }

      step++;
    }
  }
}
