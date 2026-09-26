import apiClient from '../api/client';

export interface Grupo1Prod {
  id?: number;
  nombre: string;
  activo: boolean;
}

export const grupo1prodService = {
  async getAll(filters?: { activo?: boolean }) {
    const response = await apiClient.get<Grupo1Prod[]>('/grupo1prod', { params: filters });
    return response.data;
  },

  async getById(id: number) {
    const response = await apiClient.get<Grupo1Prod>(`/grupo1prod/${id}`);
    return response.data;
  },

  async create(data: Grupo1Prod) {
    const response = await apiClient.post<Grupo1Prod>('/grupo1prod', data);
    return response.data;
  },

  async update(id: number, data: Partial<Grupo1Prod>) {
    const response = await apiClient.put<Grupo1Prod>(`/grupo1prod/${id}`, data);
    return response.data;
  },

  async delete(id: number) {
    const response = await apiClient.delete(`/grupo1prod/${id}`);
    return response.data;
  },
};
