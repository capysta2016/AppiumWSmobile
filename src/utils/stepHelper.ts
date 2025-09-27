import { runStep } from './steps';
import { attachScreenshot } from './reportUtils';

// Internal counter (используется только если включена нумерация)
let stepCounter = 0;

/** Reset counter (call in beforeEach or at start of each it if desired) */
export function resetStepCounter() {
  stepCounter = 0;
}

const inlineScreenshots = process.env.INLINE_STEP_SCREENSHOTS !== 'false';
const numberingEnabled = process.env.STEP_NUMBERING === 'true'; // по умолчанию выключено

export interface StepOptions {
  /** Force screenshot even if inline disabled or enabled */
  forceScreenshot?: boolean;
  /** Override automatic numbering (if you need custom prefix) */
  customLabel?: string;
  /** Disable auto number prefix for this step only */
  noNumber?: boolean;
}

/**
 * stepSS - standardized business step with:
 *  - (опционально) auto numbering (1., 2., 3. ...) если STEP_NUMBERING=true
 *  - optional inline screenshot (if INLINE_STEP_SCREENSHOTS !== 'false')
 *  - fallback explicit screenshot attachment when inline disabled
 *  - short descriptive label
 */
export async function stepSS(label: string, fn: () => Promise<void>, opts: StepOptions = {}) {
  if (numberingEnabled) stepCounter += 1;
  const numberPrefix = numberingEnabled && !opts.noNumber ? `${stepCounter}. ` : '';
  const finalLabel = opts.customLabel ?? `${numberPrefix}${label}`;

  await runStep(finalLabel, async () => {
    await fn();
    if (!inlineScreenshots || opts.forceScreenshot) {
      // When inline screenshots disabled we attach explicitly; if forceScreenshot then attach always in addition
      await attachScreenshot(label);
    }
  });
}
