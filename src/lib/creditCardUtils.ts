/**
 * Retorna os detalhes da fatura para um determinado "mês de filtro" (mês de vencimento).
 * @param monthStr Formato "YYYY-MM" (ex: "2026-08")
 * @param closingDay Dia de fechamento (ex: 15)
 * @param dueDay Dia de vencimento (ex: 25)
 */
export function getCreditCardBillPeriod(monthStr: string, closingDay: number, dueDay: number) {
  const [year, month] = monthStr.split('-').map(Number);
  
  // O monthStr agora representa o MÊS DE FECHAMENTO (ao invés do mês de vencimento)
  const closingMonth = month - 1;
  const closingYear = year;
  
  // A fatura atual FECHA em:
  const endDate = new Date(closingYear, closingMonth, closingDay, 23, 59, 59, 999);
  
  // Calcula o vencimento
  let dueMonth = closingMonth;
  let dueYear = closingYear;
  
  if (dueDay < closingDay) {
    // Ex: Fecha dia 26, vence dia 7. O vencimento é no mês SEGUINTE ao fechamento.
    dueMonth += 1;
    if (dueMonth > 11) {
      dueMonth = 0;
      dueYear += 1;
    }
  }
  
  const dueDate = new Date(dueYear, dueMonth, dueDay, 23, 59, 59, 999);
  
  // A fatura atual ABRE no dia seguinte ao fechamento anterior:
  let prevClosingMonth = closingMonth - 1;
  let prevClosingYear = closingYear;
  if (prevClosingMonth < 0) {
    prevClosingMonth = 11;
    prevClosingYear -= 1;
  }
  const startDate = new Date(prevClosingYear, prevClosingMonth, closingDay + 1, 0, 0, 0, 0);

  return {
    startDate,
    endDate,
    dueDate
  };
}

/**
 * Calcula a qual "mês de fatura" (mês de vencimento) uma transação pertence, baseado na data dela.
 * Retorna no formato "YYYY-MM".
 */
export function getNaturalBillMonth(txDateStr: string, closingDay: number, dueDay: number): string {
  // A data da transação (normalizada para o meio-dia local para evitar problemas de timezone)
  const txDate = new Date(txDateStr + 'T12:00:00');
  
  const year = txDate.getFullYear();
  const month = txDate.getMonth() + 1; // 1 a 12
  
  // Testamos o mês atual, anterior e próximos dois meses.
  // A transação com certeza cairá em uma dessas faturas.
  const testMonths = [
    { y: month === 1 ? year - 1 : year, m: month === 1 ? 12 : month - 1 },
    { y: year, m: month },
    { y: month === 12 ? year + 1 : year, m: month === 12 ? 1 : month + 1 },
    { y: month >= 11 ? year + 1 : year, m: month >= 11 ? (month + 2) % 12 || 12 : month + 2 }
  ];

  for (const {y, m} of testMonths) {
    const monthStr = `${y}-${m.toString().padStart(2, '0')}`;
    const period = getCreditCardBillPeriod(monthStr, closingDay, dueDay);
    
    if (txDate.getTime() >= period.startDate.getTime() && txDate.getTime() <= period.endDate.getTime()) {
      return monthStr;
    }
  }

  return `${year}-${month.toString().padStart(2, '0')}`;
}
