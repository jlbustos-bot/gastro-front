import apiClient from '../api/client';

export interface ProductoProveedor {
  id?: number;
  producto_id: number;
  proveedor_id: number;
  precio_por_litro: number;
  precio_barril: number;
  precio_venta_sugerido: number;
  activo: boolean;
  producto_nombre?: string | null;
  proveedor_nombre?: string | null;
}

export const productoProveedorService = {
  async getAll(filters?: { activo?: boolean; producto_id?: number; proveedor_id?: number }) {
    const response = await apiClient.get<ProductoProveedor[]>('/producto-proveedor', { params: filters });
    return response.data;
  },

  async getById(id: number) {
    const response = await apiClient.get<ProductoProveedor>(`/producto-proveedor/${id}`);
    return response.data;
  },

  async create(data: ProductoProveedor) {
    const response = await apiClient.post<ProductoProveedor>('/producto-proveedor', data);
    return response.data;
  },

  async update(id: number, data: Partial<ProductoProveedor>) {
    const response = await apiClient.put<ProductoProveedor>(`/producto-proveedor/${id}`, data);
    return response.data;
  },

  async delete(id: number) {
    const response = await apiClient.delete(`/producto-proveedor/${id}`);
    return response.data;
  },
};