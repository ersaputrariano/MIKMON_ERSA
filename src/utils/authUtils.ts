import { User } from '../types';

export const decodeToken = (token: string): User | null => {
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    return {
      id: payload.id,
      username: payload.username,
      name: payload.name,
      profilePictureUrl: payload.profilePictureUrl
    };
  } catch (error) {
    console.error('Error decoding token:', error);
    return null;
  }
};