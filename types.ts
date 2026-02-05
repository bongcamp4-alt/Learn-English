
export enum Level {
  BEGINNER = 'Beginner (초급)',
  INTERMEDIATE = 'Intermediate (중급)',
  ADVANCED = 'Advanced (고급)'
}

export enum Topic {
  GENERAL = 'General',
  TRAVEL = 'Travel',
  SIGHTSEEING = 'Sightseeing',
  RESTAURANT = 'Restaurant',
  SHOPPING = 'Shopping',
  TRANSPORT = 'Transport',
  HOTEL = 'Hotel',
  BUSINESS = 'Business',
  EMERGENCY = 'Emergency'
}

export interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
  hasAudio?: boolean;
}

export interface UserSettings {
  level: Level;
  topic: Topic;
  voice: string;
}
