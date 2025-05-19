import Link from 'next/link';
import './navbar.css';

const Navbar = () => {
    return (
        <nav className="navbar">
            <div className="navbarBrand">
                <Link href="/" className="brandLink">
                    Trail Tale
                </Link>
            </div>
            <div className="navbarMenu">
                <Link href="/gallery" className="navLinkButton">
                    Create Your Own Memory Wall
                </Link>
            </div>
        </nav>
    );
};

export default Navbar;