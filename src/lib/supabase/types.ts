export type Role = "worker" | "organizer" | "admin";

export type UserStatus = "unverified" | "basic_verified" | "trusted";

export type EventStatus = "draft" | "published" | "filling" | "full" | "closed" | "completed" | "cancelled";

export type ApplicationStatus = "pending" | "approved" | "rejected" | "cancelled";

export interface Profile {
  id: string;
  user_id: string;
  role: Role;
  full_name: string;
  email: string | null;
  phone: string | null;
  age: number | null;
  gender: string | null;
  city: string | null;
  area: string | null;
  avatar_url: string | null;
  skills: string[] | null;
  experience: string | null;
  availability: string | null;
  bio: string | null;
  status: UserStatus;
  is_trusted_organizer: boolean;
  created_at: string;
  updated_at: string;
}

export interface Event {
  id: string;
  organizer_id: string;
  title: string;
  location: string;
  date: string;
  time: string;
  worker_count: number;
  gender_requirement: string | null;
  min_age: number | null;
  max_age: number | null;
  dress_code: string | null;
  required_documents: string[] | null;
  category: string | null;
  application_deadline: string | null;
  experience_required: string | null;
  skill_requirements: string[] | null;
  grooming_notes: string | null;
  food_included: boolean | null;
  travel_included: boolean | null;
  overtime_info: string | null;
  contact_person_notes: string | null;
  google_maps_link: string | null;
  is_template: boolean | null;
  template_name: string | null;
  payment_info: string | null;
  reporting_details: string | null;
  instructions: string | null;
  status: EventStatus;
  created_at: string;
  updated_at: string;
}

export interface Application {
  id: string;
  event_id: string;
  worker_id: string;
  status: ApplicationStatus;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface Document {
  id: string;
  user_id: string;
  type: "aadhaar" | "driving_license" | "photo" | "other";
  url: string;
  verified: boolean;
  created_at: string;
}

export interface Review {
  id: string;
  from_id: string;
  to_id: string;
  event_id: string;
  rating: number;
  comment: string | null;
  created_at: string;
}

export interface Notification {
  id: string;
  user_id: string;
  title: string;
  message: string;
  read: boolean;
  created_at: string;
}

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: Profile;
        Insert: Omit<Profile, "created_at" | "updated_at">;
        Update: Partial<Profile>;
      };
      events: {
        Row: Event;
        Insert: Omit<Event, "created_at" | "updated_at">;
        Update: Partial<Event>;
      };
      applications: {
        Row: Application;
        Insert: Omit<Application, "created_at" | "updated_at">;
        Update: Partial<Application>;
      };
      documents: {
        Row: Document;
        Insert: Omit<Document, "created_at">;
        Update: Partial<Document>;
      };
      reviews: {
        Row: Review;
        Insert: Omit<Review, "created_at">;
        Update: Partial<Review>;
      };
      notifications: {
        Row: Notification;
        Insert: Omit<Notification, "created_at">;
        Update: Partial<Notification>;
      };
    };
  };
}
