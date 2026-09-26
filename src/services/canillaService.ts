import apiClient from '../api/client';

export interface Canilla {
  id?: number;
  nombre: string;
  producto_id?: number | null;
  producto_nombre?: string | null;
  producto_precioventa?: number;
  activo?: boolean;
  created_at?: string;
  updated_at?: string;
}

export const canillaService = {
  async getAll(filters?: { activo?: boolean }) {
    const response = await apiClient.get<Canilla[]>('/canillas', { params: filters });
    return response.data;
  },

  async getById(id: number) {
    const response = await apiClient.get<Canilla>(`/canillas/${id}`);
    return response.data;
  },

  async create(data: Canilla) {
    const response = await apiClient.post<Canilla>('/canillas', data);
    return response.data;
  },

  async update(id: number, data: Partial<Canilla>) {
    const response = await apiClient.put<Canilla>(`/canillas/${id}`, data);
    return response.data;
  },

  async delete(id: number) {
    const response = await apiClient.delete(`/canillas/${id}`);
    return response.data;
  },
};