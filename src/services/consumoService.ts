import apiClient from '../api/client';

export interface ConsumoItem {
  id?: number;
  producto_id: number;
  producto_nombre?: string;
  cantidad: number;
  precio: number;
}

export interface ConsumoPago {
  id?: number;
  consumo_id?: number;
  medio_pago_id: number;
  medio_pago_nombre?: string;
  monto: number;
  user_id?: number | null;
  created_at?: string;
}

export interface Consumo {
  id?: number;
  mesa_id: number;
  mesa_numero?: number;
  cliente_id?: number | null;
  cliente_nombre?: string;
  medio_pago_id?: number | null;
  medio_pago_nombre?: string;
  estado: 'abierta' | 'pagada' | 'anulada';
  total: number;
  items: ConsumoItem[];
  pagos?: ConsumoPago[];
  fecha_creacion?: string;
  fecha_caja?: string;
  created_at?: string;
  updated_at?: string;
}

export interface ConsumoItemInput {
  producto_id: number;
  cantidad: number;
}

export interface ConsumoInput {
  mesa_id: number;
  cliente_id?: number | null;
  medio_pago_id?: number | null;
  estado?: Consumo['estado'];
  items: ConsumoItemInput[];
}

export interface ConsumoPagoInput {
  medio_pago_id: number;
  monto: number;
}

export const consumoService = {
  async getAll(filters?: { estado?: string }) {
    const response = await apiClient.get<Consumo[]>('/consumos', { params: filters });
    return response.data;
  },

  async getById(id: number) {
    const response = await apiClient.get<Consumo>(`/consumos/${id}`);
    return response.data;
  },

  async create(data: ConsumoInput) {
    const response = await apiClient.post<Consumo>('/consumos', data);
    return response.data;
  },

  async update(id: number, data: Partial<ConsumoInput>) {
    const response = await apiClient.put<Consumo>(`/consumos/${id}`, data);
    return response.data;
  },

  async pay(id: number, pagos: ConsumoPagoInput[]) {
    const response = await apiClient.post<Consumo>(`/consumos/${id}/pagar`, { pagos });
    return response.data;
  },

  async delete(id: number) {
    const response = await apiClient.delete(`/consumos/${id}`);
    return response.data;
  },
};