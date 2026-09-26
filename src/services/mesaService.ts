import apiClient from '../api/client';

export interface Mesa {
  id?: number;
  numero: number;
  capacidad: number;
  ubicacion?: string;
  estado: 'libre' | 'ocupada' | 'reservada' | 'inactiva';
  activo: boolean;
  created_at?: string;
  updated_at?: string;
}

export const mesaService = {
  async getAll(filters?: { activo?: boolean; estado?: string }) {
    const response = await apiClient.get<Mesa[]>('/mesas', { params: filters });
    return response.data;
  },

  async getById(id: number) {
    const response = await apiClient.get<Mesa>(`/mesas/${id}`);
    return response.data;
  },

  async create(data: Mesa) {
    const response = await apiClient.post<Mesa>('/mesas', data);
    return response.data;
  },

  async update(id: number, data: Partial<Mesa>) {
    const response = await apiClient.put<Mesa>(`/mesas/${id}`, data);
    return response.data;
  },

  async delete(id: number) {
    const response = await apiClient.delete(`/mesas/${id}`);
    return response.data;
  },
};