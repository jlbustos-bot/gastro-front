import apiClient from '../api/client';

export interface RecetaComponente {
  id?: number;
  receta_id?: number;
  producto_id?: number | null;
  producto_nombre?: string | null;
  nombre: string;
  cantidad: number;
  unidad?: string;
  costo_unitario: number;
  costo_total: number;
  created_at?: string;
  updated_at?: string;
}

export interface Receta {
  id?: number;
  nombre: string;
  producto_id?: number | null;
  producto_nombre?: string | null;
  producto_precioventa?: number;
  descripcion?: string;
  cantidad_rinde: number;
  unidad?: string;
  costo_total: number;
  observaciones?: string;
  activo?: boolean;
  componentes?: RecetaComponente[];
  created_at?: string;
  updated_at?: string;
}

export interface RecetaComponenteInput {
  producto_id?: number | null;
  nombre: string;
  cantidad: number;
  unidad?: string;
  costo_unitario: number;
}

export interface RecetaInput {
  nombre: string;
  producto_id?: number | null;
  descripcion?: string;
  cantidad_rinde: number;
  unidad?: string;
  observaciones?: string;
  activo?: boolean;
  componentes?: RecetaComponenteInput[];
}

export const recetaService = {
  async getAll(filters?: { activo?: boolean }) {
    const response = await apiClient.get<Receta[]>('/recetas', { params: filters });
    return response.data;
  },

  async getById(id: number) {
    const response = await apiClient.get<Receta>(`/recetas/${id}`);
    return response.data;
  },

  async create(data: RecetaInput) {
    const response = await apiClient.post<Receta>('/recetas', data);
    return response.data;
  },

  async update(id: number, data: RecetaInput) {
    const response = await apiClient.put<Receta>(`/recetas/${id}`, data);
    return response.data;
  },

  async delete(id: number) {
    const response = await apiClient.delete(`/recetas/${id}`);
    return response.data;
  },

  async addComponente(recetaId: number, data: RecetaComponenteInput) {
    const response = await apiClient.post<RecetaComponente>(`/recetas/${recetaId}/componentes`, data);
    return response.data;
  },

  async updateComponente(recetaId: number, componenteId: number, data: Partial<RecetaComponenteInput>) {
    const response = await apiClient.put<RecetaComponente>(
      `/recetas/${recetaId}/componentes/${componenteId}`,
      data
    );
    return response.data;
  },

  async deleteComponente(recetaId: number, componenteId: number) {
    const response = await apiClient.delete(`/recetas/${recetaId}/componentes/${componenteId}`);
    return response.data;
  },
};
