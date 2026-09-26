import apiClient from '../api/client';

export interface Proveedor {
  id?: number;
  nombre: string;
  cuit?: string | null;
  telefono?: string | null;
  email?: string | null;
  direccion?: string | null;
  observaciones?: string | null;
  activo: boolean;
}

export const proveedorService = {
  async getAll(filters?: { activo?: boolean }) {
    const response = await apiClient.get<Proveedor[]>('/proveedores', { params: filters });
    return response.data;
  },

  async getById(id: number) {
    const response = await apiClient.get<Proveedor>(`/proveedores/${id}`);
    return response.data;
  },

  async create(data: Proveedor) {
    const response = await apiClient.post<Proveedor>('/proveedores', data);
    return response.data;
  },

  async update(id: number, data: Partial<Proveedor>) {
    const response = await apiClient.put<Proveedor>(`/proveedores/${id}`, data);
    return response.data;
  },

  async delete(id: number) {
    const response = await apiClient.delete(`/proveedores/${id}`);
    return response.data;
  },
};