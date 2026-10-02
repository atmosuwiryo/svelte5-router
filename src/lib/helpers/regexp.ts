/**
 * Regular expression utilities.
 *
 * @module regexp
 * @category Helpers
 */
export namespace regexp {
  /**
   * Safely handle a capable value as a RegExp.
   *
   * If the value is a string, it will be converted to a RegExp.
   * If the value is already a RegExp, it will be returned as is.
   * Otherwise, an error will be thrown.
   *
   * @throws {Error} If the value is not a string or RegExp.
   */
  export const from = (v: string | RegExp): RegExp => {
    if (typeof v === "string") {
      return new RegExp(v);
    } else if (v instanceof RegExp) {
      return new RegExp(v.source);
    }
    throw new Error("invalid regexp expression");
  };

  /**
   * Check whether a string is intended to be a regular expression.
   *
   * Only regex-only constructs count: special characters
   * `[] {} () * + ? \ ^ $ |`, character classes (`\w \d \s` and negations),
   * and groups. Ordinary punctuation that appears in plain paths — `.`, `,`,
   * `#`, and whitespace — is deliberately excluded, so `/docs/intro.html` is
   * matched literally rather than compiled with `.` as a wildcard.
   *
   * @param v The string to check.
   * @returns True if the string contains regex syntax, false otherwise.
   */
  export const can = (v: string): boolean => {
    return /[[\]{}()*+?\\^$|]|\\[wWdDsS]/.test(v);
  };
}
