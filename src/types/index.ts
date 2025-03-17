
export interface Bot {
  name: string;
  code: string;
  apiKey: string;
  url: string;
  chatIcon?: string;
  botIcon?: string;
  backgroundImage?: string;
  headerImage?: string;
  chatboxText?: string;
  chatGradient?: string;
}

export interface FeedbackMessage {
  id: string;
  message: string;
  type: 'success' | 'error';
}
