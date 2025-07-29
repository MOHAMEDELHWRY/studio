export type Transaction = {
  id: string;
  date: Date;
  executionDate?: Date;
  showExecutionDate?: boolean;
  dueDate?: Date;
  supplierName: string;
  customerName?: string;
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
  fromAccount: 'sales_balance' | 'factory_balance' | 'profit_expense';
  toAccount: 'sales_balance' | 'factory_balance';
  reason: string;
};

export type SupplierPayment = {
  id: string;
  date: Date;
  amount: number;
  supplierName: string;
  method: 'نقدي' | 'بنكي';
  classification: 'دفعة من رصيد المبيعات' | 'سحب أرباح للمورد' | 'سداد للمصنع عن المورد' | 'استعادة مبلغ كتسوية' | 'سحب مبلغ كتسوية';
  sourceBank?: string;
  status?: 'uploading' | 'completed' | 'upload_failed';
  documentUrl?: string;
  documentPath?: string;
  destinationBank?: string;
  reason: string;
  responsiblePerson: string;
};
