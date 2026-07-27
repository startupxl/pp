// Re-exports the same plain-language framework guide copy used on the
// client (Library/Home "how to use this framework" panels) so the AI coach
// and draft endpoints describe each framework consistently with what the
// user sees in the UI, instead of maintaining two copies of this text.
export { FRAMEWORK_GUIDES, getFrameworkGuide } from "../client/src/frameworkGuides.js";
