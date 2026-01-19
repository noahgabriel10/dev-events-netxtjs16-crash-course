'use server';
import Event from '@/database/event.model'
import connectDB from "@/lib/mongodb";

export const getSimilarEventsBySlug = async (slug: string) => {
    try {
        await connectDB();
        const event = await Event.findOne({ slug }).lean();

        const similar = await Event.find({
            _id: {$ne: event._id},
            tags: {$in: event.tags ?? [] },
        }).lean();

        return similar.map((e: any) => ({
            ...e,
            _id: e._id?.toString?.(),
            createdAt: e.createdAt?.toISOString?.(),
            updatedAt: e.updatedAt?.toISOString?.(),
            date: e.date?.toISOString?.(),
        }));

      //  return await Event.find({ _id: { $ne: event._id}, tags: { $in: event.tags } } ).lean();


    } catch {
        return [];
    }
}