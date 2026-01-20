import { formatKeyName } from './toolResultParser';

/**
 * Options for chart export to PowerPoint
 */
export interface ChartExportOptions {
  /** Chart container element or ref */
  chartElement: HTMLElement;
  /** Chart title */
  title?: string;
  /** Selected columns (for filtering info) */
  selectedColumns?: string[];
  /** Filename for the exported file */
  filename?: string;
  /** Additional notes to include in the slide */
  notes?: string;
}

/**
 * Exports a chart to PowerPoint (.pptx) file
 * @param options - Export options including chart element and metadata
 */
export async function exportChartToPptx(options: ChartExportOptions): Promise<void> {
  // Ensure this only runs on the client side
  if (typeof window === 'undefined') {
    throw new Error('Exportação de PowerPoint só está disponível no navegador');
  }

  const {
    chartElement,
    title = 'Gráfico',
    selectedColumns,
    filename = 'grafico-exportado',
    notes,
  } = options;

  try {
    // Dynamically import libraries to avoid SSR issues
    const [{ default: pptxgen }, { default: html2canvas }] = await Promise.all([
      import('pptxgenjs'),
      import('html2canvas'),
    ]);

    // Create new PowerPoint presentation
    const pptx = new pptxgen();

    // Set slide layout
    const slide = pptx.addSlide();
    slide.background = { color: 'FFFFFF' };

    // Add title
    slide.addText(title, {
      x: 0.5,
      y: 0.3,
      w: 9,
      h: 0.5,
      fontSize: 24,
      bold: true,
      color: '363636',
      align: 'center',
    });

    // Capture chart as image using html2canvas
    // Using type assertion because html2canvas types may be incomplete
    const canvas = await html2canvas(chartElement, {
      scale: 2, // Higher quality
      logging: false,
      useCORS: true,
    } as Parameters<typeof html2canvas>[1]);

    // Convert canvas to base64 image
    const imageData = canvas.toDataURL('image/png');

    // Calculate image dimensions maintaining aspect ratio
    const maxWidth = 8; // inches
    const maxHeight = 5; // inches
    const aspectRatio = canvas.width / canvas.height;
    
    let imageWidth = maxWidth;
    let imageHeight = maxWidth / aspectRatio;
    
    if (imageHeight > maxHeight) {
      imageHeight = maxHeight;
      imageWidth = maxHeight * aspectRatio;
    }

    // Center the image
    const xPosition = (10 - imageWidth) / 2;
    const yPosition = 1.2;

    // Add chart image to slide
    slide.addImage({
      data: imageData,
      x: xPosition,
      y: yPosition,
      w: imageWidth,
      h: imageHeight,
    });

    // Add notes section if filters or notes are provided
    const notesText: string[] = [];
    
    if (selectedColumns && selectedColumns.length > 0) {
      const columnsText = selectedColumns.map(col => formatKeyName(col)).join(', ');
      notesText.push(`Colunas selecionadas: ${columnsText}`);
    }
    
    if (notes) {
      notesText.push(notes);
    }
    
    notesText.push(`Exportado em: ${new Date().toLocaleString('pt-BR')}`);

    if (notesText.length > 0) {
      slide.addText(notesText.join('\n'), {
        x: 0.5,
        y: yPosition + imageHeight + 0.2,
        w: 9,
        h: 0.8,
        fontSize: 10,
        color: '666666',
        align: 'center',
      });
    }

    // Generate and download the file
    await pptx.writeFile({ fileName: `${filename}.pptx` });
  } catch (error) {
    console.error('Error exporting chart to PowerPoint:', error);
    throw new Error('Falha ao exportar gráfico para PowerPoint. Tente novamente.');
  }
}
