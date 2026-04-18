export interface CompanyEntry {
  name: string;
  logo: string;
}

export const FALLBACK_COMPANY_LOGO = '/logos/Globe Icon.svg';

export const companies: CompanyEntry[] = [
  { name: 'All', logo: FALLBACK_COMPANY_LOGO },
  { name: 'Meta AI', logo: '/logos/Meta_logo.svg' },
  { name: 'OpenAI', logo: '/logos/OpenAI_logo.svg' },
  { name: 'Anthropic', logo: '/logos/Anthropic_logo.svg' },
  { name: 'Google DeepMind', logo: '/logos/DeepMind_logo.svg' },
  { name: 'Mistral AI', logo: '/logos/Mistral_logo.svg' },
  { name: 'Hugging Face', logo: '/logos/Hugging_Face_logo.svg' },
  { name: 'xAI', logo: '/logos/Xai_logo.svg' },
  { name: 'DeepSeek', logo: '/logos/DeepSeek_logo.svg' },
  { name: 'IBM Research', logo: '/logos/IBM_logo.svg' },
  { name: 'Amazon AI', logo: '/logos/AWS_logo.svg' },
  { name: 'NVIDIA AI', logo: '/logos/NVIDIA_logo.svg' },
  { name: 'Alibaba Qwen', logo: '/logos/Qwen_logo.svg' },
];

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
