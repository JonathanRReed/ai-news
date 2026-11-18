export interface CompanyEntry {
  name: string;
  logo: string;
}

import { activeEntities } from './intelligenceCatalog.js';

export const FALLBACK_COMPANY_LOGO = '/logos/Globe Icon.svg';

const COMPANY_LOGO_MATCHERS = [
  { keys: ['openai'], logo: '/logos/OpenAI_logo.svg' },
  { keys: ['meta'], logo: '/logos/Meta_logo.svg' },
  { keys: ['deepmind'], logo: '/logos/DeepMind_logo.svg' },
  { keys: ['anthropic'], logo: '/logos/Anthropic_logo.svg' },
  { keys: ['mistral'], logo: '/logos/Mistral_logo.svg' },
  { keys: ['hugging'], logo: '/logos/Hugging_Face_logo.svg' },
  { keys: ['x.ai', 'xai'], logo: '/logos/Xai_logo.svg' },
  { keys: ['deepseek'], logo: '/logos/DeepSeek_logo.svg' },
  { keys: ['ibm'], logo: '/logos/IBM_logo.svg' },
  { keys: ['amazon', 'aws'], logo: '/logos/AWS_logo.svg' },
  { keys: ['nvidia'], logo: '/logos/NVIDIA_logo.svg' },
  { keys: ['qwen', 'alibaba', 'tongyi'], logo: '/logos/Qwen_logo.svg' },
];

// Publishers without a supplied mark get their own letters instead of one shared generic icon,
// which read as a control and made unrelated publishers look identical.
export function companyMonogram(company: string): string {
  const name = (company || '').trim();
  const words = name.split(/[^A-Za-z0-9]+/).filter(Boolean);
  if (words.length === 1) {
    // OpenClaw -> OC, MiniMax -> MM: the capitals carry the name.
    const capitals = words[0].match(/[A-Z]/g) ?? [];
    if (capitals.length >= 2 && capitals.length < words[0].length) return capitals.slice(0, 3).join('');
  }
  return words.join('').slice(0, 3);
}

function monogramLogo(company: string): string {
  const letters = companyMonogram(company).replace(/[^A-Za-z0-9]/g, '');
  if (!letters) return FALLBACK_COMPANY_LOGO;
  const size = letters.length >= 3 ? 12.5 : 15;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32"><text x="16" y="${size >= 15 ? 21.5 : 20.5}" text-anchor="middle" font-family="Helvetica Neue,Arial,sans-serif" font-size="${size}" font-weight="700" fill="#111111">${letters}</text></svg>`;
  return `data:image/svg+xml,${encodeURIComponent(svg)}`;
}

export function resolveCompanyLogo(company: string): string {
  const normalizedName = (company || '').toLowerCase();
  const match = COMPANY_LOGO_MATCHERS.find(({ keys }) => keys.some((key) => normalizedName.includes(key)));
  return match?.logo ?? monogramLogo(company);
}

// The filter is generated from the admitted registry, so a provider appears here only
// when at least one active first-party source is wired. Harnesses have their own index.
export const companies: CompanyEntry[] = [
  { name: 'All', logo: FALLBACK_COMPANY_LOGO },
  ...activeEntities
    .filter((entity) => entity.entityType !== 'harness')
    .map((entity) => ({ name: entity.name, logo: resolveCompanyLogo(entity.name) })),
];

export function companyLogoAlt(company: string): string {
  const name = (company || '').trim();
  return name ? `Provider mark for ${name}` : 'AI provider mark';
}
