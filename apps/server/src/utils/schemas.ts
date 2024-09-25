import { z, ZodError } from "zod";

const throwZodError = (error: ZodError) => {
  return error.errors[0].message;
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

export { throwZodError, signUpSchema, signInSchema };
