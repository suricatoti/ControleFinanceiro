import type { CardBillPeriod } from "@/db/db";

export interface BillPeriodResult {
  startDate: Date;
  endDate: Date;
  dueDate: Date;
  startDateStr: string;
  endDateStr: string;
  dueDateStr: string;
  isCustom: boolean;
}

export function formatDateToInput(d: Date): string {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function parseLocalDate(dateStr: string, hour = 0, minute = 0, second = 0, ms = 0): Date {
  const [y, m, d] = dateStr.split('-').map(Number);
  return new Date(y, m - 1, d, hour, minute, second, ms);
}

/**
 * Retorna os detalhes da fatura para um determinado "mês de filtro" (mês de fechamento).
 * Suporta períodos customizados caso existam para a conta e mês especificados.
 * @param monthStr Formato "YYYY-MM" (ex: "2026-08")
 * @param closingDay Dia de fechamento padrão da conta (ex: 15)
 * @param dueDay Dia de vencimento padrão da conta (ex: 25)
 * @param customPeriods Lista de períodos customizados salvos no banco
 * @param accountId ID da conta do cartão de crédito
 */
export function getCreditCardBillPeriod(
  monthStr: string,
  closingDay: number,
  dueDay: number,
  customPeriods?: CardBillPeriod[] | null,
  accountId?: string
): BillPeriodResult {
  const [year, month] = monthStr.split('-').map(Number);
  
  // 1. Verifica se existe personalização salva para esta conta e mês
  const customForThisMonth = customPeriods?.find(
    p => (!accountId || p.accountId === accountId) && p.monthStr === monthStr
  );

  if (customForThisMonth?.startDate && customForThisMonth?.endDate && customForThisMonth?.dueDate) {
    const startDate = parseLocalDate(customForThisMonth.startDate, 0, 0, 0, 0);
    const endDate = parseLocalDate(customForThisMonth.endDate, 23, 59, 59, 999);
    const dueDate = parseLocalDate(customForThisMonth.dueDate, 23, 59, 59, 999);
    return {
      startDate,
      endDate,
      dueDate,
      startDateStr: customForThisMonth.startDate,
      endDateStr: customForThisMonth.endDate,
      dueDateStr: customForThisMonth.dueDate,
      isCustom: true
    };
  }

  // 2. Cálculo automático padrão
  const closingMonth = month - 1;
  const closingYear = year;
  
  // Quantidade de dias no mês de fechamento (ex: Setembro = 30, Outubro = 31)
  const daysInClosingMonth = new Date(closingYear, closingMonth + 1, 0).getDate();
  const actualClosingDay = Math.min(closingDay, daysInClosingMonth);
  
  // A fatura atual FECHA em:
  const endDate = new Date(closingYear, closingMonth, actualClosingDay, 23, 59, 59, 999);
  
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
  
  const daysInDueMonth = new Date(dueYear, dueMonth + 1, 0).getDate();
  const actualDueDay = Math.min(dueDay, daysInDueMonth);
  const dueDate = new Date(dueYear, dueMonth, actualDueDay, 23, 59, 59, 999);
  
  // A fatura atual ABRE no dia seguinte ao fechamento anterior:
  let prevClosingMonth = closingMonth - 1;
  let prevClosingYear = closingYear;
  if (prevClosingMonth < 0) {
    prevClosingMonth = 11;
    prevClosingYear -= 1;
  }
  
  const prevMonthStr = `${prevClosingYear}-${String(prevClosingMonth + 1).padStart(2, '0')}`;
  const prevCustom = customPeriods?.find(
    p => (!accountId || p.accountId === accountId) && p.monthStr === prevMonthStr
  );

  let startDate: Date;
  if (prevCustom?.endDate) {
    // Se o mês anterior teve fechamento personalizado, a abertura deste mês é o dia seguinte
    const prevCustomEnd = parseLocalDate(prevCustom.endDate, 0, 0, 0, 0);
    startDate = new Date(prevCustomEnd.getTime() + 24 * 60 * 60 * 1000);
    startDate.setHours(0, 0, 0, 0);
  } else {
    const daysInPrevMonth = new Date(prevClosingYear, prevClosingMonth + 1, 0).getDate();
    const actualPrevClosingDay = Math.min(closingDay, daysInPrevMonth);
    
    if (actualPrevClosingDay >= daysInPrevMonth) {
      startDate = new Date(closingYear, closingMonth, 1, 0, 0, 0, 0);
    } else {
      startDate = new Date(prevClosingYear, prevClosingMonth, actualPrevClosingDay + 1, 0, 0, 0, 0);
    }
  }

  return {
    startDate,
    endDate,
    dueDate,
    startDateStr: formatDateToInput(startDate),
    endDateStr: formatDateToInput(endDate),
    dueDateStr: formatDateToInput(dueDate),
    isCustom: false
  };
}

/**
 * Calcula a qual "mês de fatura" (mês de fechamento) uma transação pertence, baseado na data dela.
 * Retorna no formato "YYYY-MM".
 */
export function getNaturalBillMonth(
  txDateStr: string,
  closingDay: number,
  dueDay: number,
  customPeriods?: CardBillPeriod[] | null,
  accountId?: string
): string {
  // A data da transação (normalizada para o meio-dia local para evitar problemas de timezone)
  const txDate = new Date(txDateStr + 'T12:00:00');
  
  const year = txDate.getFullYear();
  const month = txDate.getMonth() + 1; // 1 a 12
  
  // Testamos o mês anterior, atual e próximos dois meses.
  // A transação com certeza cairá em uma dessas faturas.
  const testMonths = [
    { y: month === 1 ? year - 1 : year, m: month === 1 ? 12 : month - 1 },
    { y: year, m: month },
    { y: month === 12 ? year + 1 : year, m: month === 12 ? 1 : month + 1 },
    { y: month >= 11 ? year + 1 : year, m: month >= 11 ? (month + 2) % 12 || 12 : month + 2 }
  ];

  for (const { y, m } of testMonths) {
    const monthStr = `${y}-${m.toString().padStart(2, '0')}`;
    const period = getCreditCardBillPeriod(monthStr, closingDay, dueDay, customPeriods, accountId);
    
    if (txDate.getTime() >= period.startDate.getTime() && txDate.getTime() <= period.endDate.getTime()) {
      return monthStr;
    }
  }

  return `${year}-${month.toString().padStart(2, '0')}`;
}
