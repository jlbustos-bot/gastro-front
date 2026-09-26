import apiClient from '../api/client';

export interface VentaDiariaMedio {
  medio_pago_id: number;
  nombre: string;
  orden: number | null;
  total: number;
  cantidad: number;
}

export interface VentaDiariaConsumo {
  id: number;
  mesa_numero: number;
  cliente_nombre: string | null;
  total: number;
  medio_pago_nombre: string | null;
  created_at?: string;
}

export interface VentaDiaria {
  fecha_caja: string;
  medios: VentaDiariaMedio[];
  total_general: number;
  cantidad_consumos: number;
  consumos: VentaDiariaConsumo[];
}

export const reporteService = {
  async ventaDiaria(fecha?: string) {
    const response = await apiClient.get<VentaDiaria>('/reportes/venta-diaria', {
      params: fecha ? { fecha } : {},
    });
    return response.data;
  },
};