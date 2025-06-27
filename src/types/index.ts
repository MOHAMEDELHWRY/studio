export type Transaction = {
  id: string;
  date: Date;
  executionDate: Date;
  dueDate: Date;
  supplierName: string;
  description: string;
  type: string;
  quantity: number;
  purchasePrice: number;
  totalPurchasePrice: number;
  sellingPrice: number;
  totalSellingPrice: number;
  taxes: number;
  profit: number;
  amountPaidToFactory: number;
  amountReceivedFromSupplier: number;
};
