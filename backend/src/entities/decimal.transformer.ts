import { ValueTransformer } from 'typeorm';

// Postgres returns decimals as strings; convert so clients can do arithmetic.
export const decimalTransformer: ValueTransformer = {
  to: (v: number) => v,
  from: (v: string | null) => (v === null ? null : parseFloat(v)),
};
