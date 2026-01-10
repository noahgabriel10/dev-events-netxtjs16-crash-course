'use client';

import Link from "next/link";
import Image from "next/image";
import posthog from "posthog-js";

const Navbar = () => {
    const handleLogoClick = () => {
        posthog.capture('logo_clicked', {
            navigation_source: 'navbar',
        });
    };

    const handleNavClick = (linkName: string) => {
        posthog.capture(`navbar_${linkName}_clicked`, {
            navigation_source: 'navbar',
            link_name: linkName,
        });
    };

    return (
        <header>
            <nav>
                <Link href='/' className="logo" onClick={handleLogoClick}>
                    <Image src="/icons/logo.png" alt="logo" width={24} height={24} />
                    <p>DevEvent</p>
                </Link>


                <ul>
                    <Link href="/" onClick={() => handleNavClick('home')}>Home</Link>
                    <Link href="/" onClick={() => handleNavClick('events')}>Events</Link>
                    <Link href="/" onClick={() => handleNavClick('create_event')}>Create Event</Link>
                </ul>
            </nav>
        </header>
    )
}
export default Navbar
