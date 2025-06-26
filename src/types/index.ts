export type Transaction = {
  id: string;
  date: Date;
  supplierName: string;
  description: string;
  quantity: number;
  purchasePrice: number;
  totalPurchasePrice: number;
  sellingPrice: number;
  totalSellingPrice: number;
  taxes: number;
  profit: number;
  paidAmount: number;
};
