export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      audit_logs: {
        Row: {
          action: string
          actor_id: string | null
          created_at: string
          details: Json | null
          entity: string
          entity_id: string | null
          id: string
          owner_id: string
        }
        Insert: {
          action: string
          actor_id?: string | null
          created_at?: string
          details?: Json | null
          entity: string
          entity_id?: string | null
          id?: string
          owner_id: string
        }
        Update: {
          action?: string
          actor_id?: string | null
          created_at?: string
          details?: Json | null
          entity?: string
          entity_id?: string | null
          id?: string
          owner_id?: string
        }
        Relationships: []
      }
      brands: {
        Row: {
          created_at: string
          description: string | null
          id: string
          name: string
          owner_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          name: string
          owner_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          name?: string
          owner_id?: string
          updated_at?: string
        }
        Relationships: []
      }
      business_settings: {
        Row: {
          address: string | null
          created_at: string
          currency_code: string
          currency_symbol: string
          default_low_stock_threshold: number
          default_tax_rate: number
          email: string | null
          id: string
          kra_pin: string | null
          logo_url: string | null
          loyalty_rate: number
          owner_id: string
          phone: string | null
          receipt_footer: string
          receipt_header: string | null
          shop_name: string
          tax_inclusive: boolean
          updated_at: string
        }
        Insert: {
          address?: string | null
          created_at?: string
          currency_code?: string
          currency_symbol?: string
          default_low_stock_threshold?: number
          default_tax_rate?: number
          email?: string | null
          id?: string
          kra_pin?: string | null
          logo_url?: string | null
          loyalty_rate?: number
          owner_id: string
          phone?: string | null
          receipt_footer?: string
          receipt_header?: string | null
          shop_name?: string
          tax_inclusive?: boolean
          updated_at?: string
        }
        Update: {
          address?: string | null
          created_at?: string
          currency_code?: string
          currency_symbol?: string
          default_low_stock_threshold?: number
          default_tax_rate?: number
          email?: string | null
          id?: string
          kra_pin?: string | null
          logo_url?: string | null
          loyalty_rate?: number
          owner_id?: string
          phone?: string | null
          receipt_footer?: string
          receipt_header?: string | null
          shop_name?: string
          tax_inclusive?: boolean
          updated_at?: string
        }
        Relationships: []
      }
      cash_registers: {
        Row: {
          closed_at: string | null
          closing_cash: number | null
          closing_note: string | null
          id: string
          opened_at: string
          opening_cash: number
          owner_id: string
          status: string
        }
        Insert: {
          closed_at?: string | null
          closing_cash?: number | null
          closing_note?: string | null
          id?: string
          opened_at?: string
          opening_cash?: number
          owner_id: string
          status?: string
        }
        Update: {
          closed_at?: string | null
          closing_cash?: number | null
          closing_note?: string | null
          id?: string
          opened_at?: string
          opening_cash?: number
          owner_id?: string
          status?: string
        }
        Relationships: []
      }
      categories: {
        Row: {
          created_at: string
          description: string | null
          id: string
          name: string
          owner_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          name: string
          owner_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          name?: string
          owner_id?: string
          updated_at?: string
        }
        Relationships: []
      }
      customers: {
        Row: {
          address: string | null
          created_at: string
          email: string | null
          id: string
          loyalty_points: number
          name: string
          notes: string | null
          opening_balance: number
          owner_id: string
          phone: string | null
          updated_at: string
        }
        Insert: {
          address?: string | null
          created_at?: string
          email?: string | null
          id?: string
          loyalty_points?: number
          name: string
          notes?: string | null
          opening_balance?: number
          owner_id: string
          phone?: string | null
          updated_at?: string
        }
        Update: {
          address?: string | null
          created_at?: string
          email?: string | null
          id?: string
          loyalty_points?: number
          name?: string
          notes?: string | null
          opening_balance?: number
          owner_id?: string
          phone?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      discounts: {
        Row: {
          brand_id: string | null
          category_id: string | null
          created_at: string
          discount_amount: number
          discount_type: string
          ends_at: string | null
          id: string
          is_active: boolean
          name: string
          owner_id: string
          priority: number
          starts_at: string | null
          updated_at: string
        }
        Insert: {
          brand_id?: string | null
          category_id?: string | null
          created_at?: string
          discount_amount?: number
          discount_type?: string
          ends_at?: string | null
          id?: string
          is_active?: boolean
          name: string
          owner_id: string
          priority?: number
          starts_at?: string | null
          updated_at?: string
        }
        Update: {
          brand_id?: string | null
          category_id?: string | null
          created_at?: string
          discount_amount?: number
          discount_type?: string
          ends_at?: string | null
          id?: string
          is_active?: boolean
          name?: string
          owner_id?: string
          priority?: number
          starts_at?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "discounts_brand_id_fkey"
            columns: ["brand_id"]
            isOneToOne: false
            referencedRelation: "brands"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "discounts_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
        ]
      }
      draft_items: {
        Row: {
          created_at: string
          discount: number
          draft_id: string
          id: string
          line_total: number
          owner_id: string
          product_id: string | null
          product_name: string
          quantity: number
          unit_price: number
        }
        Insert: {
          created_at?: string
          discount?: number
          draft_id: string
          id?: string
          line_total: number
          owner_id: string
          product_id?: string | null
          product_name: string
          quantity: number
          unit_price: number
        }
        Update: {
          created_at?: string
          discount?: number
          draft_id?: string
          id?: string
          line_total?: number
          owner_id?: string
          product_id?: string | null
          product_name?: string
          quantity?: number
          unit_price?: number
        }
        Relationships: [
          {
            foreignKeyName: "draft_items_draft_id_fkey"
            columns: ["draft_id"]
            isOneToOne: false
            referencedRelation: "drafts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "draft_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      drafts: {
        Row: {
          contact_number: string | null
          created_at: string
          customer_id: string | null
          customer_name: string | null
          discount: number
          draft_type: string
          id: string
          notes: string | null
          owner_id: string
          reference_no: string | null
          shipping_charges: number
          subtotal: number
          tax: number
          tax_rate: number
          total: number
          updated_at: string
        }
        Insert: {
          contact_number?: string | null
          created_at?: string
          customer_id?: string | null
          customer_name?: string | null
          discount?: number
          draft_type?: string
          id?: string
          notes?: string | null
          owner_id: string
          reference_no?: string | null
          shipping_charges?: number
          subtotal?: number
          tax?: number
          tax_rate?: number
          total?: number
          updated_at?: string
        }
        Update: {
          contact_number?: string | null
          created_at?: string
          customer_id?: string | null
          customer_name?: string | null
          discount?: number
          draft_type?: string
          id?: string
          notes?: string | null
          owner_id?: string
          reference_no?: string | null
          shipping_charges?: number
          subtotal?: number
          tax?: number
          tax_rate?: number
          total?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "drafts_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
        ]
      }
      expense_categories: {
        Row: {
          created_at: string
          id: string
          name: string
          owner_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          owner_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          owner_id?: string
          updated_at?: string
        }
        Relationships: []
      }
      expenses: {
        Row: {
          amount: number
          category_id: string | null
          category_name: string | null
          created_at: string
          expense_date: string
          id: string
          note: string | null
          owner_id: string
          payment_method: string
          reference_no: string | null
          updated_at: string
        }
        Insert: {
          amount?: number
          category_id?: string | null
          category_name?: string | null
          created_at?: string
          expense_date?: string
          id?: string
          note?: string | null
          owner_id: string
          payment_method?: string
          reference_no?: string | null
          updated_at?: string
        }
        Update: {
          amount?: number
          category_id?: string | null
          category_name?: string | null
          created_at?: string
          expense_date?: string
          id?: string
          note?: string | null
          owner_id?: string
          payment_method?: string
          reference_no?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "expenses_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "expense_categories"
            referencedColumns: ["id"]
          },
        ]
      }
      product_variants: {
        Row: {
          barcode: string | null
          cost: number
          created_at: string
          id: string
          low_stock_threshold: number
          name: string
          owner_id: string
          price: number
          product_id: string
          sku: string | null
          stock: number
          updated_at: string
        }
        Insert: {
          barcode?: string | null
          cost?: number
          created_at?: string
          id?: string
          low_stock_threshold?: number
          name: string
          owner_id: string
          price?: number
          product_id: string
          sku?: string | null
          stock?: number
          updated_at?: string
        }
        Update: {
          barcode?: string | null
          cost?: number
          created_at?: string
          id?: string
          low_stock_threshold?: number
          name?: string
          owner_id?: string
          price?: number
          product_id?: string
          sku?: string | null
          stock?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "product_variants_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      products: {
        Row: {
          barcode: string | null
          brand_id: string | null
          category: string
          category_id: string | null
          cost: number
          created_at: string
          description: string | null
          id: string
          image_url: string | null
          low_stock_threshold: number
          name: string
          owner_id: string
          price: number
          sku: string | null
          stock: number
          tax_rate: number
          unit_id: string | null
          updated_at: string
        }
        Insert: {
          barcode?: string | null
          brand_id?: string | null
          category?: string
          category_id?: string | null
          cost?: number
          created_at?: string
          description?: string | null
          id?: string
          image_url?: string | null
          low_stock_threshold?: number
          name: string
          owner_id: string
          price?: number
          sku?: string | null
          stock?: number
          tax_rate?: number
          unit_id?: string | null
          updated_at?: string
        }
        Update: {
          barcode?: string | null
          brand_id?: string | null
          category?: string
          category_id?: string | null
          cost?: number
          created_at?: string
          description?: string | null
          id?: string
          image_url?: string | null
          low_stock_threshold?: number
          name?: string
          owner_id?: string
          price?: number
          sku?: string | null
          stock?: number
          tax_rate?: number
          unit_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "products_brand_id_fkey"
            columns: ["brand_id"]
            isOneToOne: false
            referencedRelation: "brands"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "products_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "products_unit_id_fkey"
            columns: ["unit_id"]
            isOneToOne: false
            referencedRelation: "units"
            referencedColumns: ["id"]
          },
        ]
      }
      purchase_items: {
        Row: {
          created_at: string
          id: string
          line_total: number
          owner_id: string
          product_id: string | null
          product_name: string
          purchase_id: string
          quantity: number
          unit_cost: number
        }
        Insert: {
          created_at?: string
          id?: string
          line_total: number
          owner_id: string
          product_id?: string | null
          product_name: string
          purchase_id: string
          quantity: number
          unit_cost: number
        }
        Update: {
          created_at?: string
          id?: string
          line_total?: number
          owner_id?: string
          product_id?: string | null
          product_name?: string
          purchase_id?: string
          quantity?: number
          unit_cost?: number
        }
        Relationships: [
          {
            foreignKeyName: "purchase_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchase_items_purchase_id_fkey"
            columns: ["purchase_id"]
            isOneToOne: false
            referencedRelation: "purchases"
            referencedColumns: ["id"]
          },
        ]
      }
      purchase_return_items: {
        Row: {
          created_at: string
          id: string
          line_total: number
          owner_id: string
          product_id: string | null
          product_name: string
          purchase_return_id: string
          quantity: number
          unit_cost: number
        }
        Insert: {
          created_at?: string
          id?: string
          line_total: number
          owner_id: string
          product_id?: string | null
          product_name: string
          purchase_return_id: string
          quantity: number
          unit_cost: number
        }
        Update: {
          created_at?: string
          id?: string
          line_total?: number
          owner_id?: string
          product_id?: string | null
          product_name?: string
          purchase_return_id?: string
          quantity?: number
          unit_cost?: number
        }
        Relationships: [
          {
            foreignKeyName: "purchase_return_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchase_return_items_purchase_return_id_fkey"
            columns: ["purchase_return_id"]
            isOneToOne: false
            referencedRelation: "purchase_returns"
            referencedColumns: ["id"]
          },
        ]
      }
      purchase_returns: {
        Row: {
          created_at: string
          id: string
          notes: string | null
          owner_id: string
          purchase_id: string | null
          reason: string | null
          reference_no: string | null
          return_date: string
          total: number
        }
        Insert: {
          created_at?: string
          id?: string
          notes?: string | null
          owner_id: string
          purchase_id?: string | null
          reason?: string | null
          reference_no?: string | null
          return_date?: string
          total?: number
        }
        Update: {
          created_at?: string
          id?: string
          notes?: string | null
          owner_id?: string
          purchase_id?: string | null
          reason?: string | null
          reference_no?: string | null
          return_date?: string
          total?: number
        }
        Relationships: [
          {
            foreignKeyName: "purchase_returns_purchase_id_fkey"
            columns: ["purchase_id"]
            isOneToOne: false
            referencedRelation: "purchases"
            referencedColumns: ["id"]
          },
        ]
      }
      purchases: {
        Row: {
          amount_paid: number
          created_at: string
          discount: number
          id: string
          notes: string | null
          owner_id: string
          payment_method: string
          payment_status: string
          purchase_date: string
          reference_no: string | null
          shipping: number
          status: string
          subtotal: number
          supplier_id: string | null
          tax: number
          total: number
          updated_at: string
        }
        Insert: {
          amount_paid?: number
          created_at?: string
          discount?: number
          id?: string
          notes?: string | null
          owner_id: string
          payment_method?: string
          payment_status?: string
          purchase_date?: string
          reference_no?: string | null
          shipping?: number
          status?: string
          subtotal?: number
          supplier_id?: string | null
          tax?: number
          total?: number
          updated_at?: string
        }
        Update: {
          amount_paid?: number
          created_at?: string
          discount?: number
          id?: string
          notes?: string | null
          owner_id?: string
          payment_method?: string
          payment_status?: string
          purchase_date?: string
          reference_no?: string | null
          shipping?: number
          status?: string
          subtotal?: number
          supplier_id?: string | null
          tax?: number
          total?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "purchases_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
        ]
      }
      sale_items: {
        Row: {
          created_at: string
          discount: number
          id: string
          line_total: number
          owner_id: string
          product_id: string | null
          product_name: string
          quantity: number
          sale_id: string
          tax: number
          unit_price: number
        }
        Insert: {
          created_at?: string
          discount?: number
          id?: string
          line_total: number
          owner_id: string
          product_id?: string | null
          product_name: string
          quantity: number
          sale_id: string
          tax?: number
          unit_price: number
        }
        Update: {
          created_at?: string
          discount?: number
          id?: string
          line_total?: number
          owner_id?: string
          product_id?: string | null
          product_name?: string
          quantity?: number
          sale_id?: string
          tax?: number
          unit_price?: number
        }
        Relationships: [
          {
            foreignKeyName: "sale_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sale_items_sale_id_fkey"
            columns: ["sale_id"]
            isOneToOne: false
            referencedRelation: "sales"
            referencedColumns: ["id"]
          },
        ]
      }
      sale_return_items: {
        Row: {
          created_at: string
          id: string
          line_total: number
          owner_id: string
          product_id: string | null
          product_name: string
          quantity: number
          sale_return_id: string
          unit_price: number
        }
        Insert: {
          created_at?: string
          id?: string
          line_total: number
          owner_id: string
          product_id?: string | null
          product_name: string
          quantity: number
          sale_return_id: string
          unit_price: number
        }
        Update: {
          created_at?: string
          id?: string
          line_total?: number
          owner_id?: string
          product_id?: string | null
          product_name?: string
          quantity?: number
          sale_return_id?: string
          unit_price?: number
        }
        Relationships: [
          {
            foreignKeyName: "sale_return_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sale_return_items_sale_return_id_fkey"
            columns: ["sale_return_id"]
            isOneToOne: false
            referencedRelation: "sale_returns"
            referencedColumns: ["id"]
          },
        ]
      }
      sale_returns: {
        Row: {
          created_at: string
          id: string
          notes: string | null
          owner_id: string
          reason: string | null
          return_date: string
          sale_id: string | null
          total: number
        }
        Insert: {
          created_at?: string
          id?: string
          notes?: string | null
          owner_id: string
          reason?: string | null
          return_date?: string
          sale_id?: string | null
          total?: number
        }
        Update: {
          created_at?: string
          id?: string
          notes?: string | null
          owner_id?: string
          reason?: string | null
          return_date?: string
          sale_id?: string | null
          total?: number
        }
        Relationships: [
          {
            foreignKeyName: "sale_returns_sale_id_fkey"
            columns: ["sale_id"]
            isOneToOne: false
            referencedRelation: "sales"
            referencedColumns: ["id"]
          },
        ]
      }
      sales: {
        Row: {
          amount_paid: number
          contact_number: string | null
          created_at: string
          customer_id: string | null
          customer_name: string | null
          delivery_person: string | null
          discount: number
          id: string
          invoice_no: string | null
          notes: string | null
          owner_id: string
          payment_method: string
          payment_status: string
          register_id: string | null
          sale_type: string
          sell_note: string | null
          shipping_address: string | null
          shipping_charges: number
          shipping_status: string | null
          staff_note: string | null
          subtotal: number
          tax: number
          tax_rate: number
          total: number
        }
        Insert: {
          amount_paid?: number
          contact_number?: string | null
          created_at?: string
          customer_id?: string | null
          customer_name?: string | null
          delivery_person?: string | null
          discount?: number
          id?: string
          invoice_no?: string | null
          notes?: string | null
          owner_id: string
          payment_method?: string
          payment_status?: string
          register_id?: string | null
          sale_type?: string
          sell_note?: string | null
          shipping_address?: string | null
          shipping_charges?: number
          shipping_status?: string | null
          staff_note?: string | null
          subtotal?: number
          tax?: number
          tax_rate?: number
          total?: number
        }
        Update: {
          amount_paid?: number
          contact_number?: string | null
          created_at?: string
          customer_id?: string | null
          customer_name?: string | null
          delivery_person?: string | null
          discount?: number
          id?: string
          invoice_no?: string | null
          notes?: string | null
          owner_id?: string
          payment_method?: string
          payment_status?: string
          register_id?: string | null
          sale_type?: string
          sell_note?: string | null
          shipping_address?: string | null
          shipping_charges?: number
          shipping_status?: string | null
          staff_note?: string | null
          subtotal?: number
          tax?: number
          tax_rate?: number
          total?: number
        }
        Relationships: [
          {
            foreignKeyName: "sales_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sales_register_id_fkey"
            columns: ["register_id"]
            isOneToOne: false
            referencedRelation: "cash_registers"
            referencedColumns: ["id"]
          },
        ]
      }
      stock_adjustments: {
        Row: {
          adjustment_type: string
          created_at: string
          id: string
          owner_id: string
          product_id: string
          product_name: string
          quantity: number
          reason: string | null
        }
        Insert: {
          adjustment_type?: string
          created_at?: string
          id?: string
          owner_id: string
          product_id: string
          product_name: string
          quantity: number
          reason?: string | null
        }
        Update: {
          adjustment_type?: string
          created_at?: string
          id?: string
          owner_id?: string
          product_id?: string
          product_name?: string
          quantity?: number
          reason?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "stock_adjustments_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      supplier_payments: {
        Row: {
          amount: number
          created_at: string
          id: string
          notes: string | null
          owner_id: string
          paid_at: string
          payment_method: string
          purchase_id: string | null
          reference_no: string | null
          supplier_id: string | null
        }
        Insert: {
          amount?: number
          created_at?: string
          id?: string
          notes?: string | null
          owner_id: string
          paid_at?: string
          payment_method?: string
          purchase_id?: string | null
          reference_no?: string | null
          supplier_id?: string | null
        }
        Update: {
          amount?: number
          created_at?: string
          id?: string
          notes?: string | null
          owner_id?: string
          paid_at?: string
          payment_method?: string
          purchase_id?: string | null
          reference_no?: string | null
          supplier_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "supplier_payments_purchase_id_fkey"
            columns: ["purchase_id"]
            isOneToOne: false
            referencedRelation: "purchases"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "supplier_payments_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
        ]
      }
      suppliers: {
        Row: {
          address: string | null
          contact_person: string | null
          created_at: string
          email: string | null
          id: string
          name: string
          notes: string | null
          opening_balance: number
          owner_id: string
          phone: string | null
          updated_at: string
        }
        Insert: {
          address?: string | null
          contact_person?: string | null
          created_at?: string
          email?: string | null
          id?: string
          name: string
          notes?: string | null
          opening_balance?: number
          owner_id: string
          phone?: string | null
          updated_at?: string
        }
        Update: {
          address?: string | null
          contact_person?: string | null
          created_at?: string
          email?: string | null
          id?: string
          name?: string
          notes?: string | null
          opening_balance?: number
          owner_id?: string
          phone?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      units: {
        Row: {
          allow_decimal: boolean
          created_at: string
          id: string
          name: string
          owner_id: string
          short_name: string
          updated_at: string
        }
        Insert: {
          allow_decimal?: boolean
          created_at?: string
          id?: string
          name: string
          owner_id: string
          short_name: string
          updated_at?: string
        }
        Update: {
          allow_decimal?: boolean
          created_at?: string
          id?: string
          name?: string
          owner_id?: string
          short_name?: string
          updated_at?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      decrement_stock: {
        Args: { p_product_id: string; p_quantity: number }
        Returns: undefined
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      increment_stock: {
        Args: { p_product_id: string; p_quantity: number }
        Returns: undefined
      }
      list_users_with_roles: {
        Args: never
        Returns: {
          created_at: string
          email: string
          roles: Database["public"]["Enums"]["app_role"][]
          user_id: string
        }[]
      }
    }
    Enums: {
      app_role: "admin" | "manager" | "cashier"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["admin", "manager", "cashier"],
    },
  },
} as const
