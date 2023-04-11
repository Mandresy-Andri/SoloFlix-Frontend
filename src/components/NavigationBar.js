import { useState, useEffect } from 'react';
import Container from 'react-bootstrap/Container';
import Nav from 'react-bootstrap/Nav';
import Navbar from 'react-bootstrap/Navbar';
import SoloFlix from '../img/SoloFlix.png';
import userIcon from '../img/userIcon.png';
import NavDropdown from 'react-bootstrap/NavDropdown';
import Logout from '../components/Logout';

function NavigationBar() {
  const [navbarBackground, setNavbarBackground] = useState('transparent');

  useEffect(() => {
    const handleScroll = () => {
      const showBackground = window.scrollY > 0;
      if (showBackground) {
        setNavbarBackground('#000000');
      } else {
        setNavbarBackground('transparent');
      }
    };

    document.addEventListener('scroll', handleScroll);

    return () => {
      document.removeEventListener('scroll', handleScroll);
    };
  }, []);

  return (
    <Navbar collapseOnSelect expand="lg" variant="dark" style={{ backgroundColor: navbarBackground }} className="sticky-top">
      <Container>
        <Navbar.Brand href="/">
        <img src={SoloFlix} 
              width="100%"
              height="40"
              className="d-inline-block align-top" alt="Logo" />
        </Navbar.Brand>
        <Navbar.Toggle aria-controls="responsive-navbar-nav" />
        <Navbar.Collapse id="responsive-navbar-nav">
          <Nav className="me-auto">
            <Nav.Link href="/">Home</Nav.Link>
            <Nav.Link href="/mylist">My List</Nav.Link>
          </Nav>
          <Nav>
            {/*<Nav.Link href="#deets">Search</Nav.Link>*/}
            <NavDropdown 
            title={<img src={userIcon} alt="User Icon"  width="50rem" height="50rem" className="align-top" style={{ marginTop: '-10px' }}/> } 
            id="basic-nav-dropdown">
              <NavDropdown.Item>Profile</NavDropdown.Item>
              <NavDropdown.Item>
              <Logout/>
              </NavDropdown.Item>
            </NavDropdown>
          </Nav>
        </Navbar.Collapse>
      </Container>
    </Navbar>
  );
}

export default NavigationBar;