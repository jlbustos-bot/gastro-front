import apiClient from '../api/client';

export interface Producto {
  id?: number;
  nombre: string;
  nombrecorto: string;
  grupo1prod?: number | null;
  grupo1prod_nombre?: string | null;
  grupo2prod?: number | null;
  grupo2prod_nombre?: string | null;
  proveedor_id?: number | null;
  proveedor_nombre?: string | null;
  precioventa: number;
  activo: boolean;
}

export const productoService = {
  async getAll(filters?: { activo?: boolean }) {
    const response = await apiClient.get<Producto[]>('/productos', { params: filters });
    return response.data;
  },

  async getById(id: number) {
    const response = await apiClient.get<Producto>(`/productos/${id}`);
    return response.data;
  },

  async create(data: Producto) {
    const response = await apiClient.post<Producto>('/productos', data);
    return response.data;
  },

  async update(id: number, data: Partial<Producto>) {
    const response = await apiClient.put<Producto>(`/productos/${id}`, data);
    return response.data;
  },

  async delete(id: number) {
    const response = await apiClient.delete(`/productos/${id}`);
    return response.data;
  },
};
