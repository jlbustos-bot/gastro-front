import apiClient from '../api/client';

export interface ParametroProducto {
  id?: number;
  cantidad_barril_cerveza: number;
  coeficiente_precio_venta: number;
  activo: boolean;
}

export const parametroProductoService = {
  async getAll(filters?: { activo?: boolean }) {
    const response = await apiClient.get<ParametroProducto[]>('/parametros-productos', { params: filters });
    return response.data;
  },

  async getById(id: number) {
    const response = await apiClient.get<ParametroProducto>(`/parametros-productos/${id}`);
    return response.data;
  },

  async create(data: ParametroProducto) {
    const response = await apiClient.post<ParametroProducto>('/parametros-productos', data);
    return response.data;
  },

  async update(id: number, data: Partial<ParametroProducto>) {
    const response = await apiClient.put<ParametroProducto>(`/parametros-productos/${id}`, data);
    return response.data;
  },

  async delete(id: number) {
    const response = await apiClient.delete(`/parametros-productos/${id}`);
    return response.data;
  },
};