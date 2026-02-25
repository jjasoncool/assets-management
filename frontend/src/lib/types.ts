// src/lib/types.ts

// [新增] Service 需要的 Enum
export enum Collections {
  Assets = 'assets',
  MaintenanceRecords = 'maintenance_records',
  Users = 'users',
  AssetCategories = 'asset_categories',
  BorrowRecords = 'borrow_records'
}

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
  department?: string; // 保留您的欄位

  // 結構維持您原本的寫法
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
  is_lendable: boolean; // 是否可借用
  requires_approval?: boolean;
  notes?: string;
  created: string;
  updated: string;
  expand?: {
    [key: string]: any;
  };
}

// [新增] 維護紀錄介面
export interface MaintenanceRecord {
  id: string;
  asset: string;
  maintenance_date: string;
  complete_date?: string;
  maintenance_type: 'preventive' | 'corrective' | 'inspection';
  cost: number;
  performed_by?: string;
  description?: string;
  maintenance_images?: string[];
  created: string;
  updated: string;

  expand?: {
    asset?: Asset;
    performed_by?: {
      id: string;
      name?: string;
      email: string;
      avatar?: string;
    };
  };
}

// 2. Borrow 相關
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