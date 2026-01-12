import { Schema, model, models, Document, Model, Types } from 'mongoose';

import Event from './event.model';

// Shape of data required to create or update a booking
export interface BookingAttrs {
  eventId: Types.ObjectId;
  email: string;
}

// Booking document as stored in MongoDB
export interface BookingDocument extends BookingAttrs, Document {
  createdAt: Date;
  updatedAt: Date;
}

export type BookingModel = Model<BookingDocument>;

// Lightweight email validation suitable for most production use cases
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const bookingSchema = new Schema<BookingDocument>(
  {
    eventId: {
      type: Schema.Types.ObjectId,
      ref: 'Event',
      required: true,
      index: true, // Index for faster lookups by event
    },
    email: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
    },
  },
  {
    timestamps: true, // Automatically manage createdAt / updatedAt
  }
);

// Additional explicit index on eventId (defensive if schema-level index changes)
bookingSchema.index({ eventId: 1 });

// Pre-save hook to validate email and ensure the referenced event exists
bookingSchema.pre('save', async function (next) {
  const doc = this as BookingDocument;

  // Validate email format and normalize casing
  if (typeof doc.email !== 'string' || doc.email.trim().length === 0) {
    return next(new Error('Email is required and must be a non-empty string.'));
  }

  const normalizedEmail = doc.email.trim().toLowerCase();
  if (!EMAIL_REGEX.test(normalizedEmail)) {
    return next(new Error('Email is not in a valid format.'));
  }
  doc.email = normalizedEmail;

  // Verify the referenced event exists when creating or changing eventId
  if (doc.isNew || doc.isModified('eventId')) {
    if (!doc.eventId) {
      return next(new Error('eventId is required.'));
    }

    try {
      const existingEvent = await Event.exists({ _id: doc.eventId });
      if (!existingEvent) {
        return next(new Error('Referenced event does not exist.'));
      }
    } catch (error) {
      if (error instanceof Error) {
        return next(error);
      }
      return next(new Error('Failed to validate referenced event.'));
    }
  }

  return next();
});

const Booking: BookingModel = (models.Booking as BookingModel) || model<BookingDocument>('Booking', bookingSchema);

export default Booking;
