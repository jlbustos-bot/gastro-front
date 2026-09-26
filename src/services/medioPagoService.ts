import apiClient from '../api/client';

export interface MedioPago {
  id?: number;
  nombre: string;
  descripcion?: string;
  orden?: number | null;
  activo: boolean;
}

export const medioPagoService = {
  async getAll(filters?: { activo?: boolean }) {
    const response = await apiClient.get<MedioPago[]>('/medios-pago', { params: filters });
    return response.data;
  },

  async getById(id: number) {
    const response = await apiClient.get<MedioPago>(`/medios-pago/${id}`);
    return response.data;
  },

  async create(data: MedioPago) {
    const response = await apiClient.post<MedioPago>('/medios-pago', data);
    return response.data;
  },

  async update(id: number, data: Partial<MedioPago>) {
    const response = await apiClient.put<MedioPago>(`/medios-pago/${id}`, data);
    return response.data;
  },

  async delete(id: number) {
    const response = await apiClient.delete(`/medios-pago/${id}`);
    return response.data;
  },
};