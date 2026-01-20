import * as XLSX from 'xlsx';
import { formatKeyName } from './toolResultParser';

/**
 * Exporta dados para arquivo XLSX (Excel)
 * @param data - Array de objetos a serem exportados
 * @param filename - Nome do arquivo (sem extensão)
 */
export function exportToXlsx(
  data: Record<string, unknown>[],
  filename: string = 'dados'
): void {
  if (!data || data.length === 0) {
    return;
  }

  // Obter todos os headers únicos de todos os objetos
  const headers = Array.from(new Set(data.flatMap(obj => Object.keys(obj))));

  // Criar array com headers formatados para exibição
  const formattedHeaders = headers.map(h => formatKeyName(h));

  // Criar linhas de dados
  const rows = data.map(row =>
    headers.map(header => {
      const value = row[header];
      return formatCellValue(value);
    })
  );

  // Criar worksheet com headers e dados
  const ws = XLSX.utils.aoa_to_sheet([formattedHeaders, ...rows]);

  // Ajustar largura das colunas baseado no conteúdo
  const colWidths = headers.map((_, idx) => {
    const headerWidth = formattedHeaders[idx].length;
    const maxDataWidth = Math.max(
      ...rows.map(row => String(row[idx]).length)
    );
    return { wch: Math.min(Math.max(headerWidth, maxDataWidth) + 2, 50) };
  });
  ws['!cols'] = colWidths;

  // Criar workbook e adicionar worksheet
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Dados');

  // Gerar arquivo e iniciar download
  XLSX.writeFile(wb, `${filename}.xlsx`);
}

/**
 * Formata valor para célula do Excel
 */
function formatCellValue(value: unknown): string | number | boolean {
  if (value === null || value === undefined) {
    return '';
  }
  if (typeof value === 'boolean') {
    return value ? 'Sim' : 'Não';
  }
  if (typeof value === 'number') {
    return value;
  }
  if (value instanceof Date) {
    return value.toLocaleDateString('pt-BR');
  }
  if (typeof value === 'object') {
    return JSON.stringify(value);
  }
  return String(value);
}
