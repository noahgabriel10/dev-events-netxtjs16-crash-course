'use client';

import React, {useState} from 'react'
import {createBooking} from "@/lib/actions/booking.action";
import posthog from "posthog-js";

export const BookEvent = ({ eventId, slug }: {eventId: string, slug: string}) => {
    const [email, setEmail] = useState('');
    const [submitted, setSubmitted] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        const { success } = await createBooking({eventId, slug, email});

        if (success) {
            setSubmitted(true);
            posthog.capture('event_booked', { eventId, slug, email});
        } else {
            console.error('Booking creation failed')
            posthog.captureException('Booking creation failed');
        }
    }

    return (
        <div id="book-event">
            {submitted ? (
                <p className="text-sm">Thank you for signing up!</p>
            ): (
                <form onSubmit={handleSubmit}>
                    <div>
                        <label htmlFor="email">Email Adress</label>
                        <input
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            id="email"
                            placeholder="Enter you E-Mail Adress" />
                    </div>
                    <button type="submit" className="button-submit">Submit</button>
                </form>
            )}
        </div>
    )
}
