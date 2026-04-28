import { create } from "zustand";

const useAuthStore = create((set) => ({
  user: JSON.parse(localStorage.getItem("wb_user") || "null"),
  token: localStorage.getItem("wb_token") || null,
  isAuthenticated: !!localStorage.getItem("wb_token"),

  login: (user, token) => {
    localStorage.setItem("wb_token", token);
    localStorage.setItem("wb_user", JSON.stringify(user));
    set({ user, token, isAuthenticated: true });
  },

  logout: () => {
    localStorage.removeItem("wb_token");
    localStorage.removeItem("wb_user");
    set({ user: null, token: null, isAuthenticated: false });
  },

  updateUser: (user) => {
    localStorage.setItem("wb_user", JSON.stringify(user));
    set({ user });
  }
}));

export default useAuthStore;
