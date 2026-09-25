export type TransactionType = "BORROW" | "RETURN" | "REPAIR_SEND" | "REPAIR_RECEIVE" | "MOVE";

export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  public: {
    Tables: {
      assets: {
        Row: {
          id: string;
          asset_no: string;
          asset_name: string;
          sap_no: string | null;
          current_status: string;
          current_location: string;
          repair_count: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          asset_no: string;
          asset_name: string;
          sap_no?: string | null;
          current_status?: string;
          current_location?: string;
          repair_count?: number;
          created_at?: string;
        };
        Update: {
          id?: string;
          asset_no?: string;
          asset_name?: string;
          sap_no?: string | null;
          current_status?: string;
          current_location?: string;
          repair_count?: number;
          created_at?: string;
        };
        Relationships: [];
      };
      transactions: {
        Row: {
          id: string;
          asset_no: string;
          transaction_type: TransactionType;
          ckl_no: string | null;
          employee_name: string | null;
          employee_id: string | null;
          transaction_date: string;
          remark: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          asset_no: string;
          transaction_type: TransactionType;
          ckl_no?: string | null;
          employee_name?: string | null;
          employee_id?: string | null;
          transaction_date?: string;
          remark?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          asset_no?: string;
          transaction_type?: TransactionType;
          ckl_no?: string | null;
          employee_name?: string | null;
          employee_id?: string | null;
          transaction_date?: string;
          remark?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };
      files: {
        Row: {
          id: string;
          transaction_id: string;
          file_url: string;
          file_type: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          transaction_id: string;
          file_url: string;
          file_type: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          transaction_id?: string;
          file_url?: string;
          file_type?: string;
          created_at?: string;
        };
        Relationships: [];
      };
      locations: {
        Row: {
          id: string;
          asset_no: string;
          old_location: string | null;
          new_location: string;
          latitude: number | null;
          longitude: number | null;
          move_date: string;
        };
        Insert: {
          id?: string;
          asset_no: string;
          old_location?: string | null;
          new_location: string;
          latitude?: number | null;
          longitude?: number | null;
          move_date?: string;
        };
        Update: {
          id?: string;
          asset_no?: string;
          old_location?: string | null;
          new_location?: string;
          latitude?: number | null;
          longitude?: number | null;
          move_date?: string;
        };
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};

export type AssetRow = Database["public"]["Tables"]["assets"]["Row"];
export type AssetInsert = Database["public"]["Tables"]["assets"]["Insert"];

export type TransactionRow = Database["public"]["Tables"]["transactions"]["Row"];
export type TransactionInsert = Database["public"]["Tables"]["transactions"]["Insert"];

export type FileRow = Database["public"]["Tables"]["files"]["Row"];
export type FileInsert = Database["public"]["Tables"]["files"]["Insert"];

export type LocationRow = Database["public"]["Tables"]["locations"]["Row"];
export type LocationInsert = Database["public"]["Tables"]["locations"]["Insert"];
