import { http } from "../http";

export const plansApi = {
  getAll: () => http.get("/plans"),
};
