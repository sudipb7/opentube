import { z, ZodError, ZodSchema } from "zod";
import { ApiResponse } from "./api";

const handleValidation = <T>(schema: ZodSchema<T>, data: unknown): { error?: ApiResponse<any>; data?: T } => {
  const result = schema.safeParse(data);
  if (!result.success) {
    return { error: new ApiResponse(400, result.error.errors[0].message) };
  }
  return { data: result.data };
};

const signUpSchema = z.object({
  name: z.string({ message: "Name is required" }).min(3, { message: "Name must be at least 3 characters long" }),
  email: z.string({ message: "Email is required" }).email({ message: "Invalid email address" }),
  password: z
    .string({ message: "Password is required" })
    .min(6, { message: "Password must be at least 6 characters long" }),
});

const signInSchema = z.object({
  email: z.string({ message: "Email is required" }).email({ message: "Invalid email address" }),
  password: z
    .string({ message: "Password is required" })
    .min(6, { message: "Password must be at least 6 characters long" }),
});

type SignUpInput = z.infer<typeof signUpSchema>;
type SignInInput = z.infer<typeof signInSchema>;

export { handleValidation, signUpSchema, signInSchema };
export type { SignUpInput, SignInInput };
