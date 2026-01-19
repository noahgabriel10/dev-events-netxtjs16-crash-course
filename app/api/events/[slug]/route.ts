import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import Event, { IEvent } from '@/database/event.model';

// Route params type for the dynamic [slug] segment
interface RouteContext {
  params: {
    slug?: string;
  };
}

// Enumerates error codes returned by this endpoint
type ErrorCode =
  | 'MISSING_SLUG'
  | 'INVALID_SLUG_FORMAT'
  | 'EVENT_NOT_FOUND'
  | 'INTERNAL_SERVER_ERROR';

// Shape of error responses
interface ErrorResponse {
  message: string;
  error: ErrorCode;
  details?: unknown;
}

// Shape of a successful response
interface SuccessResponse {
  message: string;
  event: IEvent;
}

// Internal result type for slug validation
type SlugValidationResult =
  | { ok: true; slug: string }
  | { ok: false; status: 400; code: Extract<ErrorCode, 'MISSING_SLUG' | 'INVALID_SLUG_FORMAT'>; message: string };

/**
 * Validates and normalizes the slug route parameter.
 * Ensures presence, trims whitespace, lowercases, and enforces a safe pattern.
 */
function validateSlug(rawSlug: string | undefined): SlugValidationResult {
  if (!rawSlug) {
    return {
      ok: false,
      status: 400,
      code: 'MISSING_SLUG',
      message: 'Slug parameter is required.',
    };
  }

  const slug = rawSlug.trim().toLowerCase();

  if (!slug) {
    return {
      ok: false,
      status: 400,
      code: 'INVALID_SLUG_FORMAT',
      message: 'Slug parameter cannot be empty.',
    };
  }

  const slugPattern = /^[a-z0-9-]+$/;

  if (!slugPattern.test(slug)) {
    return {
      ok: false,
      status: 400,
      code: 'INVALID_SLUG_FORMAT',
      message: 'Slug may only contain lowercase letters, numbers, and hyphens.',
    };
  }

  return { ok: true, slug };
}

/**
 * GET /api/events/[slug]
 * Returns a single events by its slug with robust validation and error handling.
 */
export async function GET(
  req: NextRequest,
  context: RouteContext,
): Promise<NextResponse<SuccessResponse | ErrorResponse>> {
  // Prefer dynamic route param, then query (?slug=), then derive from path as a final fallback.
  const slugFromParams = context?.params?.slug;
  const slugFromQuery = req.nextUrl.searchParams.get('slug') ?? undefined;

  let rawSlug = slugFromParams ?? slugFromQuery;

  if (!rawSlug) {
    const segments = req.nextUrl.pathname.split('/').filter(Boolean);
    const lastSegment = segments[segments.length - 1];

    if (lastSegment && lastSegment !== 'events') {
      rawSlug = lastSegment;
    }
  }

  const validation = validateSlug(rawSlug);

  if (!validation.ok) {
    return NextResponse.json<ErrorResponse>(
      {
        message: validation.message,
        error: validation.code,
      },
      { status: validation.status },
    );
  }

  const { slug } = validation;

  try {
    // Ensure a single, cached MongoDB connection in serverless / dev environments
    await connectDB();

    // Find events by normalized slug
    const event = await Event.findOne({ slug }).exec();

    if (!event) {
      return NextResponse.json<ErrorResponse>(
        {
          message: 'Event not found.',
          error: 'EVENT_NOT_FOUND',
        },
        { status: 404 },
      );
    }

    return NextResponse.json<SuccessResponse>(
      {
        message: 'Event fetched successfully.',
        event,
      },
      { status: 200 },
    );
  } catch (error: unknown) {
    const errorMessage =
      error instanceof Error ? error.message : 'An unexpected error occurred.';

    // Avoid leaking internals in production, but provide details in development
    const details =
      process.env.NODE_ENV === 'development' ? errorMessage : undefined;

    return NextResponse.json<ErrorResponse>(
      {
        message: 'Failed to fetch events.',
        error: 'INTERNAL_SERVER_ERROR',
        details,
      },
      { status: 500 },
    );
  }
}
