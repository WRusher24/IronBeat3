import { z } from "zod";

import { THEME_IDS } from "@/lib/theme";

export const emailSchema = z
  .string()
  .trim()
  .min(3, "Enter your email address.")
  .max(254, "That email address is too long.")
  .email("Enter a valid email address.")
  .transform((value) => value.toLowerCase());

export const passwordSchema = z
  .string()
  .min(8, "Use at least 8 characters for your password.")
  .max(72, "Passwords can be at most 72 characters.");

export const displayNameSchema = z
  .string()
  .trim()
  .max(40, "Keep your name under 40 characters.");

export const registerSchema = z.object({
  email: emailSchema,
  password: passwordSchema,
  displayName: displayNameSchema.optional().default(""),
});

export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, "Enter your password.").max(72),
});

export const themeSchema = z.enum(THEME_IDS);

export const updateMeSchema = z
  .object({
    theme: themeSchema.optional(),
    displayName: displayNameSchema.optional(),
  })
  .refine((value) => value.theme !== undefined || value.displayName !== undefined, {
    message: "Nothing to update.",
  });

export const searchQuerySchema = z
  .string()
  .trim()
  .min(2, "Search for at least 2 characters.")
  .max(120, "Keep your search under 120 characters.");

export const videoIdSchema = z
  .string()
  .regex(/^[A-Za-z0-9_-]{11}$/, "That track id is not valid.");

export const uuidSchema = z.string().uuid("That id is not valid.");

export const trackInputSchema = z.object({
  videoId: videoIdSchema,
  title: z.string().trim().min(1).max(300),
  artist: z.string().trim().min(1).max(200),
  duration: z.coerce.number().int().min(0).max(86_400).default(0),
});

export const historyQuerySchema = z.object({
  query: searchQuerySchema,
});

export const playlistNameSchema = z
  .string()
  .trim()
  .min(1, "Give your playlist a name.")
  .max(60, "Keep playlist names under 60 characters.");

export const playlistDescriptionSchema = z
  .string()
  .trim()
  .max(160, "Keep the description under 160 characters.");

export const playlistEmojiSchema = z
  .string()
  .trim()
  .min(1)
  .max(8, "Choose a single emoji.");

export const createPlaylistSchema = z.object({
  name: playlistNameSchema,
  description: playlistDescriptionSchema.optional().default(""),
  emoji: playlistEmojiSchema.optional().default("🏋️"),
});

export const updatePlaylistSchema = z
  .object({
    name: playlistNameSchema.optional(),
    description: playlistDescriptionSchema.optional(),
    emoji: playlistEmojiSchema.optional(),
  })
  .refine((value) => Object.keys(value).length > 0, {
    message: "Nothing to update.",
  });

export const trackEnvelopeSchema = z.object({
  track: trackInputSchema,
});

export const addPlaylistTrackSchema = trackEnvelopeSchema;

export const searchFilterSchema = z.enum([
  "videos",
  "music_songs",
  "music_videos",
]);

export function firstIssue(error: z.ZodError): string {
  return error.issues[0]?.message ?? "Please check the values you entered.";
}
