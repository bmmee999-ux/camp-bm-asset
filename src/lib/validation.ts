import { z } from "zod";

export const transactionTypeSchema = z.enum([
  "BORROW",
  "RETURN",
  "REPAIR_SEND",
  "REPAIR_RECEIVE",
  "MOVE",
]);

export const createTransactionSchema = z.object({
  transaction_type: transactionTypeSchema,
  ckl_no: z.string().trim().max(120).optional(),
  asset_no: z.string().trim().min(1, "Asset No is required").max(120),
  asset_name: z.string().trim().max(255).optional(),
  sap_no: z.string().trim().max(120).optional(),
  employee_name: z.string().trim().max(255).optional(),
  employee_id: z.string().trim().max(120).optional(),
  transaction_date: z.string().datetime().optional(),
  remark: z.string().trim().max(1000).optional(),
});

export const moveAssetSchema = z.object({
  asset_no: z.string().trim().min(1, "Asset No is required").max(120),
  current_location: z.string().trim().max(255).optional(),
  new_location: z.string().trim().min(1, "New Location is required").max(255),
  move_date: z.string().datetime().optional(),
  remark: z.string().trim().max(1000).optional(),
  gps_location: z.string().trim().max(255).optional(),
  latitude: z.number().min(-90).max(90).nullable().optional(),
  longitude: z.number().min(-180).max(180).nullable().optional(),
});

export function parseZodError(error: z.ZodError) {
  const first = error.issues[0];
  return first?.message ?? "Invalid request payload";
}
