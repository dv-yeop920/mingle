const BASE_CHARS = 1500;
const CHARS_PER_MEMBER = 300;
const CHARS_PER_PAIR = 550;
const SAFETY_FACTOR = 1.15;

const estimateResponseSize = (memberCount: number, pairCount: number) =>
  Math.round(
    (BASE_CHARS + memberCount * CHARS_PER_MEMBER + pairCount * CHARS_PER_PAIR)
    * SAFETY_FACTOR,
  );

export { estimateResponseSize };
