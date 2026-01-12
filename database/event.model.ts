import { Schema, model, models, Document, Model } from 'mongoose';

// Shape of data required to create or update an event
export interface EventAttrs {
  title: string;
  slug?: string; // Auto-generated from title
  description: string;
  overview: string;
  image: string;
  venue: string;
  location: string;
  date: string; // Normalized ISO date string (YYYY-MM-DD)
  time: string; // Normalized 24-hour time string (HH:MM)
  mode: string;
  audience: string;
  agenda: string[];
  organizer: string;
  tags: string[];
}

// Event document as stored in MongoDB
export interface EventDocument extends EventAttrs, Document {
  createdAt: Date;
  updatedAt: Date;
}

export type EventModel = Model<EventDocument>;

// Generate a URL-friendly slug from the event title
function generateSlug(title: string): string {
  return title
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-') // Replace non-alphanumeric with dashes
    .replace(/^-+|-+$/g, ''); // Trim leading/trailing dashes
}

// Normalize various human time inputs to 24-hour HH:MM format
function normalizeTime(timeStr: string): string {
  const trimmed = timeStr.trim().toLowerCase();

  // Already in 24-hour HH:MM format
  const twentyFourHourMatch = trimmed.match(/^([01]\d|2[0-3]):([0-5]\d)$/);
  if (twentyFourHourMatch) {
    return `${twentyFourHourMatch[1]}:${twentyFourHourMatch[2]}`;
  }

  // 12-hour time like "1pm", "1:30 pm"
  const twelveHourMatch = trimmed.match(/^(\d{1,2})(?::([0-5]\d))?\s*(am|pm)$/);
  if (twelveHourMatch) {
    let hour = parseInt(twelveHourMatch[1], 10);
    const minute = twelveHourMatch[2] ?? '00';
    const period = twelveHourMatch[3];

    if (hour < 1 || hour > 12) {
      throw new Error('Invalid 12-hour time format.');
    }

    if (period === 'pm' && hour !== 12) {
      hour += 12;
    } else if (period === 'am' && hour === 12) {
      hour = 0;
    }

    return `${hour.toString().padStart(2, '0')}:${minute}`;
  }

  throw new Error('Invalid time format. Use 24h "HH:MM" or 12h "H:MM am/pm".');
}

const eventSchema = new Schema<EventDocument>(
  {
    title: { type: String, required: true, trim: true },
    slug: { type: String, unique: true, index: true },
    description: { type: String, required: true, trim: true },
    overview: { type: String, required: true, trim: true },
    image: { type: String, required: true, trim: true },
    venue: { type: String, required: true, trim: true },
    location: { type: String, required: true, trim: true },
    date: { type: String, required: true },
    time: { type: String, required: true },
    mode: { type: String, required: true, trim: true },
    audience: { type: String, required: true, trim: true },
    agenda: { type: [String], required: true },
    organizer: { type: String, required: true, trim: true },
    tags: { type: [String], required: true },
  },
  {
    timestamps: true, // Automatically manage createdAt / updatedAt
  }
);

// Ensure slug remains unique at the database level
eventSchema.index({ slug: 1 }, { unique: true });

// Pre-save hook to generate slug, normalize date/time, and validate required fields
eventSchema.pre('save', function (next) {
  const doc = this as EventDocument;

  // Validate required string fields are present and non-empty
  const requiredStringFields: (keyof EventAttrs)[] = [
    'title',
    'description',
    'overview',
    'image',
    'venue',
    'location',
    'date',
    'time',
    'mode',
    'audience',
    'organizer',
  ];

  for (const field of requiredStringFields) {
    const value = doc[field];
    if (typeof value !== 'string' || value.trim().length === 0) {
      return next(new Error(`Field "${String(field)}" is required and must be a non-empty string.`));
    }
  }

  // Validate required array fields are non-empty arrays of strings
  const requiredArrayFields: (keyof EventAttrs)[] = ['agenda', 'tags'];

  for (const field of requiredArrayFields) {
    const value = doc[field];
    if (!Array.isArray(value) || value.length === 0 || value.some((item) => typeof item !== 'string' || item.trim().length === 0)) {
      return next(new Error(`Field "${String(field)}" must be a non-empty array of strings.`));
    }
  }

  // Only regenerate slug when title changes or slug is missing
  if (doc.isModified('title') || !doc.slug) {
    doc.slug = generateSlug(doc.title);
  }

  // Normalize date to ISO-8601 (YYYY-MM-DD) for consistent storage
  const parsedDate = new Date(doc.date);
  if (Number.isNaN(parsedDate.getTime())) {
    return next(new Error('Invalid date format. Date must be a valid value parsable by JavaScript Date.'));
  }
  doc.date = parsedDate.toISOString().split('T')[0];

  // Normalize time to 24-hour HH:MM format
  try {
    doc.time = normalizeTime(doc.time);
  } catch (error) {
    if (error instanceof Error) {
      return next(error);
    }
    return next(new Error('Invalid time format.'));
  }

  return next();
});

const Event: EventModel = (models.Event as EventModel) || model<EventDocument>('Event', eventSchema);

export default Event;
