const STORAGE_KEY = 'savdo-pos-context';

export const getPosContext = () => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
};

export const setPosContext = (context) => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(context));
};

export const clearPosContext = () => {
  localStorage.removeItem(STORAGE_KEY);
};

export const hasPosContext = (context) =>
  Boolean(context?.organizationId && context?.storeId && context?.registerId);
