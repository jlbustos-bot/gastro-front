import apiClient from '../api/client';

export interface Grupo2Prod {
  id?: number;
  nombre: string;
  activo: boolean;
}

export const grupo2prodService = {
  async getAll(filters?: { activo?: boolean }) {
    const response = await apiClient.get<Grupo2Prod[]>('/grupo2prod', { params: filters });
    return response.data;
  },

  async getById(id: number) {
    const response = await apiClient.get<Grupo2Prod>(`/grupo2prod/${id}`);
    return response.data;
  },

  async create(data: Grupo2Prod) {
    const response = await apiClient.post<Grupo2Prod>('/grupo2prod', data);
    return response.data;
  },

  async update(id: number, data: Partial<Grupo2Prod>) {
    const response = await apiClient.put<Grupo2Prod>(`/grupo2prod/${id}`, data);
    return response.data;
  },

  async delete(id: number) {
    const response = await apiClient.delete(`/grupo2prod/${id}`);
    return response.data;
  },
};
