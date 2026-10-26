import { z } from "zod";

export const emailSchema = z
  .string()
  .trim()
  .min(1, "Enter your email address.")
  .max(254, "That email address is too long.")
  .email("Enter a valid email address.");

export const passwordSchema = z
  .string()
  .min(8, "Use at least 8 characters.")
  .max(200, "That password is too long.");

export const signInSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, "Enter your password.").max(200),
  next: z.string().optional(),
});

export const signUpSchema = z.object({
  displayName: z
    .string()
    .trim()
    .min(2, "Use at least 2 characters.")
    .max(80, "Use 80 characters or fewer."),
  email: emailSchema,
  password: passwordSchema,
});

export const forgotPasswordSchema = z.object({
  email: emailSchema,
});

export const resetPasswordSchema = z
  .object({
    password: passwordSchema,
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match.",
    path: ["confirmPassword"],
  });

export const onboardingSchema = z.object({
  displayName: z.string().trim().min(2).max(80),
  learningGoal: z.enum([
    "general",
    "career",
    "projects",
    "interviews",
    "academic",
    "curiosity",
  ]),
  experienceLevel: z.enum([
    "beginner",
    "some_experience",
    "intermediate",
    "advanced",
  ]),
  preferredMode: z.enum(["coach", "partner"]),
  weeklyMinutes: z.coerce.number().int().min(15).max(3000),
  hintPreference: z.enum(["hints", "direct", "balanced"]),
});

export const settingsSchema = onboardingSchema.extend({
  preferredMode: z.enum(["coach", "partner"]),
});

export const codeRunSchema = z.object({
  code: z
    .string()
    .min(1, "Write some code before running it.")
    .max(20000, "Code is limited to 20,000 characters."),
  exerciseId: z.string().uuid().optional().nullable(),
  language: z.literal("python").optional(),
  mode: z.enum(["run", "submit"]).default("run"),
});

export const draftSchema = z.object({
  exerciseId: z.string().uuid(),
  code: z.string().max(20000),
});

export const tutorRequestSchema = z.object({
  message: z
    .string()
    .trim()
    .min(1, "Write a message first.")
    .max(4000, "Keep messages under 4,000 characters."),
  mode: z.enum(["coach", "partner"]),
  conversationId: z.string().uuid().optional().nullable(),
  lessonId: z.string().uuid().optional().nullable(),
  exerciseId: z.string().uuid().optional().nullable(),
  explorationSessionId: z.string().uuid().optional().nullable(),
  attemptId: z.string().uuid().optional().nullable(),
  code: z.string().max(20000).optional().default(""),
  currentQuestion: z.string().max(4000).optional().default(""),
});

export const assessmentAnswerSchema = z.object({
  attemptId: z.string().uuid(),
  questionId: z.string().uuid(),
  skip: z.boolean().optional().default(false),
  response: z
    .object({
      optionId: z.string().max(20).optional(),
      value: z.string().max(5000).optional(),
      code: z.string().max(20000).optional(),
    })
    .optional()
    .default({}),
});

export const assessmentCompleteSchema = z.object({
  attemptId: z.string().uuid(),
});

export const assessmentStartSchema = z.object({
  retake: z.boolean().optional().default(false),
});

export const reviewAnswerSchema = z.object({
  itemId: z.string().uuid(),
  response: z
    .object({
      optionId: z.string().max(20).optional(),
      value: z.string().max(2000).optional(),
    })
    .optional()
    .default({}),
  confidence: z.enum(["low", "medium", "high"]).optional().default("medium"),
  selfQuality: z.number().int().min(0).max(5).optional(),
});

export const explorationSchema = z.object({
  topic: z.string().trim().min(3, "Describe what you want to explore.").max(240),
});

export const deleteAccountSchema = z.object({
  password: z.string().min(1, "Enter your password."),
  confirmation: z.literal("DELETE"),
});

export function firstZodError(result) {
  if (result.success) return null;
  return result.error.issues[0]?.message || "Check the form and try again.";
}
