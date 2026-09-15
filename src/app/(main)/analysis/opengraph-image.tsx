import { createAnalysisSocialImage } from './analysis-social-image';

const alt = 'MIXTI 궁합·성격·캐릭터 MBTI 분석 모음';
const size = { width: 1200, height: 630 };
const contentType = 'image/png';

const OpenGraphImage = () => createAnalysisSocialImage();

export { alt, contentType, size };
export default OpenGraphImage;
