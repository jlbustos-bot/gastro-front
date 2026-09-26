import apiClient from '../api/client';

export interface CondicionCtaCte {
  id?: number;
  descripcion: string;
  cantidad_dias: number;
  activo?: boolean;
  created_at?: string;
  updated_at?: string;
}

export const condicionCtaCteService = {
  async getAll(filters?: { activo?: boolean }) {
    const response = await apiClient.get<CondicionCtaCte[]>('/condiciones-cta-cte', { params: filters });
    return response.data;
  },

  async getById(id: number) {
    const response = await apiClient.get<CondicionCtaCte>(`/condiciones-cta-cte/${id}`);
    return response.data;
  },

  async create(data: CondicionCtaCte) {
    const response = await apiClient.post<CondicionCtaCte>('/condiciones-cta-cte', data);
    return response.data;
  },

  async update(id: number, data: Partial<CondicionCtaCte>) {
    const response = await apiClient.put<CondicionCtaCte>(`/condiciones-cta-cte/${id}`, data);
    return response.data;
  },

  async delete(id: number) {
    const response = await apiClient.delete(`/condiciones-cta-cte/${id}`);
    return response.data;
  },
};