export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

type Table<Row, Insert = Partial<Row>, Update = Partial<Insert>> = {
  Row: Row;
  Insert: Insert;
  Update: Update;
  Relationships: [];
};

export type Database = {
  public: {
    Tables: {
      profiles: Table<{
        user_id: string;
        email: string;
        onboarding_completed: boolean;
        created_at: string;
        updated_at: string;
      }>;
      entitlements: Table<{
        id: string;
        provider: "hotmart";
        provider_transaction_id: string;
        product_ucode: string;
        status: "active" | "revoked";
        buyer_email: string;
        user_id: string | null;
        event_created_at: string;
        created_at: string;
        updated_at: string;
      }>;
      webhook_events: Table<{
        event_id: string;
        event_type: string;
        provider_transaction_id: string;
        product_ucode: string;
        event_created_at: string;
        processed_at: string;
      }>;
      access_attempts: Table<{
        subject_hash: string;
        origin_hash: string;
        window_started_at: string;
        attempt_count: number;
        updated_at: string;
      }>;
      user_preferences: Table<{
        user_id: string;
        people: number;
        enabled_meals: Json;
        excluded_ingredient_ids: Json;
        created_at: string;
        updated_at: string;
      }>;
      weekly_plans: Table<{
        id: string;
        user_id: string;
        week_start: string;
        people: number;
        generator_version: string;
        notices: Json;
        created_at: string;
        updated_at: string;
      }>;
      weekly_plan_items: Table<{
        weekly_plan_id: string;
        item_id: string;
        position: number;
        meal_date: string;
        meal_type: "breakfast" | "lunch" | "dinner" | "snack";
        recipe_id: string;
        servings: number;
        replaced: boolean;
      }>;
      shopping_list_items: Table<{
        weekly_plan_id: string;
        item_id: string;
        position: number;
        source: "generated" | "manual";
        label: string;
        category:
          | "produce"
          | "protein"
          | "dairy"
          | "pantry"
          | "bakery"
          | "frozen"
          | "other";
        checked: boolean;
        ingredient_id: string | null;
        quantity: number | null;
        unit: string | null;
        unit_label: string | null;
      }>;
    };
    Views: Record<never, never>;
    Functions: {
      save_planner_week_snapshot: {
        Args: { p_user_id: string; p_plan: Json; p_shopping_items: Json };
        Returns: undefined;
      };
      get_planner_week_snapshot: {
        Args: { p_user_id: string; p_week_start: string };
        Returns: Json | null;
      };
      list_planner_week_snapshots: {
        Args: { p_user_id: string };
        Returns: Json[];
      };
      claim_active_entitlement: {
        Args: { p_email: string };
        Returns: boolean;
      };
      process_hotmart_event: {
        Args: {
          p_event_id: string;
          p_event_created_at: string;
          p_event_type: string;
          p_provider_transaction_id: string;
          p_product_ucode: string;
          p_buyer_email: string;
          p_status: "active" | "revoked";
        };
        Returns: boolean;
      };
      consume_access_attempt: {
        Args: {
          p_subject_hash: string;
          p_origin_hash: string;
          p_max_attempts: number;
          p_window_seconds: number;
        };
        Returns: boolean;
      };
    };
    Enums: Record<never, never>;
    CompositeTypes: Record<never, never>;
  };
};
