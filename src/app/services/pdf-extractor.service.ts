import { Injectable } from '@angular/core';
import * as pdfjsLib from 'pdfjs-dist';

// --- INICIO DE LAS DEFINICIONES DE TIPOS (ASEGÚRATE QUE ESTÉN AQUÍ) ---
interface TextItem {
  str: string;
  transform: number[];
  width: number;
  height: number;
}

interface TextContent {
  items: TextItem[];
}

export interface OrderData { // Exportar para que pueda ser importado
  orderNumber: string;
  cliente: string;
  fecha: string;
  asesor: string;
  vehiculo: VehicleInfo;
  motivo: string;
  repuestos: RepuestoItem[];
  trabajos: TrabajoItem[];
  financiero: FinancialInfo;
}

interface VehicleInfo {
  marca: string;
  modelo: string;
  placa: string;
  kilometraje: string;
  chasis: string;
  motor: string;
  anio: string;
  color: string;
}

export interface RepuestoItem { // Exportar para que pueda ser importado
  codigo: string;
  producto: string;
  cantidad: number;
  precioUnitario: number;
  total: number;
}

export interface TrabajoItem { // Exportar para que pueda ser importado
  codigo: string;
  descripcion: string;
  cantidad: number;
  precioUnitario: number;
  total: number;
}

interface FinancialInfo {
  subtotal: number;
  iva: number;
  total: number;
}
// --- FIN DE LAS DEFINICIONES DE TIPOS ---

@Injectable({
  providedIn: 'root'
})
export class PdfExtractorService {
  
  constructor() {
    pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
  }

  async extractDataFromPdf(file: File): Promise<OrderData> {
    try {
      console.log('Iniciando extracción de PDF...');
      
      if (!file || file.type !== 'application/pdf') {
        throw new Error('El archivo no es un PDF válido');
      }

      const arrayBuffer = await file.arrayBuffer();
      console.log('Archivo convertido a ArrayBuffer, tamaño:', arrayBuffer.byteLength);

      const loadingTask = pdfjsLib.getDocument({
        data: arrayBuffer,
        verbosity: 0
      });

      const pdf = await loadingTask.promise;
      console.log('PDF cargado exitosamente. Páginas:', pdf.numPages);
      
      let fullText = '';
      
      // Extraer texto de todas las páginas
      for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
        try {
          const page = await pdf.getPage(pageNum);
          const textContent = await page.getTextContent() as TextContent;
          
          const pageText = this.extractTextFromPage(textContent);
          fullText += `--- PÁGINA ${pageNum} ---\n${pageText}\n\n`;
          
          console.log(`Texto extraído de página ${pageNum}:`, pageText.length, 'caracteres');
        } catch (pageError) {
          console.error(`Error procesando página ${pageNum}:`, pageError);
          continue;
        }
      }
      
      console.log('Texto completo extraído:', fullText.length, 'caracteres');
      console.log('Contenido del PDF:', fullText); // Para debugging
      
      if (!fullText.trim()) {
        throw new Error('No se pudo extraer texto del PDF');
      }

      const orderData = this.parseOrderData(fullText);
      console.log('Datos parseados:', orderData);
      
      return orderData;
      
    } catch (error) {
      console.error('Error detallado al procesar PDF:', error);
      
      if (error instanceof Error) {
        if (error.message.includes('Invalid PDF')) {
          throw new Error('El archivo PDF está corrupto o dañado');
        } else if (error.message.includes('password')) {
          throw new Error('El PDF está protegido con contraseña');
        } else if (error.message.includes('network')) {
          throw new Error('Error de red al cargar el PDF');
        } else {
          throw new Error(`Error al procesar PDF: ${error.message}`);
        }
      }
      
      throw new Error('Error desconocido al procesar el PDF');
    }
  }

  private extractTextFromPage(textContent: TextContent): string {
    if (!textContent || !textContent.items || textContent.items.length === 0) {
      return '';
    }

    const validItems = textContent.items.filter((item: TextItem) => 
      item.str && item.str.trim().length > 0
    );

    if (validItems.length === 0) {
      return '';
    }

    // --- Definir umbrales para excluir encabezado y pie de página ---
    // Los valores son aproximados y pueden requerir ajuste para diferentes PDFs.
    // 'transform[5]' representa la coordenada Y (posición vertical).
    // En pdf.js, el origen (0,0) está en la esquina inferior izquierda.
    // Un valor de Y más alto significa que el texto está más arriba en la página.
    const HEADER_TOP_Y_THRESHOLD = 740; // Excluir texto por encima de esta Y (más cerca del borde superior de la página)
    const FOOTER_BOTTOM_Y_THRESHOLD = 90; // Excluir texto por debajo de esta Y (más cerca del borde inferior de la página)

    const filteredItems = validItems.filter((item: TextItem) => {
      const itemY = item.transform[5];
      // Incluir solo elementos de texto que estén entre los umbrales del encabezado y el pie de página
      return itemY < HEADER_TOP_Y_THRESHOLD && itemY > FOOTER_BOTTOM_Y_THRESHOLD;
    });

    // Organizar elementos por posición Y (fila) y X (columna)
    const sortedItems = filteredItems.sort((a: TextItem, b: TextItem) => {
      const yDiff = Math.abs(a.transform[5] - b.transform[5]);
      if (yDiff > 5) { // Umbral para considerar que es una nueva línea
        // Para ordenar de arriba a bajo, Y debe ser descendente
        return b.transform[5] - a.transform[5]; 
      }
      return a.transform[4] - b.transform[4]; // Ordenar por X (de izquierda a derecha)
    });

    // Agrupar por líneas
    const lines: string[] = [];
    let currentLine: string[] = [];
    let currentY = -1;

    for (const item of sortedItems) {
      const itemY = Math.round(item.transform[5]);
      
      // Si es la primera línea o está en la misma línea (dentro de un umbral pequeño)
      if (currentY === -1 || Math.abs(currentY - itemY) <= 5) {
        currentLine.push(item.str.trim());
        currentY = itemY;
      } else {
        // Nueva línea
        if (currentLine.length > 0) {
          lines.push(currentLine.join(' '));
        }
        currentLine = [item.str.trim()];
        currentY = itemY;
      }
    }

    // Asegurarse de agregar la última línea si existe
    if (currentLine.length > 0) {
      lines.push(currentLine.join(' '));
    }

    return lines.join('\n');
  }

  private parseOrderData(text: string): OrderData {
    console.log('Parseando datos de orden...');
    
    // Normalize spaces and line breaks for easier regex matching
    // Replace multiple spaces/newlines with a single space, then trim
    const cleanText = text.replace(/\s*\n\s*/g, ' ').replace(/\s{2,}/g, ' ').trim();
    
    const orderData: OrderData = {
      orderNumber: this.extractOrderNumber(cleanText),
      cliente: this.extractClient(cleanText),
      fecha: this.extractDate(cleanText),
      asesor: this.extractAsesor(cleanText),
      vehiculo: this.extractVehicleInfo(cleanText),
      motivo: this.extractMotivo(cleanText),
      repuestos: this.extractRepuestos(cleanText),
      trabajos: this.extractTrabajos(cleanText),
      financiero: this.extractFinancialInfo(cleanText)
    };

    console.log('Datos parseados:', orderData);
    return orderData;
  }

  private extractOrderNumber(text: string): string {
    const patterns = [
      /MATZ-001\s*(\d+)/i, // Specific to your PDF (MATZ-001 000002543)
      /ORDEN DE TRABAJO:\s*MATZ-001\s*(\d+)/i,
      /(?:OT|ORDEN)\s*[\-#]?\s*(\d+)/i,
      /N[°º]?\s*(\d+)/i
    ];
    
    for (const pattern of patterns) {
      const match = text.match(pattern);
      if (match) {
        // If it's the MATZ-001 pattern, combine the parts if necessary
        if (match[0].includes('MATZ-001')) {
          return `MATZ-001 ${match[1]}`;
        }
        return match[1];
      }
    }
    return '';
  }

  private extractClient(text: string): string {
    const patterns = [
      /Cliente:\s*14178-VEHICENTRO VEHICULOS Y CAMIONES CENTRO SIERRA S\.A\./i, // Specific to your PDF
      /(?:CLIENTE|CLIENT):\s*([^,]+?)(?=\s*(?:Dirección|Teléfono|Cedu\/RUC):|$)/i,
      /(?:PROPIETARIO|OWNER):\s*([^,]+?)(?=\s*(?:Dirección|Teléfono|Cedu\/RUC):|$)/i,
      /VEHICENTRO VEHICULOS Y CAMIONES CENTRO SIERRA S\.A\./i
    ];
    
    for (const pattern of patterns) {
      const match = text.match(pattern);
      if (match) {
        let clientName = match[0].replace(/Cliente:\s*14178-/, '').trim();
        return clientName;
      }
    }
    return '';
  }

  private extractDate(text: string): string {
    const patterns = [
      /Fecha de Ingreso:\s*(\d{2}\/\d{2}\/\d{4})/i, // Specific to your PDF
      /(?:FECHA\s+(?:DE\s+)?(?:INGRESO|ENTRADA|TRABAJO)):\s*(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4})/i,
      /(?:FECHA):\s*(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4})/i,
      /Emitido el (\d{1,2}\s*[A-Za-z]+\,\s*\d{4})/i // e.g., "16 Jul, 2025"
    ];
    
    for (const pattern of patterns) {
      const match = text.match(pattern);
      if (match) {
        // You might need to reformat date strings like "16 Jul, 2025" to "DD/MM/YYYY"
        if (match[1].includes(',')) {
          const date = new Date(match[1]);
          return isNaN(date.getTime()) ? match[1] : date.toLocaleDateString('es-ES');
        }
        return match[1];
      }
    }
    return '';
  }

  private extractAsesor(text: string): string {
    const patterns = [
      /Asesor:\s*(TAM002-FELIX BALAREZO GUILLERMO RAFAEL)/i, // Specific to your PDF
      /(?:ASESOR|TECNICO):\s*([^\n\r]+?)(?=\s*(?:FECHA|ORDEN|Cliente|$))/i,
      /TAM\d+\s*-?\s*([A-Z\s]+?)(?=\s*(?:FECHA|ORDEN|Cliente|$))/i,
      /FELIX BALAREZO GUILLERMO RAFAEL/i
    ];
    
    for (const pattern of patterns) {
      const match = text.match(pattern);
      if (match) {
        let asesorName = match[1] || match[0];
        asesorName = asesorName.replace(/^TAM002-/, '').trim();
        return asesorName;
      }
    }
    return '';
  }

  private extractVehicleInfo(text: string): VehicleInfo {
    const vehicleInfo: VehicleInfo = {
      marca: '',
      modelo: '',
      placa: '',
      kilometraje: '',
      chasis: '',
      motor: '',
      anio: '',
      color: '',
    };

    const marcaMatch = text.match(/Marca:\s*([A-Z0-9]+)/i) || text.match(/SINOTRUK/i);
    if (marcaMatch) vehicleInfo.marca = (marcaMatch[1] || marcaMatch[0]).trim();

    const modeloMatch = text.match(/Modelo:\s*([^\n\r]+?)(?=\s*(?:Motor|Chasis|Color|Año):|$)/i) || text.match(/HOWO T5G ZZ1167N501GE1 AC 6.9 2P 4X2 TM DIESEL/i);
    if (modeloMatch) vehicleInfo.modelo = (modeloMatch[1] || modeloMatch[0]).trim();

    const placaMatch = text.match(/Placa:\s*([A-Z0-9]+)/i) || text.match(/TAA6326/i);
    if (placaMatch) vehicleInfo.placa = (placaMatch[1] || placaMatch[0]).trim();

    const kilometrajeMatch = text.match(/Kilometraje:\s*(\d+)/i) || text.match(/Kilometraje: (\d+)/i);
    if (kilometrajeMatch) vehicleInfo.kilometraje = (kilometrajeMatch[1]).trim();

    const chasisMatch = text.match(/Chasis:\s*([A-Z0-9]+)/i) || text.match(/Chasis:\s*([A-Z0-9]{17})/i) || text.match(/LZZ1BBNH3PW968142/i);
    if (chasisMatch) vehicleInfo.chasis = (chasisMatch[1] || chasisMatch[0]).trim();

    const motorMatch = text.match(/Motor:\s*([A-Z0-9]+)/i) || text.match(/220407809487/i);
    if (motorMatch) vehicleInfo.motor = (motorMatch[1] || motorMatch[0]).trim();

    const añoMatch = text.match(/Año:\s*(\d{4})/i) || text.match(/Año:\s*(\d{4})/i);
    if (añoMatch) vehicleInfo.anio = (añoMatch[1]).trim();

    const colorMatch = text.match(/Color:\s*([A-Z]+)/i) || text.match(/PLOMO/i);
    if (colorMatch) vehicleInfo.color = (colorMatch[1] || colorMatch[0]).trim();
    
    return vehicleInfo;
  }

  private extractMotivo(text: string): string {
    const patterns = [
      /Motivo:\s*(MANTENIMIENTO CORRECTIVO)/i,
      /Observación:\s*(REVISAR SONIDO EN EL MOTOR, Y REVISAR SI HAYLIMALLA EN EL ACEITE DE MOTOR\.)/i,
      /(?:MOTIVO|REASON):\s*([^\n\r]+)/i,
      /(?:OBSERVACION|OBSERVATION):\s*([^\n\r]+)/i
    ];
    
    for (const pattern of patterns) {
      const match = text.match(pattern);
      if (match) {
        return (match[1] || match[0]).trim(); // Prefer capturing group 1 if it exists, otherwise the whole match
      }
    }
    return '';
  }

  private extractRepuestos(text: string): RepuestoItem[] {
    const repuestos: RepuestoItem[] = [];
    
    // Define the start and end markers for the repuestos section
    const startMarker = /REPUESTOS UTILIZADOS\s*Código\s*Producto\s*Estado\s*Cantidad\s*Precio Unitario\s*Descuento\s*Total/i;
    const endMarker = /(?:Subtotal:\s*[\d,]+\.?\d*\s+[\d,]+\.?\d*)|TRABAJOS REALIZADOS/i; // O TRABAJOS REALIZADOS
    
    let repuestosContent = '';
    const startIndex = text.search(startMarker);
    if (startIndex !== -1) {
      const contentAfterStart = text.substring(startIndex);
      const endIndex = contentAfterStart.search(endMarker);
      if (endIndex !== -1) {
        repuestosContent = contentAfterStart.substring(0, endIndex);
      } else {
        repuestosContent = contentAfterStart; // Capturar hasta el final si no hay un marcador de fin explícito
      }
    }

    if (!repuestosContent.trim()) {
      console.log('Sección de repuestos no encontrada o vacía.');
      return repuestos;
    }

    // Esta regex apunta a capturar un elemento de línea completo.
    // Está diseñada para ser flexible:
    // 1. `([A-Z0-9\-\.]+)`: Captura el `codigo` (ej., 080-01100-6325, ATFTEXACO). Puede incluir letras, números, guiones, puntos.
    // 2. `\s+`: Coincide con uno o más caracteres de espacio en blanco.
    // 3. `(.+?)`: Captura el `producto` (descripción). `.+?` es una coincidencia no codiciosa para cualquier carácter hasta el siguiente patrón específico.
    // 4. `\s*VG\s*`: Coincide con el estado "VG", opcionalmente con espacios en blanco circundantes. Este es un patrón común en su PDF.
    // 5. `(\d+\.\d+)`: Captura `cantidad` (ej., 1.00, 2.00, 28.00). Asume un formato decimal.
    // 6. `\s+`: Coincide con uno o más caracteres de espacio en blanco.
    // 7. `([\d,]+\.?\d*)`: Captura `precioUnitario`. Maneja números con comas (separador de miles) y parte decimal opcional.
    // 8. `\s+`: Coincide con uno o más caracteres de espacio en blanco.
    // 9. `([\d,]+\.?\d*)`: Captura `descuento` (que siempre es 0.00 en su PDF, pero lo capturaremos).
    // 10. `\s+`: Coincide con uno o más caracteres de espacio en blanco.
    // 11. `([\d,]+\.?\d*)`: Captura `total`. Maneja números con comas (separador de miles) y parte decimal opcional.
    const itemRegex = /([A-Z0-9\-\.]+)\s+(.+?)\s*VG\s*(\d+\.\d+)\s+([\d,]+\.?\d*)\s+([\d,]+\.?\d*)\s+([\d,]+\.?\d*)/gi;
    
    let match;
    while ((match = itemRegex.exec(repuestosContent)) !== null) {
        const codigo = match[1].trim();
        let producto = match[2].trim();
        const cantidad = parseFloat(match[3]);
        const precioUnitario = parseFloat(match[4].replace(/,/g, '')); // Eliminar comas para el parsing
        // Estamos saltando match[5] que es 'Descuento'
        const total = parseFloat(match[6].replace(/,/g, '')); // Eliminar comas para el parsing

        // Limpiar la descripción del producto, eliminar "VG" extra si se capturó dentro del producto
        producto = producto.replace(/\s*VG$/, '').trim();
        
        repuestos.push({
            codigo,
            producto,
            cantidad,
            precioUnitario,
            total
        });
    }

    console.log('Repuestos extraídos:', repuestos);
    return repuestos;
  }

  private extractTrabajos(text: string): TrabajoItem[] {
    const trabajos: TrabajoItem[] = [];
    
    const startMarker = /TRABAJOS REALIZADOS\s*Código\s*Producto\s*Estado\s*Cantidad\s*Precio Unitario\s*Descuento\s*Total/i;
    const endMarker = /(?:REPUESTOS UTILIZADOS)|(?:Subtotal:\s*[\d,]+\.?\d*\s+[\d,]+\.?\d*)|(?:Total:\s*[\d,]+\.?\d*\s+[\d,]+\.?\d*)/i; // Usar un marcador de fin más flexible
    
    let trabajosContent = '';
    const startIndex = text.search(startMarker);
    if (startIndex !== -1) {
      const contentAfterStart = text.substring(startIndex);
      const endIndex = contentAfterStart.search(endMarker);
      if (endIndex !== -1) {
        trabajosContent = contentAfterStart.substring(0, endIndex);
      } else {
        trabajosContent = contentAfterStart;
      }
    }

    if (!trabajosContent.trim()) {
      console.log('Sección de trabajos no encontrada o vacía.');
      return trabajos;
    }

    // Esta regex es para elementos de trabajo individuales, similar a los repuestos.
    // Espera: Código, Descripción, "VG", Cantidad, Precio Unitario, Descuento, Total
    const itemRegex = /([A-Z0-9\-\.]+)\s+(.+?)\s*VG\s*(\d+\.\d+)\s+([\d,]+\.?\d*)\s+([\d,]+\.?\d*)\s+([\d,]+\.?\d*)/gi;
    let match;
    while ((match = itemRegex.exec(trabajosContent)) !== null) {
        const codigo = match[1].trim();
        let descripcion = match[2].trim();
        const cantidad = parseFloat(match[3]);
        const precioUnitario = parseFloat(match[4].replace(/,/g, ''));
        // Saltando match[5] que es 'Descuento'
        const total = parseFloat(match[6].replace(/,/g, ''));

        descripcion = descripcion.replace(/\s*VG$/, '').trim(); // Limpiar si "VG" se incluyó
        
        trabajos.push({
            codigo,
            descripcion,
            cantidad,
            precioUnitario,
            total
        });
    }

    console.log('Trabajos extraídos:', trabajos);
    return trabajos;
  }

  private extractFinancialInfo(text: string): FinancialInfo {
    const parseNumber = (value: string): number => {
      // Maneja tanto la coma como separador de miles y el punto como decimal, luego parsea
      value = value.replace(/\./g, ''); // Eliminar puntos separadores de miles
      value = value.replace(/,/g, '.'); // Reemplazar coma decimal con punto
      return parseFloat(value);
    };
    
    // Encontrar la sección que contiene el resumen financiero.
    // Usualmente está al final del documento.
    // Buscando específicamente el patrón observado en su PDF
    const financialSectionMatch = text.match(/Baser IVA:\s*([\d,]+\.?\d*)\s*Base IVA 0\s*([\d,]+\.?\d*)\s*Subtotal:\s*([\d,]+\.?\d*)\s*Valor IVA:\s*([\d,]+\.?\d*)\s*Descuento:\s*([\d,]+\.?\d*)\s*Total:\s*([\d,]+\.?\d*)/i);

    if (financialSectionMatch) {
        const subtotal = parseNumber(financialSectionMatch[3]); // Esta es la línea "Subtotal"
        const iva = parseNumber(financialSectionMatch[4]);
        const total = parseNumber(financialSectionMatch[6]);
        
        return { subtotal, iva, total };
    }

    // Fallback si el patrón preciso anterior falla, o para otros documentos
    const subtotalMatch = text.match(/Subtotal:\s*\$?([\d,]+\.?\d*)/i);
    const ivaMatch = text.match(/(?:Valor\s*IVA|IVA):\s*\$?([\d,]+\.?\d*)/i);
    const totalMatch = text.match(/Total:\s*\$?([\d,]+\.?\d*)/i);
    
    const subtotal = subtotalMatch ? parseNumber(subtotalMatch[1]) : 0;
    const iva = ivaMatch ? parseNumber(ivaMatch[1]) : 0;
    const total = totalMatch ? parseNumber(totalMatch[1]) : 0;
    
    return { subtotal, iva, total };
  }
}