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

export function resolveCompanyLogo(company: string): string {
  const normalizedName = (company || '').toLowerCase();
  const match = COMPANY_LOGO_MATCHERS.find(({ keys }) => keys.some((key) => normalizedName.includes(key)));
  return match?.logo ?? FALLBACK_COMPANY_LOGO;
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
