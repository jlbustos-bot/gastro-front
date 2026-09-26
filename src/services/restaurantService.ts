import apiClient from '../api/client';

export interface Restaurant {
  id?: number;
  name: string;
  description?: string;
  address: string;
  phone: string;
  email: string;
  logo?: string;
}

export const restaurantService = {
  async getAll() {
    const response = await apiClient.get<Restaurant[]>('/restaurants');
    return response.data;
  },

  async getById(id: number) {
    const response = await apiClient.get<Restaurant>(`/restaurants/${id}`);
    return response.data;
  },

  async create(data: Restaurant) {
    const response = await apiClient.post<Restaurant>('/restaurants', data);
    return response.data;
  },

  async update(id: number, data: Partial<Restaurant>) {
    const response = await apiClient.put<Restaurant>(`/restaurants/${id}`, data);
    return response.data;
  },

  async delete(id: number) {
    const response = await apiClient.delete(`/restaurants/${id}`);
    return response.data;
  },
};
