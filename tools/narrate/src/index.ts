export { narrationHash } from './hash'
export {
  applyPronunciation,
  escapeRegExp,
  loadPronunciation,
  type PronunciationDictionary
} from './pronunciation'
export {
  charactersToWords,
  tokenize,
  type AlignmentFile,
  type NarrationWord
} from './alignment'
export { synthesize, type SynthesisInput, type SynthesisResult } from './client'
export {
  NARRATION_SETTINGS,
  computeAudioRecord,
  narrateExhibit,
  narrationSettingsJson,
  type NarrateExhibitInput,
  type NarrateExhibitOutput
} from './narrate'
