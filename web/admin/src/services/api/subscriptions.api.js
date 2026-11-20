import { http } from "../http";

const orgHeaders = (organizationId) => ({ "x-organization-id": organizationId });

export const subscriptionsApi = {
  getCurrent: (organizationId) =>
    http.get("/subscriptions/current", { headers: orgHeaders(organizationId) }),

  changePlan: (organizationId, data) =>
    http.post("/subscriptions/change-plan", data, {
      headers: orgHeaders(organizationId),
    }),

  cancel: (organizationId) =>
    http.post("/subscriptions/cancel", {}, { headers: orgHeaders(organizationId) }),
};
