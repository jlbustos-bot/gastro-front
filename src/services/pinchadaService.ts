import apiClient from '../api/client';

export interface Pinchada {
  id?: number;
  canilla_id?: number | null;
  canilla_nombre?: string | null;
  producto_id: number;
  producto_nombre?: string | null;
  producto_precioventa?: number;
  fecha_inicio: string;
  fecha_fin?: string | null;
  cantidad_vendida: number;
  aviso?: string;
  created_at?: string;
  updated_at?: string;
}

export const pinchadaService = {
  async getAll(filters?: { canilla_id?: number; producto_id?: number }) {
    const response = await apiClient.get<Pinchada[]>('/pinchadas', { params: filters });
    return response.data;
  },

  async getById(id: number) {
    const response = await apiClient.get<Pinchada>(`/pinchadas/${id}`);
    return response.data;
  },

  async create(data: Pinchada) {
    const response = await apiClient.post<Pinchada>('/pinchadas', data);
    return response.data;
  },

  async update(id: number, data: Partial<Pinchada>) {
    const response = await apiClient.put<Pinchada>(`/pinchadas/${id}`, data);
    return response.data;
  },

  async delete(id: number) {
    const response = await apiClient.delete(`/pinchadas/${id}`);
    return response.data;
  },
};