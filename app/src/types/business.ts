export type BusinessStatus = "ACTIVE" | "INACTIVE" | "SUSPENDED";
export type UserStatus = "ACTIVE" | "INACTIVE" | "PENDING" | "SUSPENDED";

export interface Business {
  id: string;
  name: string;
  legal_name?: string | null;
  gst_number?: string | null;
  address?: string | null;
  phone?: string | null;
  email?: string | null;
  currency: string;
  timezone: string;
  status: BusinessStatus;
  created_at: string;
  updated_at: string;
}

export interface AppUser {
  id: string;
  business_id: string;
  auth_user_id?: string | null;
  name: string;
  email: string;
  phone?: string | null;
  status: UserStatus;
  permissions?: string[];
  created_at: string;
  updated_at: string;
}

export interface AppRole {
  id: string;
  business_id: string;
  name: string;
  description?: string | null;
  created_at: string;
  updated_at: string;
}

export interface AppPermission {
  id: string;
  module: string;
  action: string;
  description?: string | null;
  created_at: string;
}

export type PermissionName = `${string}.${string}`;
