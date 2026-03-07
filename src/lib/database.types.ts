export interface Database {
  public: {
    Tables: {
      consumer_overall_metrics: {
        Row: {
          id: number;
          metric_type: string;
          metric: string;
          period: string;
          value: number | null;
          benchmark: number | null;
          created_at: string;
        };
        Insert: Omit<Database['public']['Tables']['consumer_overall_metrics']['Row'], 'id' | 'created_at'> & { id?: number; created_at?: string };
        Update: Partial<Database['public']['Tables']['consumer_overall_metrics']['Row']>;
        Relationships: [];
      };
      consumer_product_metrics: {
        Row: {
          id: number;
          product_name: string;
          metric_type: string;
          metric: string;
          period: string;
          value: number | null;
          benchmark: number | null;
          created_at: string;
        };
        Insert: Omit<Database['public']['Tables']['consumer_product_metrics']['Row'], 'id' | 'created_at'> & { id?: number; created_at?: string };
        Update: Partial<Database['public']['Tables']['consumer_product_metrics']['Row']>;
        Relationships: [];
      };
      net_flow_rates: {
        Row: {
          id: number;
          portfolio: string;
          bucket: string;
          period: string;
          value: number;
          created_at: string;
        };
        Insert: Omit<Database['public']['Tables']['net_flow_rates']['Row'], 'id' | 'created_at'> & { id?: number; created_at?: string };
        Update: Partial<Database['public']['Tables']['net_flow_rates']['Row']>;
        Relationships: [];
      };
      roll_rate_series: {
        Row: {
          id: number;
          bucket: string;
          metric: string;
          period: string;
          value: number;
          created_at: string;
        };
        Insert: Omit<Database['public']['Tables']['roll_rate_series']['Row'], 'id' | 'created_at'> & { id?: number; created_at?: string };
        Update: Partial<Database['public']['Tables']['roll_rate_series']['Row']>;
        Relationships: [];
      };
      collection_metrics: {
        Row: {
          id: number;
          portfolio: string;
          bucket: string;
          amount: number | null;
          transitions: number | null;
          normalized: number | null;
          roll_backward: number | null;
          stabilized: number | null;
          roll_forward: number | null;
          period: string;
          created_at: string;
        };
        Insert: Omit<Database['public']['Tables']['collection_metrics']['Row'], 'id' | 'created_at'> & { id?: number; created_at?: string };
        Update: Partial<Database['public']['Tables']['collection_metrics']['Row']>;
        Relationships: [];
      };
      vintage_points: {
        Row: {
          id: number;
          vintage: string;
          portfolio_segment: string;
          loan_amount: number | null;
          mob: number;
          delinquency_rate: number;
          metric_type: string;
          created_at: string;
        };
        Insert: Omit<Database['public']['Tables']['vintage_points']['Row'], 'id' | 'created_at'> & { id?: number; created_at?: string };
        Update: Partial<Database['public']['Tables']['vintage_points']['Row']>;
        Relationships: [];
      };
      non_starters: {
        Row: {
          id: number;
          category: string;
          product: string;
          metric: string;
          period: string;
          value: number | null;
          created_at: string;
        };
        Insert: Omit<Database['public']['Tables']['non_starters']['Row'], 'id' | 'created_at'> & { id?: number; created_at?: string };
        Update: Partial<Database['public']['Tables']['non_starters']['Row']>;
        Relationships: [];
      };
      tdd_pre_disbursal: {
        Row: {
          id: number;
          metric: string;
          period: string;
          value: number | null;
          created_at: string;
        };
        Insert: Omit<Database['public']['Tables']['tdd_pre_disbursal']['Row'], 'id' | 'created_at'> & { id?: number; created_at?: string };
        Update: Partial<Database['public']['Tables']['tdd_pre_disbursal']['Row']>;
        Relationships: [];
      };
      tdd_post_disbursal: {
        Row: {
          id: number;
          variant: string;
          bureau_bucket: string;
          period: string;
          value: number | null;
          created_at: string;
        };
        Insert: Omit<Database['public']['Tables']['tdd_post_disbursal']['Row'], 'id' | 'created_at'> & { id?: number; created_at?: string };
        Update: Partial<Database['public']['Tables']['tdd_post_disbursal']['Row']>;
        Relationships: [];
      };
      approved_base: {
        Row: {
          id: number;
          la_band: string;
          loan_band: string;
          count: number | null;
          amount: number | null;
          created_at: string;
        };
        Insert: Omit<Database['public']['Tables']['approved_base']['Row'], 'id' | 'created_at'> & { id?: number; created_at?: string };
        Update: Partial<Database['public']['Tables']['approved_base']['Row']>;
        Relationships: [];
      };
      rejected_base: {
        Row: {
          id: number;
          loan_type: string;
          amount_band: string;
          count: number | null;
          amount: number | null;
          created_at: string;
        };
        Insert: Omit<Database['public']['Tables']['rejected_base']['Row'], 'id' | 'created_at'> & { id?: number; created_at?: string };
        Update: Partial<Database['public']['Tables']['rejected_base']['Row']>;
        Relationships: [];
      };
      los_metrics: {
        Row: {
          id: number;
          metric: string;
          product: string;
          ftd: number | null;
          mtd: number | null;
          lmtd: number | null;
          lm_full: number | null;
          mom_change: number | null;
          target: number | null;
          achievement: number | null;
          report_date: string;
          created_at: string;
        };
        Insert: Omit<Database['public']['Tables']['los_metrics']['Row'], 'id' | 'created_at' | 'report_date'> & { id?: number; created_at?: string; report_date?: string };
        Update: Partial<Database['public']['Tables']['los_metrics']['Row']>;
        Relationships: [];
      };
      los_funnel: {
        Row: {
          id: number;
          stage: string;
          product: string;
          ftd: number | null;
          mtd: number | null;
          lmtd: number | null;
          conversion_rate: number | null;
          report_date: string;
          created_at: string;
        };
        Insert: Omit<Database['public']['Tables']['los_funnel']['Row'], 'id' | 'created_at' | 'report_date'> & { id?: number; created_at?: string; report_date?: string };
        Update: Partial<Database['public']['Tables']['los_funnel']['Row']>;
        Relationships: [];
      };
      los_daily: {
        Row: {
          id: number;
          date: string;
          product: string;
          count: number | null;
          amount: number | null;
          avg_ticket_size: number | null;
          created_at: string;
        };
        Insert: Omit<Database['public']['Tables']['los_daily']['Row'], 'id' | 'created_at'> & { id?: number; created_at?: string };
        Update: Partial<Database['public']['Tables']['los_daily']['Row']>;
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
  };
}
