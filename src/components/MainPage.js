import { useNavigate } from 'react-router-dom';
import { useEffect, useState } from "react";
import BigVideo from "./BigVideo";
import NavigationBar from '../components/NavigationBar'
import MovieCarousel from "./MovieCarousel";

function MainPage() {
  const navigate = useNavigate();
  const [authenticated, setAuthenticated] = useState(false);

  useEffect(() => {
    const accessToken = localStorage.getItem('access_token');
    if (!accessToken) {
      setAuthenticated(false);
      navigate('/login');
    } else {
      setAuthenticated(true);
    }
  }, [navigate]);

  if (!authenticated) {
    return null;
  }

  return (
    <div>
      <NavigationBar/>
      <ul><BigVideo/></ul>
      <h1>Trending</h1>
      <ul><MovieCarousel title="trendingMovies"/></ul>
      <h1>Popular</h1>
      <ul><MovieCarousel title="popularMovies"/></ul>
      <h1>Top Rated</h1>
      <ul><MovieCarousel title="topRatedMovies"/></ul>
      <h1>Romantic </h1>
      <ul><MovieCarousel title="romanceMovies"/></ul>
    </div>
  );
}

export default MainPage;
