import { trpc } from "../trpc/client";

export interface AuthUser {
  id: string;
  email: string;
  name?: string;
  role: string;
  token: string;
}

class AuthService {
  private user: AuthUser | null = null;
  private token: string | null = null;

  constructor() {
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem("auth_token");
      if (stored) {
        this.token = stored;
      }
    }
  }

  setAuth(user: AuthUser, token: string) {
    this.user = user;
    this.token = token;
    if (typeof window !== "undefined") {
      localStorage.setItem("auth_token", token);
    }
  }

  getToken() {
    return this.token;
  }

  getUser() {
    return this.user;
  }

  logout() {
    this.user = null;
    this.token = null;
    if (typeof window !== "undefined") {
      localStorage.removeItem("auth_token");
    }
  }

  isAuthenticated() {
    return !!this.token;
  }
}

export const authService = new AuthService();

