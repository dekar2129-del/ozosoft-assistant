export enum ConnectionState {
  DISCONNECTED = 'DISCONNECTED',
  CONNECTING = 'CONNECTING',
  CONNECTED = 'CONNECTED',
  ERROR = 'ERROR',
}

export interface TranscriptionItem {
  text: string;
  sender: 'user' | 'model';
  timestamp: number;
  isComplete?: boolean;
}

export interface CompanyConfig {
  name: string;
  industry: string;
  tone: string;
  knowledgeBase: string;
}

export const DEFAULT_CONFIG: CompanyConfig = {
  name: "OZOSOFT",
  industry: "Software Development & IT Solutions",
  tone: "Professional, helpful, and innovative",
  knowledgeBase: `
    - We offer tailored software development, IT consulting, and digital transformation services.
    - Our flagship solutions include enterprise ERP systems and custom mobile applications.
    - Support hours: 24/7 for premium clients, 9-5 for standard support.
    - We prioritize security, scalability, and user experience in all our products.
    - Answer strictly based on this info. If unsure, ask the user to contact contact@ozosoft.com.
  `
};