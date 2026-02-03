// 1. Asset 相關
export interface AssetCategory {
  id: string;
  name: string;
  prefix: string;
  description?: string;
  next_sequence: number;
  created: string;
  updated: string;
}

export interface Asset {
  id: string;
  asset_id: string;
  name: string;
  brand?: string;
  model?: string;
  serial_number?: string;
  purchase_date?: string;
  purchase_price?: number;
  warranty_years?: number;
  location?: string;
  department?: string;
  // 注意：這裡定義的是 PocketBase 回傳的結構
  // 如果有 expand，這裡可能會是物件；如果沒有，則是 ID 字串
  category?: AssetCategory | string;
  assigned_to?: {
    id: string;
    name?: string;
    email: string;
  } | string;
  images?: string[];
  confidentiality_score?: number;
  integrity_score?: number;
  availability_score?: number;
  total_risk_score?: number;
  status: 'active' | 'inactive' | 'maintenance' | 'retired' | 'lost' | 'stolen' | 'borrowed';
  requires_approval?: boolean;
  notes?: string;
  created: string;
  updated: string;
}

export interface BorrowRecord {
  id: string;
  asset: string;
  user: string;
  borrow_date: string;
  expected_return_date: string;
  status: 'pending' | 'borrowed' | 'returned' | 'overdue' | 'rejected';
  borrow_images?: string[];
  return_images?: string[];
  created: string;
  updated: string;
  expand?: {
    asset?: Asset;
    user?: {
      id: string;
      name?: string;
      email: string;
    };
  };
}