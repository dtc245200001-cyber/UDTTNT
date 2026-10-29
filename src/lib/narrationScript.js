/**
 * Virtual Museum Guide Narration Script Builder
 * Provides gentle contextual framing for virtual tour guides:
 * - Opening: "Mời bạn cùng tìm hiểu về {tên hiện vật}."
 * - Closing: "Bạn muốn nghe thêm về hiện vật nào khác không?"
 * Strictly does NOT fabricate or alter historical facts; keeps exact AI / artifact text.
 */

/**
 * Format answer text into an engaging virtual guide narrative
 *
 * @param {string} answerText - The raw or markdown AI text
 * @param {Object} options
 * @param {string} [options.artifactName] - Specific artifact name (if discussing an artifact)
 * @param {boolean} [options.hasArtifacts] - Whether the message contains specific museum artifacts
 * @param {boolean} [options.isFaqOrTicket] - Whether this is opening hours / ticket pricing
 * @returns {string} Text ready for audio narration
 */
export function toGuideNarration(answerText, { artifactName = '', hasArtifacts = false, isFaqOrTicket = false } = {}) {
  if (!answerText) return '';
  const cleanAnswer = String(answerText).trim();

  // If this is ticket price, opening hours, or FAQ, return as is without extra framing
  if (isFaqOrTicket) {
    return cleanAnswer;
  }

  // Only add guide opening/closing if a specific artifact name is present or artifacts are being introduced
  if (artifactName) {
    const trimmedName = artifactName.trim();
    const prefix = `Mời bạn cùng tìm hiểu về ${trimmedName}. `;
    const suffix = ` Bạn muốn nghe thêm về hiện vật nào khác không?`;

    // If answer already starts with the artifact name greeting, avoid stuttering
    const alreadyMentionsStart = cleanAnswer.toLowerCase().startsWith(`mời bạn cùng tìm hiểu về ${trimmedName.toLowerCase()}`);
    if (alreadyMentionsStart) {
      return cleanAnswer.endsWith('?') ? cleanAnswer : `${cleanAnswer}${suffix}`;
    }

    return `${prefix}${cleanAnswer}${suffix}`;
  }

  // If message has artifacts array but no single dominant artifact name
  if (hasArtifacts) {
    const suffix = ` Bạn muốn nghe thêm về hiện vật nào khác không?`;
    if (!cleanAnswer.endsWith('?')) {
      return `${cleanAnswer}${suffix}`;
    }
  }

  return cleanAnswer;
}

export default toGuideNarration;

