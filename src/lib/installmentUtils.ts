import type { Transaction } from "@/db/db";

export interface InstallmentInfo {
  isInstallment: boolean;
  baseDescription: string;
  currentNumber: number;
  totalNumber: number;
  groupId?: string;
}

/**
 * Identifica se uma transação é parte de uma compra parcelada,
 * seja por metadados explícitos ou pelo padrão do texto " - Parcela X de Y".
 */
export function getInstallmentInfo(tx: Partial<Transaction> | null | undefined): InstallmentInfo {
  if (!tx || !tx.description) {
    return {
      isInstallment: false,
      baseDescription: '',
      currentNumber: 1,
      totalNumber: 1
    };
  }

  // 1. Caso tenha metadados explícitos
  if (tx.installmentNumber && tx.installmentTotal) {
    const match = tx.description.match(/^(.*?)\s*-\s*Parcela\s+\d+\s+de\s+\d+$/i);
    const baseDescription = match ? match[1].trim() : tx.description;
    return {
      isInstallment: true,
      baseDescription,
      currentNumber: tx.installmentNumber,
      totalNumber: tx.installmentTotal,
      groupId: tx.installmentGroupId
    };
  }

  // 2. Caso o texto contenha o padrão " - Parcela X de Y"
  const match = tx.description.match(/^(.*?)\s*-\s*Parcela\s+(\d+)\s+de\s+(\d+)$/i);
  if (match) {
    return {
      isInstallment: true,
      baseDescription: match[1].trim(),
      currentNumber: parseInt(match[2], 10),
      totalNumber: parseInt(match[3], 10),
      groupId: tx.installmentGroupId
    };
  }

  return {
    isInstallment: false,
    baseDescription: tx.description,
    currentNumber: 1,
    totalNumber: 1
  };
}

/**
 * Encontra todas as parcelas futuras que pertencem ao mesmo grupo de parcelamento
 * e que ainda não foram baixadas (status !== 'Paga').
 */
export function findFuturePendingInstallments(
  currentTx: Transaction,
  allTransactions: Transaction[]
): Transaction[] {
  const currentInfo = getInstallmentInfo(currentTx);
  if (!currentInfo.isInstallment) return [];

  const sharedGroupId = currentTx.installmentGroupId || currentInfo.groupId;

  return allTransactions.filter(t => {
    // Não comparar consigo mesma ou com par de transferência
    if (t.id === currentTx.id) return false;
    if (currentTx.linkedTransactionId && t.id === currentTx.linkedTransactionId) return false;

    // Regra fundamental: NÃO alterar o que já foi baixado (Paga)
    if (t.status === 'Paga') return false;

    const tInfo = getInstallmentInfo(t);
    if (!tInfo.isInstallment) return false;

    // Apenas parcelas futuras (número maior que a parcela atual sendo editada)
    if (tInfo.currentNumber <= currentInfo.currentNumber) return false;

    // Se temos groupId compartilhado
    if (sharedGroupId && t.installmentGroupId === sharedGroupId) {
      return true;
    }

    // Caso legado sem groupId: compara base da descrição, total de parcelas e conta/categoria
    if (
      tInfo.totalNumber === currentInfo.totalNumber &&
      tInfo.baseDescription.toLowerCase() === currentInfo.baseDescription.toLowerCase() &&
      (t.accountId === currentTx.accountId || t.categoryId === currentTx.categoryId)
    ) {
      return true;
    }

    return false;
  }).sort((a, b) => {
    const infoA = getInstallmentInfo(a);
    const infoB = getInstallmentInfo(b);
    return infoA.currentNumber - infoB.currentNumber;
  });
}

/**
 * Calcula a nova data para uma parcela futura baseado na data base da parcela atual
 */
export function calculateFutureInstallmentDate(
  baseDateStr: string,
  baseInstallmentNum: number,
  targetInstallmentNum: number
): string {
  const [baseY, baseM, baseD] = baseDateStr.split('-').map(Number);
  const monthOffset = targetInstallmentNum - baseInstallmentNum;
  
  const targetMonthIndex = (baseM - 1) + monthOffset;
  const targetYear = baseY + Math.floor(targetMonthIndex / 12);
  const targetMonth = ((targetMonthIndex % 12) + 12) % 12; // 0-11
  const maxDaysInTargetMonth = new Date(targetYear, targetMonth + 1, 0).getDate();
  const actualDay = Math.min(baseD, maxDaysInTargetMonth);
  
  return `${targetYear}-${String(targetMonth + 1).padStart(2, '0')}-${String(actualDay).padStart(2, '0')}`;
}
