import { http } from "../http";

const orgHeaders = (organizationId, extra = {}) => ({
  "x-organization-id": organizationId,
  ...extra,
});

const storeHeaders = (organizationId, storeId) =>
  orgHeaders(organizationId, { "x-store-id": storeId });

export const tenantApi = {
  listOrganizations: (params = {}) => http.get("/tenant/organizations", { params }),

  createOrganization: (data) => http.post("/tenant/organizations", data),

  getOrganization: (organizationId) =>
    http.get(`/tenant/organizations/${organizationId}`, {
      headers: orgHeaders(organizationId),
    }),

  listStores: (organizationId, params = {}) =>
    http.get(`/tenant/organizations/${organizationId}/stores`, {
      params,
      headers: orgHeaders(organizationId),
    }),

  createStore: (organizationId, data) =>
    http.post(`/tenant/organizations/${organizationId}/stores`, data, {
      headers: orgHeaders(organizationId),
    }),

  updateStore: (organizationId, storeId, data) =>
    http.patch(`/tenant/stores/${storeId}`, data, {
      headers: storeHeaders(organizationId, storeId),
    }),

  listRegisters: (organizationId, storeId, params = {}) =>
    http.get(`/tenant/stores/${storeId}/registers`, {
      params,
      headers: storeHeaders(organizationId, storeId),
    }),

  createRegister: (organizationId, storeId, data) =>
    http.post(`/tenant/stores/${storeId}/registers`, data, {
      headers: storeHeaders(organizationId, storeId),
    }),

  updateRegister: (organizationId, storeId, registerId, data) =>
    http.patch(`/tenant/registers/${registerId}`, data, {
      headers: {
        ...storeHeaders(organizationId, storeId),
        "x-register-id": registerId,
      },
    }),

  listMembers: (organizationId, params = {}) =>
    http.get(`/tenant/organizations/${organizationId}/members`, {
      params,
      headers: orgHeaders(organizationId),
    }),

  addMember: (organizationId, data) =>
    http.post(`/tenant/organizations/${organizationId}/members`, data, {
      headers: orgHeaders(organizationId),
    }),

  updateMember: (organizationId, memberId, data) =>
    http.patch(`/tenant/members/${memberId}`, data, {
      headers: orgHeaders(organizationId),
    }),

  listAuditLogs: (organizationId, params = {}) =>
    http.get(`/tenant/organizations/${organizationId}/audit-logs`, {
      params,
      headers: orgHeaders(organizationId),
    }),
};
