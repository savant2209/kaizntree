export const toNumber = (value: string | number | null | undefined): number => {
  if (value === null || value === undefined || value === '') return 0;
  const parsed = Number(value);
  return Number.isNaN(parsed) ? 0 : parsed;
};

export const currency = (value: number): string =>
  new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(value);

export const percent = (value: number): string => `${value.toFixed(2)}%`;

export const dateTime = (value?: string | null): string => {
  if (!value) return '-';
  return new Date(value).toLocaleString('en-US');
};

export const formatQuantity = (value: number | string | null | undefined): string => {
  const numeric = toNumber(value);
  return numeric.toFixed(3).replace(/\.?0+$/, '');
};
