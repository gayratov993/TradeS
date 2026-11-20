import { useEffect } from 'react';

export function usePageTitle(title) {
  useEffect(() => {
    if (title) {
      document.title = `${title} | Savdo Go`;
    }
    return () => {
      document.title = 'Savdo Go';
    };
  }, [title]);
}
