// The assistant speaks Arabic and English only. The prompt says so; this is the safety net.
// Any letter that is not Arabic or Latin (Japanese, Russian, Hindi, ...) blocks the reply.
// Common/Inherited cover digits, punctuation, symbols and emoji.
const OTHER_SCRIPT = /[^\p{Script=Arabic}\p{Script=Latin}\p{Script=Common}\p{Script=Inherited}]/u;

export const isArabicOrEnglish = (text: string) => !OTHER_SCRIPT.test(text);

export const LANGUAGE_FALLBACK =
  'أقدر أجاوب بالعربي أو الإنجليزي فقط. اكتب سؤالك بإحدى اللغتين وأساعدك فوراً.\nI can answer in Arabic or English only. Please write your question in one of them and I will help.';
