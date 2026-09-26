import apiClient from '../api/client';

export interface Cliente {
  id?: number;
  nombre: string;
  apellido: string;
  documento?: string;
  telefono?: string;
  email?: string;
  direccion?: string;
  activo: boolean;
  created_at?: string;
  updated_at?: string;
}

export const clienteService = {
  async getAll(filters?: { activo?: boolean }) {
    const response = await apiClient.get<Cliente[]>('/clientes', { params: filters });
    return response.data;
  },

  async getById(id: number) {
    const response = await apiClient.get<Cliente>(`/clientes/${id}`);
    return response.data;
  },

  async create(data: Cliente) {
    const response = await apiClient.post<Cliente>('/clientes', data);
    return response.data;
  },

  async update(id: number, data: Partial<Cliente>) {
    const response = await apiClient.put<Cliente>(`/clientes/${id}`, data);
    return response.data;
  },

  async delete(id: number) {
    const response = await apiClient.delete(`/clientes/${id}`);
    return response.data;
  },
};