declare module 'react-native-voice' {
  export interface SpeechResultsEvent {
    value: string[];
  }

  export interface SpeechErrorEvent {
    error: string;
  }

  export interface SpeechEndEvent {
    error?: string;
  }

  export default class Voice {
    static onSpeechResults: ((e: SpeechResultsEvent) => void) | null;
    static onSpeechError: ((e: SpeechErrorEvent) => void) | null;
    static onSpeechEnd: ((e: SpeechEndEvent) => void) | null;

    static start(locale?: string): Promise<void>;
    static stop(): Promise<void>;
    static isAvailable(): Promise<boolean>;
    static destroy(): void;
  }
}