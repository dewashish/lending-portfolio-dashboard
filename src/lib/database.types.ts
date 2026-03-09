export interface Database {
  public: {
    Tables: {
      // ── User Profiles ───────────────────────────────────────────
      profiles: {
        Row: {
          id: string;
          display_name: string;
          role: 'super_admin' | 'cro' | 'product_analyst' | 'risk_analyst' | null;
          avatar_url: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          display_name?: string;
          role?: 'super_admin' | 'cro' | 'product_analyst' | 'risk_analyst' | null;
          avatar_url?: string | null;
        };
        Update: {
          display_name?: string;
          role?: 'super_admin' | 'cro' | 'product_analyst' | 'risk_analyst' | null;
          avatar_url?: string | null;
        };
        Relationships: [];
      };

      // ── Dimension Tables ──────────────────────────────────────────
      regions: {
        Row: { id: number; name: string; display_order: number; created_at: string };
        Insert: { id?: number; name: string; display_order?: number; created_at?: string };
        Update: { id?: number; name?: string; display_order?: number; created_at?: string };
        Relationships: [];
      };
      subsidiaries: {
        Row: {
          id: number; name: string; short_code: string; country: string;
          country_code: string; region_id: number; currency_code: string;
          institution_type: string; is_active: boolean; created_at: string;
        };
        Insert: {
          id?: number; name: string; short_code: string; country: string;
          country_code: string; region_id: number; currency_code: string;
          institution_type: string; is_active?: boolean; created_at?: string;
        };
        Update: {
          id?: number; name?: string; short_code?: string; country?: string;
          country_code?: string; region_id?: number; currency_code?: string;
          institution_type?: string; is_active?: boolean; created_at?: string;
        };
        Relationships: [];
      };
      currencies: {
        Row: { code: string; name: string; symbol: string };
        Insert: { code: string; name: string; symbol: string };
        Update: { code?: string; name?: string; symbol?: string };
        Relationships: [];
      };
      fx_rates: {
        Row: { id: number; from_currency: string; to_currency: string; rate: number; effective_date: string; created_at: string };
        Insert: { id?: number; from_currency: string; to_currency?: string; rate: number; effective_date: string; created_at?: string };
        Update: { id?: number; from_currency?: string; to_currency?: string; rate?: number; effective_date?: string; created_at?: string };
        Relationships: [];
      };
      data_sources: {
        Row: { id: number; subsidiary_id: number; source_type: string; source_name: string | null; last_sync_at: string | null; status: string; created_at: string };
        Insert: { id?: number; subsidiary_id: number; source_type: string; source_name?: string | null; last_sync_at?: string | null; status?: string; created_at?: string };
        Update: { id?: number; subsidiary_id?: number; source_type?: string; source_name?: string | null; last_sync_at?: string | null; status?: string; created_at?: string };
        Relationships: [];
      };
      product_catalog: {
        Row: { id: number; subsidiary_id: number; product_name: string; product_category: string; is_active: boolean; created_at: string };
        Insert: { id?: number; subsidiary_id: number; product_name: string; product_category: string; is_active?: boolean; created_at?: string };
        Update: { id?: number; subsidiary_id?: number; product_name?: string; product_category?: string; is_active?: boolean; created_at?: string };
        Relationships: [];
      };

      // ── LOS Tables ────────────────────────────────────────────────
      los_customers: {
        Row: {
          id: number; subsidiary_id: number; customer_ref: string;
          first_name: string; last_name: string; date_of_birth: string | null;
          gender: string | null; national_id: string | null; email: string | null;
          phone: string | null; employment_type: string | null; employer_name: string | null;
          monthly_income: number | null; monthly_income_usd: number | null;
          address_line1: string | null; city: string | null; state_province: string | null;
          postal_code: string | null; country_code: string; created_at: string;
        };
        Insert: {
          id?: number; subsidiary_id: number; customer_ref: string;
          first_name: string; last_name: string; date_of_birth?: string | null;
          gender?: string | null; national_id?: string | null; email?: string | null;
          phone?: string | null; employment_type?: string | null; employer_name?: string | null;
          monthly_income?: number | null; monthly_income_usd?: number | null;
          address_line1?: string | null; city?: string | null; state_province?: string | null;
          postal_code?: string | null; country_code: string; created_at?: string;
        };
        Update: {
          id?: number; subsidiary_id?: number; customer_ref?: string;
          first_name?: string; last_name?: string; date_of_birth?: string | null;
          gender?: string | null; national_id?: string | null; email?: string | null;
          phone?: string | null; employment_type?: string | null; employer_name?: string | null;
          monthly_income?: number | null; monthly_income_usd?: number | null;
          address_line1?: string | null; city?: string | null; state_province?: string | null;
          postal_code?: string | null; country_code?: string; created_at?: string;
        };
        Relationships: [];
      };
      los_applications: {
        Row: {
          id: number; subsidiary_id: number; application_ref: string;
          customer_id: number; product_name: string; product_category: string;
          channel: string; requested_amount: number; requested_amount_usd: number | null;
          requested_tenure_months: number | null; current_stage: string;
          lead_date: string | null; application_date: string | null;
          sanction_date: string | null; disbursement_date: string | null;
          rejection_date: string | null; sanctioned_amount: number | null;
          sanctioned_amount_usd: number | null; approved_rate: number | null;
          approved_tenure_months: number | null; branch_code: string | null;
          rm_code: string | null; data_source_id: number | null; created_at: string;
        };
        Insert: {
          id?: number; subsidiary_id: number; application_ref: string;
          customer_id: number; product_name: string; product_category: string;
          channel: string; requested_amount: number; requested_amount_usd?: number | null;
          requested_tenure_months?: number | null; current_stage: string;
          lead_date?: string | null; application_date?: string | null;
          sanction_date?: string | null; disbursement_date?: string | null;
          rejection_date?: string | null; sanctioned_amount?: number | null;
          sanctioned_amount_usd?: number | null; approved_rate?: number | null;
          approved_tenure_months?: number | null; branch_code?: string | null;
          rm_code?: string | null; data_source_id?: number | null; created_at?: string;
        };
        Update: {
          id?: number; subsidiary_id?: number; application_ref?: string;
          customer_id?: number; product_name?: string; product_category?: string;
          channel?: string; requested_amount?: number; requested_amount_usd?: number | null;
          requested_tenure_months?: number | null; current_stage?: string;
          lead_date?: string | null; application_date?: string | null;
          sanction_date?: string | null; disbursement_date?: string | null;
          rejection_date?: string | null; sanctioned_amount?: number | null;
          sanctioned_amount_usd?: number | null; approved_rate?: number | null;
          approved_tenure_months?: number | null; branch_code?: string | null;
          rm_code?: string | null; data_source_id?: number | null; created_at?: string;
        };
        Relationships: [];
      };
      los_credit_bureau_pulls: {
        Row: {
          id: number; subsidiary_id: number; application_id: number;
          customer_id: number; bureau_name: string; score: number | null;
          score_band: string | null; pull_date: string;
          num_active_accounts: number | null; num_inquiries_90d: number | null;
          total_existing_debt: number | null; total_existing_debt_usd: number | null;
          delinquency_flag: boolean; created_at: string;
        };
        Insert: {
          id?: number; subsidiary_id: number; application_id: number;
          customer_id: number; bureau_name: string; score?: number | null;
          score_band?: string | null; pull_date: string;
          num_active_accounts?: number | null; num_inquiries_90d?: number | null;
          total_existing_debt?: number | null; total_existing_debt_usd?: number | null;
          delinquency_flag?: boolean; created_at?: string;
        };
        Update: {
          id?: number; subsidiary_id?: number; application_id?: number;
          customer_id?: number; bureau_name?: string; score?: number | null;
          score_band?: string | null; pull_date?: string;
          num_active_accounts?: number | null; num_inquiries_90d?: number | null;
          total_existing_debt?: number | null; total_existing_debt_usd?: number | null;
          delinquency_flag?: boolean; created_at?: string;
        };
        Relationships: [];
      };
      los_decisions: {
        Row: {
          id: number; subsidiary_id: number; application_id: number;
          decision: string; decision_date: string; decided_by: string | null;
          rejection_reason: string | null; conditions: string | null; created_at: string;
        };
        Insert: {
          id?: number; subsidiary_id: number; application_id: number;
          decision: string; decision_date: string; decided_by?: string | null;
          rejection_reason?: string | null; conditions?: string | null; created_at?: string;
        };
        Update: {
          id?: number; subsidiary_id?: number; application_id?: number;
          decision?: string; decision_date?: string; decided_by?: string | null;
          rejection_reason?: string | null; conditions?: string | null; created_at?: string;
        };
        Relationships: [];
      };
      los_disbursements: {
        Row: {
          id: number; subsidiary_id: number; application_id: number;
          customer_id: number; lms_account_ref: string | null; disbursement_date: string;
          disbursed_amount: number; disbursed_amount_usd: number | null;
          disbursement_type: string; product_name: string; interest_rate: number;
          tenure_months: number; emi_amount: number | null; emi_amount_usd: number | null;
          created_at: string;
        };
        Insert: {
          id?: number; subsidiary_id: number; application_id: number;
          customer_id: number; lms_account_ref?: string | null; disbursement_date: string;
          disbursed_amount: number; disbursed_amount_usd?: number | null;
          disbursement_type: string; product_name: string; interest_rate: number;
          tenure_months: number; emi_amount?: number | null; emi_amount_usd?: number | null;
          created_at?: string;
        };
        Update: {
          id?: number; subsidiary_id?: number; application_id?: number;
          customer_id?: number; lms_account_ref?: string | null; disbursement_date?: string;
          disbursed_amount?: number; disbursed_amount_usd?: number | null;
          disbursement_type?: string; product_name?: string; interest_rate?: number;
          tenure_months?: number; emi_amount?: number | null; emi_amount_usd?: number | null;
          created_at?: string;
        };
        Relationships: [];
      };

      // ── LMS Tables ────────────────────────────────────────────────
      lms_accounts: {
        Row: {
          id: number; subsidiary_id: number; account_ref: string;
          customer_id: number; application_id: number | null;
          product_name: string; product_category: string;
          disbursement_date: string; maturity_date: string;
          sanction_amount: number; sanction_amount_usd: number | null;
          disbursed_amount: number; disbursed_amount_usd: number | null;
          interest_rate: number; tenure_months: number;
          emi_amount: number; emi_amount_usd: number | null;
          principal_outstanding: number; principal_outstanding_usd: number | null;
          current_dpd: number; dpd_bucket: string; ifrs_stage: string;
          account_status: string; vintage: string;
          is_secured: boolean; is_npa: boolean; is_restructured: boolean;
          disbursement_type: string | null; branch_code: string | null;
          data_source_id: number | null; created_at: string; updated_at: string;
        };
        Insert: {
          id?: number; subsidiary_id: number; account_ref: string;
          customer_id: number; application_id?: number | null;
          product_name: string; product_category: string;
          disbursement_date: string; maturity_date: string;
          sanction_amount: number; sanction_amount_usd?: number | null;
          disbursed_amount: number; disbursed_amount_usd?: number | null;
          interest_rate: number; tenure_months: number;
          emi_amount: number; emi_amount_usd?: number | null;
          principal_outstanding?: number; principal_outstanding_usd?: number | null;
          current_dpd?: number; dpd_bucket?: string; ifrs_stage?: string;
          account_status?: string; vintage: string;
          is_secured?: boolean; is_npa?: boolean; is_restructured?: boolean;
          disbursement_type?: string | null; branch_code?: string | null;
          data_source_id?: number | null; created_at?: string; updated_at?: string;
        };
        Update: {
          id?: number; subsidiary_id?: number; account_ref?: string;
          customer_id?: number; application_id?: number | null;
          product_name?: string; product_category?: string;
          disbursement_date?: string; maturity_date?: string;
          sanction_amount?: number; sanction_amount_usd?: number | null;
          disbursed_amount?: number; disbursed_amount_usd?: number | null;
          interest_rate?: number; tenure_months?: number;
          emi_amount?: number; emi_amount_usd?: number | null;
          principal_outstanding?: number; principal_outstanding_usd?: number | null;
          current_dpd?: number; dpd_bucket?: string; ifrs_stage?: string;
          account_status?: string; vintage?: string;
          is_secured?: boolean; is_npa?: boolean; is_restructured?: boolean;
          disbursement_type?: string | null; branch_code?: string | null;
          data_source_id?: number | null; created_at?: string; updated_at?: string;
        };
        Relationships: [];
      };
      lms_balance_snapshots: {
        Row: {
          id: number; subsidiary_id: number; account_id: number;
          snapshot_date: string; principal_outstanding: number;
          principal_outstanding_usd: number | null;
          interest_outstanding: number | null; interest_outstanding_usd: number | null;
          overdue_amount: number | null; overdue_amount_usd: number | null;
          provision_amount: number | null; provision_amount_usd: number | null;
          dpd: number; dpd_bucket: string; ifrs_stage: string;
          emi_due_count: number | null; created_at: string;
        };
        Insert: {
          id?: number; subsidiary_id: number; account_id: number;
          snapshot_date: string; principal_outstanding: number;
          principal_outstanding_usd?: number | null;
          interest_outstanding?: number | null; interest_outstanding_usd?: number | null;
          overdue_amount?: number | null; overdue_amount_usd?: number | null;
          provision_amount?: number | null; provision_amount_usd?: number | null;
          dpd?: number; dpd_bucket: string; ifrs_stage: string;
          emi_due_count?: number | null; created_at?: string;
        };
        Update: {
          id?: number; subsidiary_id?: number; account_id?: number;
          snapshot_date?: string; principal_outstanding?: number;
          principal_outstanding_usd?: number | null;
          interest_outstanding?: number | null; interest_outstanding_usd?: number | null;
          overdue_amount?: number | null; overdue_amount_usd?: number | null;
          provision_amount?: number | null; provision_amount_usd?: number | null;
          dpd?: number; dpd_bucket?: string; ifrs_stage?: string;
          emi_due_count?: number | null; created_at?: string;
        };
        Relationships: [];
      };
      lms_dpd_history: {
        Row: {
          id: number; subsidiary_id: number; account_id: number;
          period: string; dpd: number; dpd_bucket: string;
          previous_dpd_bucket: string | null; created_at: string;
        };
        Insert: {
          id?: number; subsidiary_id: number; account_id: number;
          period: string; dpd: number; dpd_bucket: string;
          previous_dpd_bucket?: string | null; created_at?: string;
        };
        Update: {
          id?: number; subsidiary_id?: number; account_id?: number;
          period?: string; dpd?: number; dpd_bucket?: string;
          previous_dpd_bucket?: string | null; created_at?: string;
        };
        Relationships: [];
      };
      lms_payment_transactions: {
        Row: {
          id: number; subsidiary_id: number; account_id: number;
          payment_date: string; amount: number; amount_usd: number | null;
          payment_mode: string;
          principal_component: number | null; interest_component: number | null;
          fees_component: number | null; penalty_component: number | null;
          status: string; bounce_reason: string | null;
          reference_number: string | null; created_at: string;
        };
        Insert: {
          id?: number; subsidiary_id: number; account_id: number;
          payment_date: string; amount: number; amount_usd?: number | null;
          payment_mode: string;
          principal_component?: number | null; interest_component?: number | null;
          fees_component?: number | null; penalty_component?: number | null;
          status?: string; bounce_reason?: string | null;
          reference_number?: string | null; created_at?: string;
        };
        Update: {
          id?: number; subsidiary_id?: number; account_id?: number;
          payment_date?: string; amount?: number; amount_usd?: number | null;
          payment_mode?: string;
          principal_component?: number | null; interest_component?: number | null;
          fees_component?: number | null; penalty_component?: number | null;
          status?: string; bounce_reason?: string | null;
          reference_number?: string | null; created_at?: string;
        };
        Relationships: [];
      };
      lms_collateral: {
        Row: {
          id: number; subsidiary_id: number; account_id: number;
          collateral_type: string; description: string | null;
          valuation_amount: number; valuation_amount_usd: number | null;
          valuation_date: string; ltv_ratio: number | null;
          current_ltv: number | null; created_at: string;
        };
        Insert: {
          id?: number; subsidiary_id: number; account_id: number;
          collateral_type: string; description?: string | null;
          valuation_amount: number; valuation_amount_usd?: number | null;
          valuation_date: string; ltv_ratio?: number | null;
          current_ltv?: number | null; created_at?: string;
        };
        Update: {
          id?: number; subsidiary_id?: number; account_id?: number;
          collateral_type?: string; description?: string | null;
          valuation_amount?: number; valuation_amount_usd?: number | null;
          valuation_date?: string; ltv_ratio?: number | null;
          current_ltv?: number | null; created_at?: string;
        };
        Relationships: [];
      };
      lms_writeoffs: {
        Row: {
          id: number; subsidiary_id: number; account_id: number;
          writeoff_date: string; writeoff_amount: number;
          writeoff_amount_usd: number | null; reason: string | null;
          total_recovered: number | null; total_recovered_usd: number | null;
          created_at: string;
        };
        Insert: {
          id?: number; subsidiary_id: number; account_id: number;
          writeoff_date: string; writeoff_amount: number;
          writeoff_amount_usd?: number | null; reason?: string | null;
          total_recovered?: number | null; total_recovered_usd?: number | null;
          created_at?: string;
        };
        Update: {
          id?: number; subsidiary_id?: number; account_id?: number;
          writeoff_date?: string; writeoff_amount?: number;
          writeoff_amount_usd?: number | null; reason?: string | null;
          total_recovered?: number | null; total_recovered_usd?: number | null;
          created_at?: string;
        };
        Relationships: [];
      };
      lms_restructures: {
        Row: {
          id: number; subsidiary_id: number; account_id: number;
          restructure_date: string; restructure_type: string;
          original_emi: number | null; revised_emi: number | null;
          revised_emi_usd: number | null; original_tenure: number | null;
          revised_tenure: number | null; dpd_at_restructure: number | null;
          created_at: string;
        };
        Insert: {
          id?: number; subsidiary_id: number; account_id: number;
          restructure_date: string; restructure_type: string;
          original_emi?: number | null; revised_emi?: number | null;
          revised_emi_usd?: number | null; original_tenure?: number | null;
          revised_tenure?: number | null; dpd_at_restructure?: number | null;
          created_at?: string;
        };
        Update: {
          id?: number; subsidiary_id?: number; account_id?: number;
          restructure_date?: string; restructure_type?: string;
          original_emi?: number | null; revised_emi?: number | null;
          revised_emi_usd?: number | null; original_tenure?: number | null;
          revised_tenure?: number | null; dpd_at_restructure?: number | null;
          created_at?: string;
        };
        Relationships: [];
      };

      // ── Collections Tables ────────────────────────────────────────
      col_agencies: {
        Row: {
          id: number; subsidiary_id: number; agency_name: string;
          agency_type: string; coverage_buckets: string[] | null;
          is_active: boolean; created_at: string;
        };
        Insert: {
          id?: number; subsidiary_id: number; agency_name: string;
          agency_type: string; coverage_buckets?: string[] | null;
          is_active?: boolean; created_at?: string;
        };
        Update: {
          id?: number; subsidiary_id?: number; agency_name?: string;
          agency_type?: string; coverage_buckets?: string[] | null;
          is_active?: boolean; created_at?: string;
        };
        Relationships: [];
      };
      col_assignments: {
        Row: {
          id: number; subsidiary_id: number; account_id: number;
          agency_id: number; assigned_date: string;
          dpd_at_assignment: number; bucket_at_assignment: string;
          outstanding_at_assignment: number; outstanding_at_assignment_usd: number | null;
          status: string; resolved_date: string | null;
          resolution_type: string | null; created_at: string;
        };
        Insert: {
          id?: number; subsidiary_id: number; account_id: number;
          agency_id: number; assigned_date: string;
          dpd_at_assignment: number; bucket_at_assignment: string;
          outstanding_at_assignment: number; outstanding_at_assignment_usd?: number | null;
          status?: string; resolved_date?: string | null;
          resolution_type?: string | null; created_at?: string;
        };
        Update: {
          id?: number; subsidiary_id?: number; account_id?: number;
          agency_id?: number; assigned_date?: string;
          dpd_at_assignment?: number; bucket_at_assignment?: string;
          outstanding_at_assignment?: number; outstanding_at_assignment_usd?: number | null;
          status?: string; resolved_date?: string | null;
          resolution_type?: string | null; created_at?: string;
        };
        Relationships: [];
      };
      col_actions: {
        Row: {
          id: number; subsidiary_id: number; assignment_id: number;
          account_id: number; action_date: string; action_type: string;
          outcome: string; promise_date: string | null;
          promise_amount: number | null; notes: string | null;
          agent_code: string | null; created_at: string;
        };
        Insert: {
          id?: number; subsidiary_id: number; assignment_id: number;
          account_id: number; action_date: string; action_type: string;
          outcome: string; promise_date?: string | null;
          promise_amount?: number | null; notes?: string | null;
          agent_code?: string | null; created_at?: string;
        };
        Update: {
          id?: number; subsidiary_id?: number; assignment_id?: number;
          account_id?: number; action_date?: string; action_type?: string;
          outcome?: string; promise_date?: string | null;
          promise_amount?: number | null; notes?: string | null;
          agent_code?: string | null; created_at?: string;
        };
        Relationships: [];
      };
      col_recovery_payments: {
        Row: {
          id: number; subsidiary_id: number; assignment_id: number;
          account_id: number; payment_date: string; amount: number;
          amount_usd: number | null; payment_mode: string;
          is_settlement: boolean; settlement_discount_pct: number | null;
          created_at: string;
        };
        Insert: {
          id?: number; subsidiary_id: number; assignment_id: number;
          account_id: number; payment_date: string; amount: number;
          amount_usd?: number | null; payment_mode: string;
          is_settlement?: boolean; settlement_discount_pct?: number | null;
          created_at?: string;
        };
        Update: {
          id?: number; subsidiary_id?: number; assignment_id?: number;
          account_id?: number; payment_date?: string; amount?: number;
          amount_usd?: number | null; payment_mode?: string;
          is_settlement?: boolean; settlement_discount_pct?: number | null;
          created_at?: string;
        };
        Relationships: [];
      };
      col_legal_cases: {
        Row: {
          id: number; subsidiary_id: number; account_id: number;
          assignment_id: number | null; case_ref: string | null;
          filing_date: string; case_type: string; case_status: string;
          outstanding_at_filing: number; outstanding_at_filing_usd: number | null;
          decree_amount: number | null; decree_amount_usd: number | null;
          closed_date: string | null; recovery_amount: number | null;
          recovery_amount_usd: number | null; created_at: string;
        };
        Insert: {
          id?: number; subsidiary_id: number; account_id: number;
          assignment_id?: number | null; case_ref?: string | null;
          filing_date: string; case_type: string; case_status?: string;
          outstanding_at_filing: number; outstanding_at_filing_usd?: number | null;
          decree_amount?: number | null; decree_amount_usd?: number | null;
          closed_date?: string | null; recovery_amount?: number | null;
          recovery_amount_usd?: number | null; created_at?: string;
        };
        Update: {
          id?: number; subsidiary_id?: number; account_id?: number;
          assignment_id?: number | null; case_ref?: string | null;
          filing_date?: string; case_type?: string; case_status?: string;
          outstanding_at_filing?: number; outstanding_at_filing_usd?: number | null;
          decree_amount?: number | null; decree_amount_usd?: number | null;
          closed_date?: string | null; recovery_amount?: number | null;
          recovery_amount_usd?: number | null; created_at?: string;
        };
        Relationships: [];
      };

      // ── PQR Summary Tables ────────────────────────────────────────
      consumer_overall_metrics: {
        Row: {
          id: number; subsidiary_id: number; metric_type: string;
          metric: string; period: string; value: number | null;
          value_usd: number | null; benchmark: number | null;
          data_source_id: number | null; created_at: string;
        };
        Insert: {
          id?: number; subsidiary_id: number; metric_type: string;
          metric: string; period: string; value?: number | null;
          value_usd?: number | null; benchmark?: number | null;
          data_source_id?: number | null; created_at?: string;
        };
        Update: {
          id?: number; subsidiary_id?: number; metric_type?: string;
          metric?: string; period?: string; value?: number | null;
          value_usd?: number | null; benchmark?: number | null;
          data_source_id?: number | null; created_at?: string;
        };
        Relationships: [];
      };
      consumer_product_metrics: {
        Row: {
          id: number; subsidiary_id: number; product_name: string;
          metric_type: string; metric: string; period: string;
          value: number | null; value_usd: number | null;
          benchmark: number | null; data_source_id: number | null;
          created_at: string;
        };
        Insert: {
          id?: number; subsidiary_id: number; product_name: string;
          metric_type: string; metric: string; period: string;
          value?: number | null; value_usd?: number | null;
          benchmark?: number | null; data_source_id?: number | null;
          created_at?: string;
        };
        Update: {
          id?: number; subsidiary_id?: number; product_name?: string;
          metric_type?: string; metric?: string; period?: string;
          value?: number | null; value_usd?: number | null;
          benchmark?: number | null; data_source_id?: number | null;
          created_at?: string;
        };
        Relationships: [];
      };
      net_flow_rates: {
        Row: {
          id: number; subsidiary_id: number; portfolio: string;
          bucket: string; period: string; value: number;
          value_usd: number | null; data_source_id: number | null;
          product_name: string | null; created_at: string;
        };
        Insert: {
          id?: number; subsidiary_id: number; portfolio: string;
          bucket: string; period: string; value: number;
          value_usd?: number | null; data_source_id?: number | null;
          product_name?: string | null; created_at?: string;
        };
        Update: {
          id?: number; subsidiary_id?: number; portfolio?: string;
          bucket?: string; period?: string; value?: number;
          value_usd?: number | null; data_source_id?: number | null;
          product_name?: string | null; created_at?: string;
        };
        Relationships: [];
      };
      roll_rate_series: {
        Row: {
          id: number; subsidiary_id: number; bucket: string;
          metric: string; period: string; value: number;
          data_source_id: number | null; product_name: string | null;
          created_at: string;
        };
        Insert: {
          id?: number; subsidiary_id: number; bucket: string;
          metric: string; period: string; value: number;
          data_source_id?: number | null; product_name?: string | null;
          created_at?: string;
        };
        Update: {
          id?: number; subsidiary_id?: number; bucket?: string;
          metric?: string; period?: string; value?: number;
          data_source_id?: number | null; product_name?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };
      collection_metrics: {
        Row: {
          id: number; subsidiary_id: number; portfolio: string;
          bucket: string; amount: number | null; amount_usd: number | null;
          transitions: number | null; normalized: number | null;
          roll_backward: number | null; stabilized: number | null;
          roll_forward: number | null; period: string;
          data_source_id: number | null; created_at: string;
        };
        Insert: {
          id?: number; subsidiary_id: number; portfolio: string;
          bucket: string; amount?: number | null; amount_usd?: number | null;
          transitions?: number | null; normalized?: number | null;
          roll_backward?: number | null; stabilized?: number | null;
          roll_forward?: number | null; period: string;
          data_source_id?: number | null; created_at?: string;
        };
        Update: {
          id?: number; subsidiary_id?: number; portfolio?: string;
          bucket?: string; amount?: number | null; amount_usd?: number | null;
          transitions?: number | null; normalized?: number | null;
          roll_backward?: number | null; stabilized?: number | null;
          roll_forward?: number | null; period?: string;
          data_source_id?: number | null; created_at?: string;
        };
        Relationships: [];
      };
      vintage_points: {
        Row: {
          id: number; subsidiary_id: number; vintage: string;
          portfolio_segment: string; loan_amount: number | null;
          loan_amount_usd: number | null; mob: number;
          delinquency_rate: number; metric_type: string;
          data_source_id: number | null; created_at: string;
        };
        Insert: {
          id?: number; subsidiary_id: number; vintage: string;
          portfolio_segment: string; loan_amount?: number | null;
          loan_amount_usd?: number | null; mob: number;
          delinquency_rate: number; metric_type?: string;
          data_source_id?: number | null; created_at?: string;
        };
        Update: {
          id?: number; subsidiary_id?: number; vintage?: string;
          portfolio_segment?: string; loan_amount?: number | null;
          loan_amount_usd?: number | null; mob?: number;
          delinquency_rate?: number; metric_type?: string;
          data_source_id?: number | null; created_at?: string;
        };
        Relationships: [];
      };
      non_starters: {
        Row: {
          id: number; subsidiary_id: number; category: string;
          product: string; metric: string; period: string;
          value: number | null; value_usd: number | null;
          data_source_id: number | null; created_at: string;
        };
        Insert: {
          id?: number; subsidiary_id: number; category: string;
          product: string; metric: string; period: string;
          value?: number | null; value_usd?: number | null;
          data_source_id?: number | null; created_at?: string;
        };
        Update: {
          id?: number; subsidiary_id?: number; category?: string;
          product?: string; metric?: string; period?: string;
          value?: number | null; value_usd?: number | null;
          data_source_id?: number | null; created_at?: string;
        };
        Relationships: [];
      };
      tdd_pre_disbursal: {
        Row: {
          id: number; subsidiary_id: number; metric: string;
          period: string; value: number | null;
          data_source_id: number | null; created_at: string;
        };
        Insert: {
          id?: number; subsidiary_id: number; metric: string;
          period: string; value?: number | null;
          data_source_id?: number | null; created_at?: string;
        };
        Update: {
          id?: number; subsidiary_id?: number; metric?: string;
          period?: string; value?: number | null;
          data_source_id?: number | null; created_at?: string;
        };
        Relationships: [];
      };
      tdd_post_disbursal: {
        Row: {
          id: number; subsidiary_id: number; variant: string;
          bureau_bucket: string; period: string; value: number | null;
          data_source_id: number | null; created_at: string;
        };
        Insert: {
          id?: number; subsidiary_id: number; variant: string;
          bureau_bucket: string; period: string; value?: number | null;
          data_source_id?: number | null; created_at?: string;
        };
        Update: {
          id?: number; subsidiary_id?: number; variant?: string;
          bureau_bucket?: string; period?: string; value?: number | null;
          data_source_id?: number | null; created_at?: string;
        };
        Relationships: [];
      };
      approved_base: {
        Row: {
          id: number; subsidiary_id: number; la_band: string;
          loan_band: string; count: number | null; amount: number | null;
          amount_usd: number | null; data_source_id: number | null;
          created_at: string;
        };
        Insert: {
          id?: number; subsidiary_id: number; la_band: string;
          loan_band: string; count?: number | null; amount?: number | null;
          amount_usd?: number | null; data_source_id?: number | null;
          created_at?: string;
        };
        Update: {
          id?: number; subsidiary_id?: number; la_band?: string;
          loan_band?: string; count?: number | null; amount?: number | null;
          amount_usd?: number | null; data_source_id?: number | null;
          created_at?: string;
        };
        Relationships: [];
      };
      rejected_base: {
        Row: {
          id: number; subsidiary_id: number; loan_type: string;
          amount_band: string; count: number | null; amount: number | null;
          amount_usd: number | null; data_source_id: number | null;
          created_at: string;
        };
        Insert: {
          id?: number; subsidiary_id: number; loan_type: string;
          amount_band: string; count?: number | null; amount?: number | null;
          amount_usd?: number | null; data_source_id?: number | null;
          created_at?: string;
        };
        Update: {
          id?: number; subsidiary_id?: number; loan_type?: string;
          amount_band?: string; count?: number | null; amount?: number | null;
          amount_usd?: number | null; data_source_id?: number | null;
          created_at?: string;
        };
        Relationships: [];
      };
      los_metrics: {
        Row: {
          id: number; subsidiary_id: number; metric: string;
          product: string; ftd: number | null; mtd: number | null;
          lmtd: number | null; lm_full: number | null;
          ftd_usd: number | null; mtd_usd: number | null;
          lmtd_usd: number | null; lm_full_usd: number | null;
          mom_change: number | null; target: number | null;
          target_usd: number | null; achievement: number | null;
          report_date: string; data_source_id: number | null;
          created_at: string;
        };
        Insert: {
          id?: number; subsidiary_id: number; metric: string;
          product: string; ftd?: number | null; mtd?: number | null;
          lmtd?: number | null; lm_full?: number | null;
          ftd_usd?: number | null; mtd_usd?: number | null;
          lmtd_usd?: number | null; lm_full_usd?: number | null;
          mom_change?: number | null; target?: number | null;
          target_usd?: number | null; achievement?: number | null;
          report_date?: string; data_source_id?: number | null;
          created_at?: string;
        };
        Update: {
          id?: number; subsidiary_id?: number; metric?: string;
          product?: string; ftd?: number | null; mtd?: number | null;
          lmtd?: number | null; lm_full?: number | null;
          ftd_usd?: number | null; mtd_usd?: number | null;
          lmtd_usd?: number | null; lm_full_usd?: number | null;
          mom_change?: number | null; target?: number | null;
          target_usd?: number | null; achievement?: number | null;
          report_date?: string; data_source_id?: number | null;
          created_at?: string;
        };
        Relationships: [];
      };
      los_funnel: {
        Row: {
          id: number; subsidiary_id: number; stage: string;
          product: string; ftd: number | null; mtd: number | null;
          lmtd: number | null; ftd_usd: number | null;
          mtd_usd: number | null; lmtd_usd: number | null;
          conversion_rate: number | null; report_date: string;
          data_source_id: number | null; created_at: string;
        };
        Insert: {
          id?: number; subsidiary_id: number; stage: string;
          product: string; ftd?: number | null; mtd?: number | null;
          lmtd?: number | null; ftd_usd?: number | null;
          mtd_usd?: number | null; lmtd_usd?: number | null;
          conversion_rate?: number | null; report_date?: string;
          data_source_id?: number | null; created_at?: string;
        };
        Update: {
          id?: number; subsidiary_id?: number; stage?: string;
          product?: string; ftd?: number | null; mtd?: number | null;
          lmtd?: number | null; ftd_usd?: number | null;
          mtd_usd?: number | null; lmtd_usd?: number | null;
          conversion_rate?: number | null; report_date?: string;
          data_source_id?: number | null; created_at?: string;
        };
        Relationships: [];
      };
      los_daily: {
        Row: {
          id: number; subsidiary_id: number; date: string;
          product: string; count: number | null; amount: number | null;
          amount_usd: number | null; avg_ticket_size: number | null;
          avg_ticket_size_usd: number | null; data_source_id: number | null;
          created_at: string;
        };
        Insert: {
          id?: number; subsidiary_id: number; date: string;
          product: string; count?: number | null; amount?: number | null;
          amount_usd?: number | null; avg_ticket_size?: number | null;
          avg_ticket_size_usd?: number | null; data_source_id?: number | null;
          created_at?: string;
        };
        Update: {
          id?: number; subsidiary_id?: number; date?: string;
          product?: string; count?: number | null; amount?: number | null;
          amount_usd?: number | null; avg_ticket_size?: number | null;
          avg_ticket_size_usd?: number | null; data_source_id?: number | null;
          created_at?: string;
        };
        Relationships: [];
      };

      // ── Trade Finance Tables ────────────────────────────────────────
      trade_facilities: {
        Row: {
          id: number; subsidiary_id: number; facility_reference: string;
          obligor_name: string; sector: string; commodity: string | null;
          product_type: string; currency: string;
          facility_limit: number; facility_limit_usd: number | null;
          outstanding: number; outstanding_usd: number | null;
          prev_month_outstanding: number | null; prev_month_outstanding_usd: number | null;
          tenor_days: number | null; start_date: string | null; maturity_date: string | null;
          internal_rating: number | null; external_rating: string | null;
          days_past_due: number; ifrs9_stage: string;
          provision_rate: number | null; provision_amount: number | null;
          provision_amount_usd: number | null;
          collateral_value: number | null; collateral_value_usd: number | null;
          collateral_coverage: number | null; risk_weight: number | null;
          counterparty_bank: string | null; watchlist_flag: boolean;
          ews_score: number | null; ews_triggers: string | null;
          report_date: string; data_source_id: number | null; created_at: string;
        };
        Insert: {
          id?: number; subsidiary_id: number; facility_reference: string;
          obligor_name: string; sector: string; commodity?: string | null;
          product_type: string; currency: string;
          facility_limit: number; facility_limit_usd?: number | null;
          outstanding?: number; outstanding_usd?: number | null;
          prev_month_outstanding?: number | null; prev_month_outstanding_usd?: number | null;
          tenor_days?: number | null; start_date?: string | null; maturity_date?: string | null;
          internal_rating?: number | null; external_rating?: string | null;
          days_past_due?: number; ifrs9_stage?: string;
          provision_rate?: number | null; provision_amount?: number | null;
          provision_amount_usd?: number | null;
          collateral_value?: number | null; collateral_value_usd?: number | null;
          collateral_coverage?: number | null; risk_weight?: number | null;
          counterparty_bank?: string | null; watchlist_flag?: boolean;
          ews_score?: number | null; ews_triggers?: string | null;
          report_date?: string; data_source_id?: number | null; created_at?: string;
        };
        Update: {
          id?: number; subsidiary_id?: number; facility_reference?: string;
          obligor_name?: string; sector?: string; commodity?: string | null;
          product_type?: string; currency?: string;
          facility_limit?: number; facility_limit_usd?: number | null;
          outstanding?: number; outstanding_usd?: number | null;
          prev_month_outstanding?: number | null; prev_month_outstanding_usd?: number | null;
          tenor_days?: number | null; start_date?: string | null; maturity_date?: string | null;
          internal_rating?: number | null; external_rating?: string | null;
          days_past_due?: number; ifrs9_stage?: string;
          provision_rate?: number | null; provision_amount?: number | null;
          provision_amount_usd?: number | null;
          collateral_value?: number | null; collateral_value_usd?: number | null;
          collateral_coverage?: number | null; risk_weight?: number | null;
          counterparty_bank?: string | null; watchlist_flag?: boolean;
          ews_score?: number | null; ews_triggers?: string | null;
          report_date?: string; data_source_id?: number | null; created_at?: string;
        };
        Relationships: [];
      };
      trade_entity_performance: {
        Row: {
          id: number; subsidiary_id: number;
          approved_limit: number; approved_limit_usd: number | null;
          outstanding: number; outstanding_usd: number | null;
          headroom: number | null; utilization: number | null;
          stage1_balance: number | null; stage1_balance_usd: number | null;
          stage2_balance: number | null; stage2_balance_usd: number | null;
          stage3_balance: number | null; stage3_balance_usd: number | null;
          provisions: number | null; provisions_usd: number | null;
          provision_coverage: number | null; rag_status: string | null;
          report_date: string; data_source_id: number | null; created_at: string;
        };
        Insert: {
          id?: number; subsidiary_id: number;
          approved_limit: number; approved_limit_usd?: number | null;
          outstanding?: number; outstanding_usd?: number | null;
          headroom?: number | null; utilization?: number | null;
          stage1_balance?: number | null; stage1_balance_usd?: number | null;
          stage2_balance?: number | null; stage2_balance_usd?: number | null;
          stage3_balance?: number | null; stage3_balance_usd?: number | null;
          provisions?: number | null; provisions_usd?: number | null;
          provision_coverage?: number | null; rag_status?: string | null;
          report_date?: string; data_source_id?: number | null; created_at?: string;
        };
        Update: {
          id?: number; subsidiary_id?: number;
          approved_limit?: number; approved_limit_usd?: number | null;
          outstanding?: number; outstanding_usd?: number | null;
          headroom?: number | null; utilization?: number | null;
          stage1_balance?: number | null; stage1_balance_usd?: number | null;
          stage2_balance?: number | null; stage2_balance_usd?: number | null;
          stage3_balance?: number | null; stage3_balance_usd?: number | null;
          provisions?: number | null; provisions_usd?: number | null;
          provision_coverage?: number | null; rag_status?: string | null;
          report_date?: string; data_source_id?: number | null; created_at?: string;
        };
        Relationships: [];
      };
      trade_product_mix: {
        Row: {
          id: number; subsidiary_id: number; product_type: string;
          facilities: number; facility_limit: number | null;
          facility_limit_usd: number | null; outstanding: number | null;
          outstanding_usd: number | null; portfolio_share: number | null;
          avg_tenor: number | null; utilization: number | null;
          stage2_plus3_pct: number | null; avg_rating: number | null;
          watchlist_count: number | null; report_date: string;
          data_source_id: number | null; created_at: string;
        };
        Insert: {
          id?: number; subsidiary_id: number; product_type: string;
          facilities?: number; facility_limit?: number | null;
          facility_limit_usd?: number | null; outstanding?: number | null;
          outstanding_usd?: number | null; portfolio_share?: number | null;
          avg_tenor?: number | null; utilization?: number | null;
          stage2_plus3_pct?: number | null; avg_rating?: number | null;
          watchlist_count?: number | null; report_date?: string;
          data_source_id?: number | null; created_at?: string;
        };
        Update: {
          id?: number; subsidiary_id?: number; product_type?: string;
          facilities?: number; facility_limit?: number | null;
          facility_limit_usd?: number | null; outstanding?: number | null;
          outstanding_usd?: number | null; portfolio_share?: number | null;
          avg_tenor?: number | null; utilization?: number | null;
          stage2_plus3_pct?: number | null; avg_rating?: number | null;
          watchlist_count?: number | null; report_date?: string;
          data_source_id?: number | null; created_at?: string;
        };
        Relationships: [];
      };
      trade_asset_quality: {
        Row: {
          id: number; subsidiary_id: number;
          stage1_count: number | null; stage1_balance: number | null;
          stage1_balance_usd: number | null;
          stage2_count: number | null; stage2_balance: number | null;
          stage2_balance_usd: number | null;
          stage3_count: number | null; stage3_balance: number | null;
          stage3_balance_usd: number | null;
          stage2_plus3_pct: number | null; provision_coverage: number | null;
          rag_status: string | null; report_date: string;
          data_source_id: number | null; created_at: string;
        };
        Insert: {
          id?: number; subsidiary_id: number;
          stage1_count?: number | null; stage1_balance?: number | null;
          stage1_balance_usd?: number | null;
          stage2_count?: number | null; stage2_balance?: number | null;
          stage2_balance_usd?: number | null;
          stage3_count?: number | null; stage3_balance?: number | null;
          stage3_balance_usd?: number | null;
          stage2_plus3_pct?: number | null; provision_coverage?: number | null;
          rag_status?: string | null; report_date?: string;
          data_source_id?: number | null; created_at?: string;
        };
        Update: {
          id?: number; subsidiary_id?: number;
          stage1_count?: number | null; stage1_balance?: number | null;
          stage1_balance_usd?: number | null;
          stage2_count?: number | null; stage2_balance?: number | null;
          stage2_balance_usd?: number | null;
          stage3_count?: number | null; stage3_balance?: number | null;
          stage3_balance_usd?: number | null;
          stage2_plus3_pct?: number | null; provision_coverage?: number | null;
          rag_status?: string | null; report_date?: string;
          data_source_id?: number | null; created_at?: string;
        };
        Relationships: [];
      };
      trade_rating_distribution: {
        Row: {
          id: number; subsidiary_id: number; rating_band: string;
          count: number; balance: number | null; balance_usd: number | null;
          portfolio_share: number | null; avg_provision: number | null;
          report_date: string; data_source_id: number | null; created_at: string;
        };
        Insert: {
          id?: number; subsidiary_id: number; rating_band: string;
          count?: number; balance?: number | null; balance_usd?: number | null;
          portfolio_share?: number | null; avg_provision?: number | null;
          report_date?: string; data_source_id?: number | null; created_at?: string;
        };
        Update: {
          id?: number; subsidiary_id?: number; rating_band?: string;
          count?: number; balance?: number | null; balance_usd?: number | null;
          portfolio_share?: number | null; avg_provision?: number | null;
          report_date?: string; data_source_id?: number | null; created_at?: string;
        };
        Relationships: [];
      };
      trade_concentrations: {
        Row: {
          id: number; subsidiary_id: number; name: string;
          category: string; value: number | null; value_usd: number | null;
          portfolio_share: number | null; facilities: number | null;
          rating: string | null; report_date: string;
          data_source_id: number | null; created_at: string;
        };
        Insert: {
          id?: number; subsidiary_id: number; name: string;
          category: string; value?: number | null; value_usd?: number | null;
          portfolio_share?: number | null; facilities?: number | null;
          rating?: string | null; report_date?: string;
          data_source_id?: number | null; created_at?: string;
        };
        Update: {
          id?: number; subsidiary_id?: number; name?: string;
          category?: string; value?: number | null; value_usd?: number | null;
          portfolio_share?: number | null; facilities?: number | null;
          rating?: string | null; report_date?: string;
          data_source_id?: number | null; created_at?: string;
        };
        Relationships: [];
      };
      trade_collection_efficiency: {
        Row: {
          id: number; subsidiary_id: number;
          collection_efficiency_ratio: number | null; overdue_ratio: number | null;
          avg_dpd: number | null; recovery_rate: number | null;
          rollover_rate: number | null; provision_outstanding: number | null;
          provision_outstanding_usd: number | null;
          rag_status: string | null; report_date: string;
          data_source_id: number | null; created_at: string;
        };
        Insert: {
          id?: number; subsidiary_id: number;
          collection_efficiency_ratio?: number | null; overdue_ratio?: number | null;
          avg_dpd?: number | null; recovery_rate?: number | null;
          rollover_rate?: number | null; provision_outstanding?: number | null;
          provision_outstanding_usd?: number | null;
          rag_status?: string | null; report_date?: string;
          data_source_id?: number | null; created_at?: string;
        };
        Update: {
          id?: number; subsidiary_id?: number;
          collection_efficiency_ratio?: number | null; overdue_ratio?: number | null;
          avg_dpd?: number | null; recovery_rate?: number | null;
          rollover_rate?: number | null; provision_outstanding?: number | null;
          provision_outstanding_usd?: number | null;
          rag_status?: string | null; report_date?: string;
          data_source_id?: number | null; created_at?: string;
        };
        Relationships: [];
      };
      trade_watchlist: {
        Row: {
          id: number; subsidiary_id: number; facility_ref: string;
          obligor_name: string; product_type: string | null;
          outstanding: number | null; outstanding_usd: number | null;
          dpd: number | null; ifrs_stage: string | null;
          rating: number | null; ews_score: number | null;
          triggers: string | null; action: string | null;
          report_date: string; data_source_id: number | null; created_at: string;
        };
        Insert: {
          id?: number; subsidiary_id: number; facility_ref: string;
          obligor_name: string; product_type?: string | null;
          outstanding?: number | null; outstanding_usd?: number | null;
          dpd?: number | null; ifrs_stage?: string | null;
          rating?: number | null; ews_score?: number | null;
          triggers?: string | null; action?: string | null;
          report_date?: string; data_source_id?: number | null; created_at?: string;
        };
        Update: {
          id?: number; subsidiary_id?: number; facility_ref?: string;
          obligor_name?: string; product_type?: string | null;
          outstanding?: number | null; outstanding_usd?: number | null;
          dpd?: number | null; ifrs_stage?: string | null;
          rating?: number | null; ews_score?: number | null;
          triggers?: string | null; action?: string | null;
          report_date?: string; data_source_id?: number | null; created_at?: string;
        };
        Relationships: [];
      };

      // ── EWS Tables ──────────────────────────────────────────────────
      ews_entity_summary: {
        Row: {
          id: number; subsidiary_id: number;
          score0: number | null; score1: number | null;
          score2: number | null; score3: number | null;
          score4_plus: number | null; total_facilities: number | null;
          avg_ews_score: number | null; flagged_exposure: number | null;
          flagged_exposure_usd: number | null; rag_status: string | null;
          report_date: string; data_source_id: number | null; created_at: string;
        };
        Insert: {
          id?: number; subsidiary_id: number;
          score0?: number | null; score1?: number | null;
          score2?: number | null; score3?: number | null;
          score4_plus?: number | null; total_facilities?: number | null;
          avg_ews_score?: number | null; flagged_exposure?: number | null;
          flagged_exposure_usd?: number | null; rag_status?: string | null;
          report_date?: string; data_source_id?: number | null; created_at?: string;
        };
        Update: {
          id?: number; subsidiary_id?: number;
          score0?: number | null; score1?: number | null;
          score2?: number | null; score3?: number | null;
          score4_plus?: number | null; total_facilities?: number | null;
          avg_ews_score?: number | null; flagged_exposure?: number | null;
          flagged_exposure_usd?: number | null; rag_status?: string | null;
          report_date?: string; data_source_id?: number | null; created_at?: string;
        };
        Relationships: [];
      };
      ews_facility_alerts: {
        Row: {
          id: number; subsidiary_id: number; facility_ref: string;
          obligor: string; ews_score: number;
          outstanding: number | null; outstanding_usd: number | null;
          triggers: string | null; ifrs_stage: string | null;
          action: string | null; report_date: string;
          data_source_id: number | null; created_at: string;
        };
        Insert: {
          id?: number; subsidiary_id: number; facility_ref: string;
          obligor: string; ews_score?: number;
          outstanding?: number | null; outstanding_usd?: number | null;
          triggers?: string | null; ifrs_stage?: string | null;
          action?: string | null; report_date?: string;
          data_source_id?: number | null; created_at?: string;
        };
        Update: {
          id?: number; subsidiary_id?: number; facility_ref?: string;
          obligor?: string; ews_score?: number;
          outstanding?: number | null; outstanding_usd?: number | null;
          triggers?: string | null; ifrs_stage?: string | null;
          action?: string | null; report_date?: string;
          data_source_id?: number | null; created_at?: string;
        };
        Relationships: [];
      };

      // ── Risk Tables ─────────────────────────────────────────────────
      fx_risk: {
        Row: {
          id: number; subsidiary_id: number; primary_currency: string;
          fx_rate: number; volatility_30d: number | null;
          volatility_90d: number | null; ytd_depreciation: number | null;
          portfolio_exposure: number | null; portfolio_exposure_usd: number | null;
          fx_impact: number | null; fx_impact_usd: number | null;
          capital_controls: boolean; transfer_risk: string | null;
          rag_status: string | null; report_date: string;
          data_source_id: number | null; created_at: string;
        };
        Insert: {
          id?: number; subsidiary_id: number; primary_currency: string;
          fx_rate: number; volatility_30d?: number | null;
          volatility_90d?: number | null; ytd_depreciation?: number | null;
          portfolio_exposure?: number | null; portfolio_exposure_usd?: number | null;
          fx_impact?: number | null; fx_impact_usd?: number | null;
          capital_controls?: boolean; transfer_risk?: string | null;
          rag_status?: string | null; report_date?: string;
          data_source_id?: number | null; created_at?: string;
        };
        Update: {
          id?: number; subsidiary_id?: number; primary_currency?: string;
          fx_rate?: number; volatility_30d?: number | null;
          volatility_90d?: number | null; ytd_depreciation?: number | null;
          portfolio_exposure?: number | null; portfolio_exposure_usd?: number | null;
          fx_impact?: number | null; fx_impact_usd?: number | null;
          capital_controls?: boolean; transfer_risk?: string | null;
          rag_status?: string | null; report_date?: string;
          data_source_id?: number | null; created_at?: string;
        };
        Relationships: [];
      };
      country_risk: {
        Row: {
          id: number; subsidiary_id: number;
          sovereign_rating: number | null; country_risk_score: number | null;
          regulatory_score: number | null; political_stability_score: number | null;
          composite_score: number | null; exposure: number | null;
          exposure_usd: number | null; rwa_share: number | null;
          capital_impact: number | null; capital_impact_usd: number | null;
          recommendation: string | null; rag_status: string | null;
          report_date: string; data_source_id: number | null; created_at: string;
        };
        Insert: {
          id?: number; subsidiary_id: number;
          sovereign_rating?: number | null; country_risk_score?: number | null;
          regulatory_score?: number | null; political_stability_score?: number | null;
          composite_score?: number | null; exposure?: number | null;
          exposure_usd?: number | null; rwa_share?: number | null;
          capital_impact?: number | null; capital_impact_usd?: number | null;
          recommendation?: string | null; rag_status?: string | null;
          report_date?: string; data_source_id?: number | null; created_at?: string;
        };
        Update: {
          id?: number; subsidiary_id?: number;
          sovereign_rating?: number | null; country_risk_score?: number | null;
          regulatory_score?: number | null; political_stability_score?: number | null;
          composite_score?: number | null; exposure?: number | null;
          exposure_usd?: number | null; rwa_share?: number | null;
          capital_impact?: number | null; capital_impact_usd?: number | null;
          recommendation?: string | null; rag_status?: string | null;
          report_date?: string; data_source_id?: number | null; created_at?: string;
        };
        Relationships: [];
      };

      // ── Corporate Finance Tables ────────────────────────────────────
      corporate_watchlist: {
        Row: {
          id: number; subsidiary_id: number; borrower: string;
          sector: string; exposure: number | null; exposure_usd: number | null;
          ews_trigger_type: string | null; internal_rating: string | null;
          status: string | null; remedial_action: string | null;
          report_date: string; data_source_id: number | null; created_at: string;
        };
        Insert: {
          id?: number; subsidiary_id: number; borrower: string;
          sector: string; exposure?: number | null; exposure_usd?: number | null;
          ews_trigger_type?: string | null; internal_rating?: string | null;
          status?: string | null; remedial_action?: string | null;
          report_date?: string; data_source_id?: number | null; created_at?: string;
        };
        Update: {
          id?: number; subsidiary_id?: number; borrower?: string;
          sector?: string; exposure?: number | null; exposure_usd?: number | null;
          ews_trigger_type?: string | null; internal_rating?: string | null;
          status?: string | null; remedial_action?: string | null;
          report_date?: string; data_source_id?: number | null; created_at?: string;
        };
        Relationships: [];
      };
      corporate_covenants: {
        Row: {
          id: number; subsidiary_id: number; group_id: string;
          cust_id: string; customer_name: string;
          date_of_disbursal: string | null;
          sanctioned_limit: number | null; sanctioned_limit_usd: number | null;
          disbursed_amount: number | null; disbursed_amount_usd: number | null;
          current_pos: number | null; current_pos_usd: number | null;
          facility_type: string | null; security_type: string | null;
          security_cover: number | null; risk_rating: string | null;
          covenant_category: string | null; covenant_type: string | null;
          covenant_description: string | null; covenant_frequency: string | null;
          submission_date: string | null; approval_for_extension: string | null;
          npa_flag: boolean; restructured_flag: boolean;
          watchlist_flag: boolean; writeoff_flag: boolean;
          report_date: string; data_source_id: number | null; created_at: string;
        };
        Insert: {
          id?: number; subsidiary_id: number; group_id: string;
          cust_id: string; customer_name: string;
          date_of_disbursal?: string | null;
          sanctioned_limit?: number | null; sanctioned_limit_usd?: number | null;
          disbursed_amount?: number | null; disbursed_amount_usd?: number | null;
          current_pos?: number | null; current_pos_usd?: number | null;
          facility_type?: string | null; security_type?: string | null;
          security_cover?: number | null; risk_rating?: string | null;
          covenant_category?: string | null; covenant_type?: string | null;
          covenant_description?: string | null; covenant_frequency?: string | null;
          submission_date?: string | null; approval_for_extension?: string | null;
          npa_flag?: boolean; restructured_flag?: boolean;
          watchlist_flag?: boolean; writeoff_flag?: boolean;
          report_date?: string; data_source_id?: number | null; created_at?: string;
        };
        Update: {
          id?: number; subsidiary_id?: number; group_id?: string;
          cust_id?: string; customer_name?: string;
          date_of_disbursal?: string | null;
          sanctioned_limit?: number | null; sanctioned_limit_usd?: number | null;
          disbursed_amount?: number | null; disbursed_amount_usd?: number | null;
          current_pos?: number | null; current_pos_usd?: number | null;
          facility_type?: string | null; security_type?: string | null;
          security_cover?: number | null; risk_rating?: string | null;
          covenant_category?: string | null; covenant_type?: string | null;
          covenant_description?: string | null; covenant_frequency?: string | null;
          submission_date?: string | null; approval_for_extension?: string | null;
          npa_flag?: boolean; restructured_flag?: boolean;
          watchlist_flag?: boolean; writeoff_flag?: boolean;
          report_date?: string; data_source_id?: number | null; created_at?: string;
        };
        Relationships: [];
      };
      corporate_delinquency: {
        Row: {
          id: number; subsidiary_id: number; group_id: string;
          cust_id: string; customer_name: string;
          sector: string | null; industry: string | null;
          sanctioned_limit: number | null; sanctioned_limit_usd: number | null;
          disbursed_amount: number | null; disbursed_amount_usd: number | null;
          current_pos: number | null; current_pos_usd: number | null;
          facility_type: string | null; security_type: string | null;
          security_cover: number | null;
          rating_at_disbursement: string | null; current_rating: string | null;
          renewal_done: boolean;
          dpd_at_month_end: number | null; current_dpd: number | null;
          reason_for_delinquency: string | null;
          last_remedial_action: string | null; update_on_remedial: string | null;
          current_status: string | null; next_step: string | null;
          report_date: string; data_source_id: number | null; created_at: string;
        };
        Insert: {
          id?: number; subsidiary_id: number; group_id: string;
          cust_id: string; customer_name: string;
          sector?: string | null; industry?: string | null;
          sanctioned_limit?: number | null; sanctioned_limit_usd?: number | null;
          disbursed_amount?: number | null; disbursed_amount_usd?: number | null;
          current_pos?: number | null; current_pos_usd?: number | null;
          facility_type?: string | null; security_type?: string | null;
          security_cover?: number | null;
          rating_at_disbursement?: string | null; current_rating?: string | null;
          renewal_done?: boolean;
          dpd_at_month_end?: number | null; current_dpd?: number | null;
          reason_for_delinquency?: string | null;
          last_remedial_action?: string | null; update_on_remedial?: string | null;
          current_status?: string | null; next_step?: string | null;
          report_date?: string; data_source_id?: number | null; created_at?: string;
        };
        Update: {
          id?: number; subsidiary_id?: number; group_id?: string;
          cust_id?: string; customer_name?: string;
          sector?: string | null; industry?: string | null;
          sanctioned_limit?: number | null; sanctioned_limit_usd?: number | null;
          disbursed_amount?: number | null; disbursed_amount_usd?: number | null;
          current_pos?: number | null; current_pos_usd?: number | null;
          facility_type?: string | null; security_type?: string | null;
          security_cover?: number | null;
          rating_at_disbursement?: string | null; current_rating?: string | null;
          renewal_done?: boolean;
          dpd_at_month_end?: number | null; current_dpd?: number | null;
          reason_for_delinquency?: string | null;
          last_remedial_action?: string | null; update_on_remedial?: string | null;
          current_status?: string | null; next_step?: string | null;
          report_date?: string; data_source_id?: number | null; created_at?: string;
        };
        Relationships: [];
      };
      corporate_portfolio_metrics: {
        Row: {
          id: number; subsidiary_id: number; particular: string;
          period: string; total: number | null; total_usd: number | null;
          fund_based: number | null; fund_based_usd: number | null;
          non_fund_based: number | null; non_fund_based_usd: number | null;
          report_date: string; data_source_id: number | null; created_at: string;
        };
        Insert: {
          id?: number; subsidiary_id: number; particular: string;
          period: string; total?: number | null; total_usd?: number | null;
          fund_based?: number | null; fund_based_usd?: number | null;
          non_fund_based?: number | null; non_fund_based_usd?: number | null;
          report_date?: string; data_source_id?: number | null; created_at?: string;
        };
        Update: {
          id?: number; subsidiary_id?: number; particular?: string;
          period?: string; total?: number | null; total_usd?: number | null;
          fund_based?: number | null; fund_based_usd?: number | null;
          non_fund_based?: number | null; non_fund_based_usd?: number | null;
          report_date?: string; data_source_id?: number | null; created_at?: string;
        };
        Relationships: [];
      };
    };
    Views: {
      v_group_aum_summary: {
        Row: {
          subsidiary: string; region: string; currency_code: string;
          period: string; metric: string; metric_type: string;
          value_local: number | null; value_usd: number | null;
        };
      };
      v_subsidiary_scorecard: {
        Row: {
          subsidiary_id: number; subsidiary: string; short_code: string;
          country: string; currency_code: string; region: string;
          institution_type: string; aum_local: number | null;
          aum_usd: number | null; latest_period: string | null;
          delinquency_30plus: number | null; delinquency_90plus: number | null;
          net_credit_loss: number | null; fpd_pct: number | null;
        };
      };
      v_region_summary: {
        Row: {
          region_id: number; region: string; subsidiary_count: number;
          total_aum_usd: number | null; latest_period: string | null;
        };
      };
      v_fx_latest: {
        Row: {
          from_currency: string; to_currency: string;
          rate: number; effective_date: string;
        };
      };
      v_group_trade_overview: {
        Row: {
          subsidiary_id: number; subsidiary: string; short_code: string;
          region: string; outstanding_usd: number | null;
          approved_limit_usd: number | null; utilization: number | null;
          provisions_usd: number | null; provision_coverage: number | null;
          npl_ratio: number | null; stage1_balance_usd: number | null;
          stage2_balance_usd: number | null; stage3_balance_usd: number | null;
          rag_status: string | null; report_date: string | null;
        };
      };
      v_group_corporate_overview: {
        Row: {
          subsidiary_id: number; subsidiary: string; short_code: string;
          region: string; watchlist_count: number;
          watchlist_exposure_usd: number | null;
          delinquent_count: number; delinquent_exposure_usd: number | null;
        };
      };
      v_group_ews_summary: {
        Row: {
          subsidiary_id: number; subsidiary: string; short_code: string;
          region: string; score0: number | null; score1: number | null;
          score2: number | null; score3: number | null;
          score4_plus: number | null; total_facilities: number | null;
          avg_ews_score: number | null; flagged_exposure_usd: number | null;
          rag_status: string | null; report_date: string | null;
        };
      };
      v_group_consolidated_scorecard: {
        Row: {
          subsidiary_id: number; subsidiary: string; short_code: string;
          country: string; currency_code: string; region: string;
          institution_type: string;
          consumer_aum_usd: number | null; consumer_latest_period: string | null;
          consumer_delinquency_30plus: number | null;
          consumer_delinquency_90plus: number | null;
          trade_outstanding_usd: number | null; trade_utilization: number | null;
          trade_npl_ratio: number | null;
          corporate_watchlist_count: number;
          corporate_watchlist_exposure_usd: number | null;
          avg_ews_score: number | null;
          ews_flagged_exposure_usd: number | null;
          ews_rag_status: string | null;
          fx_ytd_depreciation: number | null;
          fx_rag_status: string | null;
          country_risk_score: number | null;
          country_risk_rag_status: string | null;
        };
      };
    };
    Functions: Record<string, never>;
    Enums: Record<string, never>;
  };
}
