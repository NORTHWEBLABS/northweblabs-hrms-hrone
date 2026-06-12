## Table `announcements`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `uuid` | Primary |
| `org_id` | `uuid` |  |
| `title` | `text` |  |
| `content` | `text` |  |
| `type` | `text` |  |
| `created_by` | `uuid` |  Nullable |
| `created_at` | `timestamptz` |  Nullable |

## Table `attendance`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `uuid` | Primary |
| `org_id` | `uuid` |  |
| `employee_id` | `uuid` |  |
| `date` | `date` |  |
| `check_in` | `timestamptz` |  Nullable |
| `check_out` | `timestamptz` |  Nullable |
| `status` | `text` |  Nullable |
| `source` | `text` |  Nullable |
| `latitude` | `numeric` |  Nullable |
| `longitude` | `numeric` |  Nullable |
| `notes` | `text` |  Nullable |
| `created_at` | `timestamptz` |  Nullable |

## Table `cash_handovers`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `uuid` | Primary |
| `org_id` | `uuid` |  |
| `register_id` | `uuid` |  Nullable |
| `date` | `date` |  |
| `type` | `text` |  |
| `amount` | `numeric` |  |
| `reference_number` | `text` |  Nullable |
| `handed_to` | `text` |  Nullable |
| `notes` | `text` |  Nullable |
| `created_by` | `uuid` |  Nullable |
| `created_at` | `timestamptz` |  Nullable |

## Table `cash_register`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `uuid` | Primary |
| `org_id` | `uuid` |  |
| `date` | `date` |  |
| `opening_cash` | `numeric` |  Nullable |
| `store_walkin_cash` | `numeric` |  Nullable |
| `store_walkin_card` | `numeric` |  Nullable |
| `store_walkin_upi` | `numeric` |  Nullable |
| `online_website_pg` | `numeric` |  Nullable |
| `online_website_cod` | `numeric` |  Nullable |
| `whatsapp_cash` | `numeric` |  Nullable |
| `whatsapp_upi` | `numeric` |  Nullable |
| `whatsapp_pg` | `numeric` |  Nullable |
| `mixed_payments` | `numeric` |  Nullable |
| `other_inflow` | `numeric` |  Nullable |
| `petty_cash_spent` | `numeric` |  Nullable |
| `vendor_payments` | `numeric` |  Nullable |
| `salary_advances` | `numeric` |  Nullable |
| `refunds_given` | `numeric` |  Nullable |
| `bank_deposit` | `numeric` |  Nullable |
| `hq_handover` | `numeric` |  Nullable |
| `other_outflow` | `numeric` |  Nullable |
| `closing_cash` | `numeric` |  Nullable |
| `cash_in_hand` | `numeric` |  Nullable |
| `notes` | `text` |  Nullable |
| `closed_by` | `uuid` |  Nullable |
| `is_closed` | `bool` |  Nullable |
| `created_at` | `timestamptz` |  Nullable |
| `updated_at` | `timestamptz` |  Nullable |
| `online_amount` | `numeric` |  Nullable |
| `online_orders` | `int4` |  Nullable |
| `walkin_amount` | `numeric` |  Nullable |
| `walkin_orders` | `int4` |  Nullable |
| `whatsapp_amount` | `numeric` |  Nullable |
| `whatsapp_orders` | `int4` |  Nullable |
| `total_sales` | `numeric` |  Nullable |
| `total_orders` | `int4` |  Nullable |
| `pay_cash` | `numeric` |  Nullable |
| `pay_upi` | `numeric` |  Nullable |
| `pay_card` | `numeric` |  Nullable |
| `pay_gateway` | `numeric` |  Nullable |
| `total_expenses` | `numeric` |  Nullable |
| `other_handover` | `numeric` |  Nullable |

## Table `cashflow_budgets`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `uuid` | Primary |
| `org_id` | `uuid` |  |
| `category` | `text` |  |
| `month` | `int4` |  |
| `year` | `int4` |  |
| `budget_amount` | `numeric` |  |

## Table `cashflow_categories`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `uuid` | Primary |
| `org_id` | `uuid` |  |
| `name` | `text` |  |
| `type` | `text` |  |
| `icon` | `text` |  Nullable |
| `color` | `text` |  Nullable |

## Table `cashflow_entries`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `uuid` | Primary |
| `org_id` | `uuid` |  |
| `type` | `text` |  |
| `category` | `text` |  Nullable |
| `title` | `text` |  |
| `amount` | `numeric` |  |
| `date` | `date` |  |
| `description` | `text` |  Nullable |
| `payment_method` | `text` |  Nullable |
| `reference_number` | `text` |  Nullable |
| `party_name` | `text` |  Nullable |
| `is_recurring` | `bool` |  Nullable |
| `recurring_frequency` | `text` |  Nullable |
| `tags` | `_text` |  Nullable |
| `created_by` | `uuid` |  Nullable |
| `created_at` | `timestamptz` |  Nullable |

## Table `company_events`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `uuid` | Primary |
| `org_id` | `uuid` |  |
| `title` | `text` |  |
| `date` | `date` |  |
| `type` | `text` |  Nullable |
| `note` | `text` |  Nullable |
| `recurring` | `bool` |  Nullable |
| `created_at` | `timestamptz` |  Nullable |

## Table `compliance_items`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `uuid` | Primary |
| `org_id` | `uuid` |  |
| `title` | `text` |  |
| `description` | `text` |  Nullable |
| `due_date` | `date` |  |
| `category` | `text` |  Nullable |
| `status` | `text` |  Nullable |
| `penalty_if_missed` | `text` |  Nullable |
| `created_at` | `timestamptz` |  Nullable |

## Table `departments`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `uuid` | Primary |
| `org_id` | `uuid` |  |
| `name` | `text` |  |
| `head_employee_id` | `uuid` |  Nullable |
| `created_at` | `timestamptz` |  Nullable |

## Table `document_archive`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `uuid` | Primary |
| `org_id` | `uuid` |  |
| `entity_type` | `text` |  |
| `entity_id` | `uuid` |  Nullable |
| `entity_name` | `text` |  Nullable |
| `doc_type` | `text` |  |
| `doc_name` | `text` |  |
| `file_url` | `text` |  Nullable |
| `file_size` | `int4` |  Nullable |
| `expiry_date` | `date` |  Nullable |
| `tags` | `_text` |  Nullable |
| `notes` | `text` |  Nullable |
| `uploaded_by` | `uuid` |  Nullable |
| `created_at` | `timestamptz` |  Nullable |

## Table `documents`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `uuid` | Primary |
| `org_id` | `uuid` |  |
| `employee_id` | `uuid` |  Nullable |
| `doc_type` | `text` |  Nullable |
| `title` | `text` |  Nullable |
| `content` | `text` |  Nullable |
| `pdf_url` | `text` |  Nullable |
| `created_by` | `uuid` |  Nullable |
| `created_at` | `timestamptz` |  Nullable |

## Table `employee_addresses`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `uuid` | Primary |
| `employee_id` | `uuid` |  Nullable |
| `address_type` | `text` |  |
| `address_line1` | `text` |  Nullable |
| `address_line2` | `text` |  Nullable |
| `city` | `text` |  Nullable |
| `state` | `text` |  Nullable |
| `pincode` | `text` |  Nullable |
| `created_at` | `timestamptz` |  Nullable |

## Table `employee_documents`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `uuid` | Primary |
| `employee_id` | `uuid` |  Nullable |
| `doc_type` | `text` |  |
| `doc_subtype` | `text` |  Nullable |
| `file_url` | `text` |  |
| `file_name` | `text` |  Nullable |
| `created_at` | `timestamptz` |  Nullable |

## Table `employee_education`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `uuid` | Primary |
| `employee_id` | `uuid` |  Nullable |
| `qualification` | `text` |  |
| `institution` | `text` |  Nullable |
| `board_university` | `text` |  Nullable |
| `passing_year` | `int4` |  Nullable |
| `percentage` | `numeric` |  Nullable |
| `created_at` | `timestamptz` |  Nullable |

## Table `employee_experience`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `uuid` | Primary |
| `employee_id` | `uuid` |  Nullable |
| `company_name` | `text` |  |
| `designation` | `text` |  Nullable |
| `from_date` | `date` |  Nullable |
| `to_date` | `date` |  Nullable |
| `reason_for_leaving` | `text` |  Nullable |
| `created_at` | `timestamptz` |  Nullable |

## Table `employees`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `uuid` | Primary |
| `org_id` | `uuid` |  |
| `employee_code` | `text` |  Nullable |
| `full_name` | `text` |  |
| `phone` | `text` |  Nullable |
| `email` | `text` |  Nullable |
| `department` | `text` |  Nullable |
| `designation` | `text` |  Nullable |
| `date_of_joining` | `date` |  Nullable |
| `date_of_birth` | `date` |  Nullable |
| `gender` | `text` |  Nullable |
| `aadhaar_last4` | `text` |  Nullable |
| `pan` | `text` |  Nullable |
| `bank_account` | `text` |  Nullable |
| `bank_ifsc` | `text` |  Nullable |
| `bank_name` | `text` |  Nullable |
| `uan` | `text` |  Nullable |
| `esic_ip_number` | `text` |  Nullable |
| `salary_type` | `text` |  Nullable |
| `basic_salary` | `numeric` |  |
| `hra` | `numeric` |  Nullable |
| `special_allowance` | `numeric` |  Nullable |
| `other_allowance` | `numeric` |  Nullable |
| `pf_applicable` | `bool` |  Nullable |
| `esic_applicable` | `bool` |  Nullable |
| `pt_applicable` | `bool` |  Nullable |
| `status` | `text` |  Nullable |
| `whatsapp_registered` | `bool` |  Nullable |
| `created_at` | `timestamptz` |  Nullable |
| `invite_token` | `text` |  Nullable Unique |
| `invite_expires_at` | `timestamptz` |  Nullable |
| `onboarding_completed` | `bool` |  Nullable |
| `approval_status` | `text` |  Nullable |
| `first_name` | `text` |  Nullable |
| `middle_name` | `text` |  Nullable |
| `last_name` | `text` |  Nullable |
| `reporting_manager_id` | `uuid` |  Nullable |
| `department_id` | `uuid` |  Nullable |
| `approved_by` | `uuid` |  Nullable |
| `approved_at` | `timestamptz` |  Nullable |
| `onboarding_link` | `text` |  Nullable |
| `gross_salary` | `numeric` |  Nullable |

## Table `expense_categories`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `uuid` | Primary |
| `org_id` | `uuid` |  |
| `name` | `text` |  |
| `icon` | `text` |  Nullable |
| `color` | `text` |  Nullable |
| `budget_limit` | `numeric` |  Nullable |
| `created_at` | `timestamptz` |  Nullable |

## Table `expenses`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `uuid` | Primary |
| `org_id` | `uuid` |  |
| `employee_id` | `uuid` |  Nullable |
| `category_id` | `uuid` |  Nullable |
| `title` | `text` |  |
| `amount` | `numeric` |  |
| `date` | `date` |  |
| `description` | `text` |  Nullable |
| `receipt_url` | `text` |  Nullable |
| `status` | `text` |  Nullable |
| `approved_by` | `uuid` |  Nullable |
| `approved_at` | `timestamptz` |  Nullable |
| `payment_method` | `text` |  Nullable |
| `vendor` | `text` |  Nullable |
| `tags` | `_text` |  Nullable |
| `created_at` | `timestamptz` |  Nullable |

## Table `invoice_sequences`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `uuid` | Primary |
| `org_id` | `uuid` |  |
| `prefix` | `text` |  Nullable |
| `current_number` | `int4` |  Nullable |
| `financial_year` | `text` |  Nullable |

## Table `invoices`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `uuid` | Primary |
| `org_id` | `uuid` |  |
| `invoice_number` | `text` |  |
| `type` | `text` |  Nullable |
| `status` | `text` |  Nullable |
| `customer_name` | `text` |  |
| `customer_email` | `text` |  Nullable |
| `customer_phone` | `text` |  Nullable |
| `customer_gstin` | `text` |  Nullable |
| `customer_address` | `text` |  Nullable |
| `items` | `jsonb` |  |
| `subtotal` | `numeric` |  Nullable |
| `discount_amount` | `numeric` |  Nullable |
| `taxable_amount` | `numeric` |  Nullable |
| `cgst_amount` | `numeric` |  Nullable |
| `sgst_amount` | `numeric` |  Nullable |
| `igst_amount` | `numeric` |  Nullable |
| `total_tax` | `numeric` |  Nullable |
| `total_amount` | `numeric` |  Nullable |
| `amount_paid` | `numeric` |  Nullable |
| `balance_due` | `numeric` |  Nullable |
| `invoice_date` | `date` |  Nullable |
| `due_date` | `date` |  Nullable |
| `paid_date` | `date` |  Nullable |
| `place_of_supply` | `text` |  Nullable |
| `is_igst` | `bool` |  Nullable |
| `is_recurring` | `bool` |  Nullable |
| `recurring_frequency` | `text` |  Nullable |
| `next_invoice_date` | `date` |  Nullable |
| `notes` | `text` |  Nullable |
| `terms` | `text` |  Nullable |
| `pdf_url` | `text` |  Nullable |
| `created_at` | `timestamptz` |  Nullable |

## Table `leave_balances`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `uuid` | Primary |
| `employee_id` | `uuid` |  |
| `leave_type` | `text` |  |
| `total` | `int4` |  |
| `used` | `int4` |  |
| `remaining` | `int4` |  Nullable |
| `year` | `int4` |  |

## Table `leave_requests`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `uuid` | Primary |
| `employee_id` | `uuid` |  |
| `leave_type` | `text` |  |
| `from_date` | `date` |  |
| `to_date` | `date` |  |
| `days` | `int4` |  |
| `reason` | `text` |  Nullable |
| `status` | `text` |  |
| `approved_by` | `uuid` |  Nullable |
| `remarks` | `text` |  Nullable |
| `created_at` | `timestamptz` |  Nullable |

## Table `leaves`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `uuid` | Primary |
| `org_id` | `uuid` |  |
| `employee_id` | `uuid` |  |
| `leave_type` | `text` |  |
| `from_date` | `date` |  |
| `to_date` | `date` |  |
| `days` | `numeric` |  |
| `reason` | `text` |  Nullable |
| `status` | `text` |  Nullable |
| `approved_by` | `uuid` |  Nullable |
| `approved_at` | `timestamptz` |  Nullable |
| `created_at` | `timestamptz` |  Nullable |

## Table `mood_checkins`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `uuid` | Primary |
| `employee_id` | `uuid` |  |
| `date` | `date` |  |
| `mood` | `int4` |  |
| `created_at` | `timestamptz` |  Nullable |

## Table `notifications`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `uuid` | Primary |
| `org_id` | `uuid` |  Nullable |
| `type` | `text` |  |
| `title` | `text` |  |
| `message` | `text` |  Nullable |
| `employee_id` | `uuid` |  Nullable |
| `read` | `bool` |  Nullable |
| `action_url` | `text` |  Nullable |
| `created_at` | `timestamptz` |  Nullable |

## Table `offboardings`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `uuid` | Primary |
| `org_id` | `uuid` |  |
| `employee_id` | `uuid` |  |
| `employee_name` | `text` |  |
| `employee_email` | `text` |  |
| `department` | `text` |  Nullable |
| `designation` | `text` |  Nullable |
| `joining_date` | `date` |  Nullable |
| `separation_type` | `text` |  |
| `reason` | `text` |  Nullable |
| `initiated_by` | `text` |  Nullable |
| `initiated_date` | `date` |  |
| `last_working_date` | `date` |  Nullable |
| `notice_period_days` | `int4` |  |
| `notice_served_days` | `int4` |  |
| `status` | `text` |  |
| `checklist` | `jsonb` |  |
| `exit_interview` | `jsonb` |  Nullable |
| `settlement` | `jsonb` |  Nullable |
| `notes` | `text` |  Nullable |
| `created_at` | `timestamptz` |  |
| `updated_at` | `timestamptz` |  |

## Table `org_invites`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `uuid` | Primary |
| `org_id` | `uuid` |  |
| `created_by` | `uuid` |  |
| `token` | `text` |  Unique |
| `role` | `text` |  Nullable |
| `used` | `bool` |  Nullable |
| `used_by` | `uuid` |  Nullable |
| `expires_at` | `timestamptz` |  |
| `created_at` | `timestamptz` |  Nullable |

## Table `organizations`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `uuid` | Primary |
| `name` | `text` |  |
| `gstin` | `text` |  Nullable |
| `pan` | `text` |  Nullable |
| `address` | `text` |  Nullable |
| `city` | `text` |  Nullable |
| `state` | `text` |  |
| `pincode` | `text` |  Nullable |
| `industry` | `text` |  Nullable |
| `plan` | `text` |  |
| `plan_status` | `text` |  Nullable |
| `trial_ends_at` | `timestamptz` |  Nullable |
| `razorpay_subscription_id` | `text` |  Nullable |
| `employee_count` | `int4` |  Nullable |
| `whatsapp_number` | `text` |  Nullable |
| `created_at` | `timestamptz` |  Nullable |
| `phone` | `text` |  Nullable |
| `website` | `text` |  Nullable |
| `domain` | `text` |  Nullable |
| `size` | `text` |  Nullable |
| `logo_url` | `text` |  Nullable |
| `updated_at` | `timestamptz` |  Nullable |

## Table `otp_tokens`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `uuid` | Primary |
| `email` | `text` |  |
| `otp` | `text` |  |
| `expires_at` | `timestamptz` |  |
| `used` | `bool` |  |
| `attempts` | `int4` |  |
| `created_at` | `timestamptz` |  Nullable |

## Table `otp_verifications`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `uuid` | Primary |
| `email` | `text` |  |
| `otp` | `text` |  |
| `expires_at` | `timestamptz` |  |
| `used` | `bool` |  Nullable |
| `created_at` | `timestamptz` |  Nullable |

## Table `payroll_runs`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `uuid` | Primary |
| `org_id` | `uuid` |  |
| `month` | `int4` |  |
| `year` | `int4` |  |
| `status` | `text` |  Nullable |
| `total_gross` | `numeric` |  Nullable |
| `total_deductions` | `numeric` |  Nullable |
| `total_net` | `numeric` |  Nullable |
| `total_pf_employer` | `numeric` |  Nullable |
| `total_esic_employer` | `numeric` |  Nullable |
| `processed_at` | `timestamptz` |  Nullable |
| `paid_at` | `timestamptz` |  Nullable |
| `created_by` | `uuid` |  Nullable |
| `created_at` | `timestamptz` |  Nullable |

## Table `payslips`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `uuid` | Primary |
| `org_id` | `uuid` |  |
| `payroll_run_id` | `uuid` |  |
| `employee_id` | `uuid` |  |
| `month` | `int4` |  |
| `year` | `int4` |  |
| `working_days` | `int4` |  Nullable |
| `days_present` | `numeric` |  Nullable |
| `days_absent` | `numeric` |  Nullable |
| `basic_earned` | `numeric` |  Nullable |
| `hra_earned` | `numeric` |  Nullable |
| `special_allowance_earned` | `numeric` |  Nullable |
| `other_allowance_earned` | `numeric` |  Nullable |
| `gross_earned` | `numeric` |  Nullable |
| `overtime_amount` | `numeric` |  Nullable |
| `bonus` | `numeric` |  Nullable |
| `pf_employee` | `numeric` |  Nullable |
| `esic_employee` | `numeric` |  Nullable |
| `pt_amount` | `numeric` |  Nullable |
| `tds_amount` | `numeric` |  Nullable |
| `other_deductions` | `numeric` |  Nullable |
| `total_deductions` | `numeric` |  Nullable |
| `net_payable` | `numeric` |  Nullable |
| `pf_employer` | `numeric` |  Nullable |
| `esic_employer` | `numeric` |  Nullable |
| `pdf_url` | `text` |  Nullable |
| `whatsapp_sent` | `bool` |  Nullable |
| `created_at` | `timestamptz` |  Nullable |

## Table `register_expense_categories`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `uuid` | Primary |
| `org_id` | `uuid` |  |
| `name` | `text` |  |
| `color` | `text` |  Nullable |
| `sort_order` | `int4` |  Nullable |
| `created_at` | `timestamptz` |  Nullable |

## Table `register_expense_heads`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `uuid` | Primary |
| `org_id` | `uuid` |  |
| `category_id` | `uuid` |  Nullable |
| `name` | `text` |  |
| `created_at` | `timestamptz` |  Nullable |

## Table `register_expenses`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `uuid` | Primary |
| `org_id` | `uuid` |  |
| `register_id` | `uuid` |  Nullable |
| `date` | `date` |  |
| `head_id` | `uuid` |  Nullable |
| `head_name` | `text` |  |
| `category_name` | `text` |  Nullable |
| `description` | `text` |  Nullable |
| `amount` | `numeric` |  |
| `payment_mode` | `text` |  Nullable |
| `created_at` | `timestamptz` |  Nullable |

## Table `sale_transactions`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `uuid` | Primary |
| `org_id` | `uuid` |  |
| `register_id` | `uuid` |  Nullable |
| `date` | `date` |  |
| `channel` | `text` |  |
| `payment_modes` | `jsonb` |  |
| `total_amount` | `numeric` |  |
| `order_reference` | `text` |  Nullable |
| `customer_name` | `text` |  Nullable |
| `customer_phone` | `text` |  Nullable |
| `items_summary` | `text` |  Nullable |
| `item_count` | `int4` |  Nullable |
| `notes` | `text` |  Nullable |
| `created_by` | `uuid` |  Nullable |
| `created_at` | `timestamptz` |  Nullable |

## Table `saved_reports`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `uuid` | Primary |
| `org_id` | `uuid` |  |
| `name` | `text` |  |
| `module` | `text` |  |
| `chart_type` | `text` |  Nullable |
| `filters` | `jsonb` |  Nullable |
| `date_range` | `text` |  Nullable |
| `created_by` | `uuid` |  Nullable |
| `is_pinned` | `bool` |  Nullable |
| `created_at` | `timestamptz` |  Nullable |

## Table `store_orders`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `uuid` | Primary |
| `org_id` | `uuid` |  |
| `order_number` | `text` |  |
| `customer_name` | `text` |  Nullable |
| `customer_phone` | `text` |  Nullable |
| `customer_email` | `text` |  Nullable |
| `channel` | `text` |  Nullable |
| `items` | `jsonb` |  |
| `subtotal` | `numeric` |  Nullable |
| `tax_amount` | `numeric` |  Nullable |
| `discount_amount` | `numeric` |  Nullable |
| `total` | `numeric` |  Nullable |
| `payment_method` | `text` |  Nullable |
| `payment_status` | `text` |  Nullable |
| `order_status` | `text` |  Nullable |
| `notes` | `text` |  Nullable |
| `created_at` | `timestamptz` |  Nullable |

## Table `store_products`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `uuid` | Primary |
| `org_id` | `uuid` |  |
| `name` | `text` |  |
| `description` | `text` |  Nullable |
| `sku` | `text` |  Nullable |
| `category` | `text` |  Nullable |
| `price` | `numeric` |  |
| `cost_price` | `numeric` |  Nullable |
| `stock_qty` | `int4` |  Nullable |
| `min_stock` | `int4` |  Nullable |
| `unit` | `text` |  Nullable |
| `image_url` | `text` |  Nullable |
| `is_active` | `bool` |  Nullable |
| `channel` | `text` |  Nullable |
| `created_at` | `timestamptz` |  Nullable |
| `barcode` | `text` |  Nullable |
| `weight` | `numeric` |  Nullable |
| `weight_unit` | `text` |  Nullable |
| `compare_at_price` | `numeric` |  Nullable |
| `tags` | `_text` |  Nullable |
| `vendor` | `text` |  Nullable |
| `images` | `_text` |  Nullable |

## Table `tasks`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `uuid` | Primary |
| `org_id` | `uuid` |  Nullable |
| `title` | `text` |  |
| `description` | `text` |  Nullable |
| `assignee_id` | `uuid` |  Nullable |
| `assigned_by` | `uuid` |  Nullable |
| `due_date` | `date` |  Nullable |
| `priority` | `text` |  |
| `status` | `text` |  |
| `created_at` | `timestamptz` |  Nullable |

## Table `user_credentials`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `uuid` | Primary |
| `employee_id` | `uuid` |  Unique |
| `password_hash` | `text` |  |
| `created_at` | `timestamptz` |  Nullable |
| `updated_at` | `timestamptz` |  Nullable |
| `must_change` | `bool` |  Nullable |

## Table `user_sessions`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `uuid` | Primary |
| `user_id` | `uuid` |  |
| `token` | `text` |  Unique |
| `expires_at` | `timestamptz` |  |
| `created_at` | `timestamptz` |  Nullable |

## Table `users`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `uuid` | Primary |
| `org_id` | `uuid` |  Nullable |
| `full_name` | `text` |  Nullable |
| `email` | `text` |  Nullable |
| `role` | `text` |  Nullable |
| `phone` | `text` |  Nullable |
| `created_at` | `timestamptz` |  Nullable |

## Table `wa_attendance_logs`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `uuid` | Primary |
| `org_id` | `uuid` |  |
| `employee_id` | `uuid` |  Nullable |
| `phone` | `text` |  Nullable |
| `action` | `text` |  |
| `message` | `text` |  Nullable |
| `location_lat` | `numeric` |  Nullable |
| `location_lng` | `numeric` |  Nullable |
| `photo_url` | `text` |  Nullable |
| `processed` | `bool` |  Nullable |
| `created_at` | `timestamptz` |  Nullable |

## Table `wa_broadcasts`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `uuid` | Primary |
| `org_id` | `uuid` |  |
| `name` | `text` |  |
| `template_id` | `uuid` |  Nullable |
| `audience_filter` | `jsonb` |  Nullable |
| `recipients` | `int4` |  Nullable |
| `sent` | `int4` |  Nullable |
| `delivered` | `int4` |  Nullable |
| `read` | `int4` |  Nullable |
| `failed` | `int4` |  Nullable |
| `status` | `text` |  Nullable |
| `scheduled_at` | `timestamptz` |  Nullable |
| `completed_at` | `timestamptz` |  Nullable |
| `created_at` | `timestamptz` |  Nullable |

## Table `wa_contacts`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `uuid` | Primary |
| `org_id` | `uuid` |  |
| `phone` | `text` |  |
| `name` | `text` |  Nullable |
| `employee_id` | `uuid` |  Nullable |
| `type` | `text` |  Nullable |
| `opted_in` | `bool` |  Nullable |
| `last_message_at` | `timestamptz` |  Nullable |
| `created_at` | `timestamptz` |  Nullable |

## Table `wa_messages`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `uuid` | Primary |
| `org_id` | `uuid` |  |
| `contact_id` | `uuid` |  Nullable |
| `direction` | `text` |  |
| `message_type` | `text` |  Nullable |
| `content` | `text` |  Nullable |
| `template_name` | `text` |  Nullable |
| `media_url` | `text` |  Nullable |
| `status` | `text` |  Nullable |
| `metadata` | `jsonb` |  Nullable |
| `created_at` | `timestamptz` |  Nullable |

## Table `wa_templates`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `uuid` | Primary |
| `org_id` | `uuid` |  |
| `name` | `text` |  |
| `category` | `text` |  Nullable |
| `language` | `text` |  Nullable |
| `header` | `text` |  Nullable |
| `body` | `text` |  |
| `footer` | `text` |  Nullable |
| `buttons` | `jsonb` |  Nullable |
| `status` | `text` |  Nullable |
| `variables` | `_text` |  Nullable |
| `created_at` | `timestamptz` |  Nullable |

## Table `whatsapp_messages`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `uuid` | Primary |
| `org_id` | `uuid` |  Nullable |
| `employee_id` | `uuid` |  Nullable |
| `phone` | `text` |  |
| `direction` | `text` |  Nullable |
| `message_type` | `text` |  Nullable |
| `body` | `text` |  Nullable |
| `wati_message_id` | `text` |  Nullable |
| `status` | `text` |  Nullable |
| `created_at` | `timestamptz` |  Nullable |

## Table `whiteboard_notes`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `uuid` | Primary |
| `board_id` | `uuid` |  |
| `type` | `text` |  |
| `note_type` | `text` |  |
| `x` | `float8` |  |
| `y` | `float8` |  |
| `width` | `float8` |  |
| `height` | `float8` |  |
| `content` | `text` |  |
| `color` | `text` |  |
| `fill_color` | `text` |  |
| `stroke_color` | `text` |  |
| `stroke_width` | `float8` |  |
| `opacity` | `float8` |  |
| `border_radius` | `float8` |  |
| `shape_kind` | `text` |  |
| `font_size` | `float8` |  |
| `font_weight` | `text` |  |
| `font_style` | `text` |  |
| `text_align` | `text` |  |
| `text_decoration` | `text` |  |
| `rotation` | `float8` |  |
| `z_index` | `int4` |  |
| `pinned` | `bool` |  |
| `locked` | `bool` |  |
| `priority` | `text` |  |
| `kanban_status` | `text` |  |
| `assignee_id` | `uuid` |  Nullable |
| `due_date` | `date` |  Nullable |
| `labels` | `jsonb` |  |
| `checklist` | `jsonb` |  |
| `table_data` | `jsonb` |  Nullable |
| `draw_paths` | `jsonb` |  |
| `comments` | `jsonb` |  |
| `reactions` | `jsonb` |  |
| `created_by` | `uuid` |  Nullable |
| `created_at` | `timestamptz` |  |
| `updated_at` | `timestamptz` |  |

## Table `whiteboards`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `uuid` | Primary |
| `org_id` | `uuid` |  |
| `name` | `text` |  |
| `created_by` | `uuid` |  Nullable |
| `created_at` | `timestamptz` |  |
| `updated_at` | `timestamptz` |  |

# northweblabs-hrms
