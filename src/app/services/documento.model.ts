export interface Documento {
    id?: number;
    documento: string;
    fecha: Date;
    estado: string;
    rutaArchivo?: string;
  }