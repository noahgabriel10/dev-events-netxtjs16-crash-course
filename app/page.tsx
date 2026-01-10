import ExploreBtn from "@/components/ExploreBtn";
import EventCard from "@/components/EventCard";
import events from "@/lib/constants";



const Page = () => {
    return (
        <section>
            <h1 className="text-center">The Hub for Every Dev <br /> Event You Can't Miss </h1>
            <p className="text-center mt-5">Hackathons, Meetups and Conferences, All in One Place</p>

            <ExploreBtn />

            <div className="mt-20 space-y-7">
                <h3>Featured Events</h3>

                <ol className="events">
                    {events.map((event) => (
                        <li key={event.title}>
                            <EventCard {...event} />
                        </li>
                    ))}
                </ol>
            </div>
        </section>
    )
}
export default Page

// 1:52:57 Sekunden Course -> https://www.youtube.com/watch?v=I1V9YWqRIeI