export type Transaction = {
  id: string;
  date: Date;
  type: string;
  quantity: number;
  price: number;
  description: string;
  debit: number;
  credit: number;
};
