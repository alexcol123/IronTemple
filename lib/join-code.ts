// Normalizes a creator's join code to letters/digits only, uppercase — matches
// how the SMS engine will compare it (text.trim().toUpperCase()), so "Larry25",
// "larry 25", and "LARRY25" all collapse to the same stored value.
export function normalizeJoinCode(input: string): string {
  return input.replace(/[^a-zA-Z0-9]/g, "").toUpperCase();
}
