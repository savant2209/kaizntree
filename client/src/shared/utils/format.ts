export const toNumber = (value: string | number | null | undefined): number => {
  if (value === null || value === undefined || value === '') return 0;
  const parsed = Number(value);
  return Number.isNaN(parsed) ? 0 : parsed;
};

export const currency = (value: number): string =>
  new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value);

export const percent = (value: number): string => `${value.toFixed(2)}%`;

export const dateTime = (value?: string | null): string => {
  if (!value) return '-';
  return new Date(value).toLocaleString('pt-BR');
};
