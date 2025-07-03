export type Transaction = {
  id: string;
  date: Date;
  executionDate?: Date;
  dueDate?: Date;
  supplierName: string;
  governorate?: string;
  city?: string;
  description: string;
  category?: string;
  variety?: string;
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

export type Expense = {
  id: string;
  date: Date;
  description: string;
  amount: number;
  paymentOrder?: string;
  supplierName?: string;
};

export type BalanceTransfer = {
  id: string;
  date: Date;
  amount: number;
  fromSupplier: string;
  toSupplier: string;
  reason: string;
  method: string;
};

export type SupplierPayment = {
  id: string;
  date: Date;
  amount: number;
  supplierName: string;
  method: 'نقدي' | 'بنكي';
  sourceBank?: string;
  destinationBank?: string;
  reason: string;
  responsiblePerson: string;
  documentUrl?: string;
};
