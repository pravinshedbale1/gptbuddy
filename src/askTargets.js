// Where a question can be sent. `prefill: true` means the site accepts the
// question in the URL; otherwise we copy it and the user pastes (⌘V / Ctrl+V).
const enc = encodeURIComponent;

export const TARGETS = [
  {
    id: 'chatgpt',
    label: 'ChatGPT',
    color: '#10a37f',
    url: (q) => `https://chatgpt.com/?q=${enc(q)}`,
    prefill: true,
  },
  {
    id: 'claude',
    label: 'Claude',
    color: '#d97757',
    url: (q) => `https://claude.ai/new?q=${enc(q)}`,
    prefill: true,
  },
  {
    id: 'gemini',
    label: 'Gemini',
    color: '#4285f4',
    url: () => 'https://gemini.google.com/app',
    prefill: false,
  },
  {
    id: 'perplexity',
    label: 'Perplexity',
    color: '#20808d',
    url: (q) => `https://www.perplexity.ai/search?q=${enc(q)}`,
    prefill: true,
  },
  {
    id: 'google-ai',
    label: 'Google AI Mode',
    color: '#ea4335',
    url: (q) => `https://www.google.com/search?udm=50&q=${enc(q)}`,
    prefill: true,
  },
];

export const targetById = (id) => TARGETS.find((t) => t.id === id) || TARGETS[0];
