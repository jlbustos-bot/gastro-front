import apiClient from '../api/client';

export interface User {
  id?: number;
  username: string;
  email: string;
  password?: string;
  role: string;
  created_at?: string;
  updated_at?: string;
}

export const userService = {
  async getAll(filters?: { role?: string }) {
    const response = await apiClient.get<User[]>('/users', { params: filters });
    return response.data;
  },

  async getById(id: number) {
    const response = await apiClient.get<User>(`/users/${id}`);
    return response.data;
  },

  async create(data: User) {
    const response = await apiClient.post<User>('/users', data);
    return response.data;
  },

  async update(id: number, data: Partial<User>) {
    const response = await apiClient.put<User>(`/users/${id}`, data);
    return response.data;
  },

  async delete(id: number) {
    const response = await apiClient.delete(`/users/${id}`);
    return response.data;
  },
};