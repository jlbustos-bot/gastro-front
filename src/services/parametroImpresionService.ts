import apiClient from '../api/client';

export interface ParametroImpresion {
  id?: number;
  cantidad_copias: number;
  impresora_informes: string;
  impresora_ticket: string;
  activo?: boolean;
  created_at?: string;
  updated_at?: string;
}

export const parametroImpresionService = {
  async getAll(filters?: { activo?: boolean }) {
    const response = await apiClient.get<ParametroImpresion[]>('/parametros-impresion', { params: filters });
    return response.data;
  },

  async getById(id: number) {
    const response = await apiClient.get<ParametroImpresion>(`/parametros-impresion/${id}`);
    return response.data;
  },

  async create(data: ParametroImpresion) {
    const response = await apiClient.post<ParametroImpresion>('/parametros-impresion', data);
    return response.data;
  },

  async update(id: number, data: Partial<ParametroImpresion>) {
    const response = await apiClient.put<ParametroImpresion>(`/parametros-impresion/${id}`, data);
    return response.data;
  },

  async delete(id: number) {
    const response = await apiClient.delete(`/parametros-impresion/${id}`);
    return response.data;
  },
};