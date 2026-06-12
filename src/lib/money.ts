const fmt = new Intl.NumberFormat("en-KE", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

export const formatMoney = (n: number | string | null | undefined) =>
  `KSh ${fmt.format(Number(n ?? 0))}`;

export const formatNumber = (n: number | string | null | undefined) =>
  fmt.format(Number(n ?? 0));