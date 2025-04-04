import OpenAI from 'openai';

let openai: OpenAI | null = null;

export interface Message {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

// 定义支持的聊天模型列表
const CHAT_MODELS = [
  'gpt-4',
  'gpt-4-32k',
  'gpt-4-1106-preview',
  'gpt-3.5-turbo',
  'gpt-3.5-turbo-16k',
  'gpt-3.5-turbo-1106',
];

// 定义模型显示名称映射
const MODEL_DISPLAY_NAMES: Record<string, string> = {
  'gpt-4': 'GPT-4',
  'gpt-4-32k': 'GPT-4 (32K)',
  'gpt-4-1106-preview': 'GPT-4 Turbo',
  'gpt-3.5-turbo': 'GPT-3.5 Turbo',
  'gpt-3.5-turbo-16k': 'GPT-3.5 Turbo (16K)',
  'gpt-3.5-turbo-1106': 'GPT-3.5 Turbo (1106)',
};

export const initOpenAI = (apiKey: string) => {
  openai = new OpenAI({
    apiKey,
    dangerouslyAllowBrowser: true
  });
};

export const getOpenAIModels = async () => {
  if (!openai) throw new Error('OpenAI 未初始化');
  
  try {
    const models = await openai.models.list();
    return models.data
      .filter(model => 
        // 只返回支持的聊天模型
        CHAT_MODELS.some(chatModel => model.id === chatModel)
      )
      .map(model => ({
        id: model.id,
        // 使用预定义的显示名称，如果没有则使用格式化的 ID
        name: MODEL_DISPLAY_NAMES[model.id] || model.id.replace('gpt-', 'GPT-').replace(/-/g, ' ')
      }))
      .sort((a, b) => {
        // 将 GPT-4 模型排在前面
        if (a.id.includes('gpt-4') && !b.id.includes('gpt-4')) return -1;
        if (!a.id.includes('gpt-4') && b.id.includes('gpt-4')) return 1;
        return 0;
      });
  } catch (error: any) {
    if (error?.status === 401) {
      throw new Error('API Key 无效，请检查您的 OpenAI API Key');
    } else if (error?.status === 429) {
      throw new Error('请求过于频繁，请稍后再试');
    } else if (error?.message?.includes('ECONNREFUSED') || error?.message?.includes('ETIMEDOUT')) {
      throw new Error('连接 OpenAI 服务失败，请检查您的网络连接');
    } else if (error?.message?.includes('getaddrinfo')) {
      throw new Error('无法解析 OpenAI 服务地址，请检查您的网络连接或代理设置');
    } else {
      console.error('OpenAI API Error:', error);
      throw new Error(`连接 OpenAI 服务出错: ${error?.message || '未知错误'}`);
    }
  }
};

export const sendMessageToOpenAI = async (
  messages: Message[],
  model: string,
  onToken: (token: string) => void
) => {
  if (!openai) throw new Error('OpenAI 未初始化');

  // 验证模型是否为聊天模型
  if (!CHAT_MODELS.includes(model)) {
    throw new Error(`不支持的模型: ${model}。请选择支持的聊天模型，如 GPT-3.5 Turbo 或 GPT-4。`);
  }

  try {
    const stream = await openai.chat.completions.create({
      model,
      messages,
      stream: true,
      temperature: 0.7,
      max_tokens: 2000
    });

    for await (const chunk of stream) {
      const token = chunk.choices[0]?.delta?.content || '';
      if (token) {
        onToken(token);
      }
    }
  } catch (error: any) {
    if (error?.status === 401) {
      throw new Error('API Key 无效，请检查您的 OpenAI API Key');
    } else if (error?.status === 429) {
      throw new Error('请求过于频繁，请稍后再试');
    } else if (error?.message?.includes('ECONNREFUSED') || error?.message?.includes('ETIMEDOUT')) {
      throw new Error('连接 OpenAI 服务失败，请检查您的网络连接');
    } else if (error?.message?.includes('getaddrinfo')) {
      throw new Error('无法解析 OpenAI 服务地址，请检查您的网络连接或代理设置');
    } else {
      console.error('OpenAI API Error:', error);
      throw new Error(`发送消息失败: ${error?.message || '未知错误'}`);
    }
  }
}; 