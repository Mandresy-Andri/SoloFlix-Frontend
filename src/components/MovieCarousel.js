import React, { useEffect, useState} from 'react';
import Slider from 'react-slick';
import { Button, Modal } from 'antd';
import MovieService from '../services/MovieService'
import YouTube from 'react-youtube';

import 'slick-carousel/slick/slick.css';
import 'slick-carousel/slick/slick-theme.css';

const MovieCarousel = (title) => {
  const [player, setPlayer] = useState(null);
  const [movies, setMovies] = useState([]);
  const [selectedMovie, setSelectedMovie] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  useEffect(() => {
    const fetchMovies = async () => {
      const res = await MovieService.getCarouselMovies(title);
      const data = res.data.data;
      const movieList = Object.values(data)[0];
      setMovies(movieList.reverse());
    };
    
    fetchMovies();
  }, [title]);


  const settings = {
    swipeToSlide: false,
    dots: false,
    draggable: false,
    swipe: false,
    touchMove: false,
    focusOnSelect: false,
    infinite: true,
    speed: 750,
    slidesToShow: 6,
    slidesToScroll: 6,
    autoplay: false,
    cssEase: 'linear',
  };

  const handleMovieClick = (movie) => {
    setSelectedMovie(movie);
    setIsModalOpen(true);
  };

  const handleModalClose = () => {
    if (player) {
      player.seekTo(0);
      player.pauseVideo();
    }
    setSelectedMovie(null);
    setIsModalOpen(false);
  };
  
  

  const onReady = (event) => {
    setPlayer(event.target);
  };

  return (
    <>
      <div className="movie-carousel-container">
        <Slider {...settings}>
          {movies.map((movie) => (
            movie && movie.movie && movie.movie.id ? (
              <div key={movie.movie.id}>
                <div className="image-wrapper" onClick={() => handleMovieClick(movie)}>
                  <div className="movie-card">
                    <img src={movie.movie.image} alt={movie.movie.title} />
                    <div className="movie-info">
                      <h3>{movie.movie.title}</h3>
                    </div>
                  </div>
                </div>
              </div>
            ) : null
          ))}
        </Slider>
      </div>
      <Modal
        visible={isModalOpen}
        onCancel={handleModalClose}
        footer={null}
        width={1100}
        className="movie-details-modal"
        centered
      >
        {selectedMovie && selectedMovie.movie ? (
          <div className="modal-content-wrapper">
            <div className="modal-video-container">
              <YouTube
                videoId={selectedMovie.movie.video ? selectedMovie.movie.video.split("=")[1] : ''}
                onReady={onReady}
                opts={{
                  width: '100%',
                  height: '600',
                  playerVars: {
                    autoplay: 1,
                    controls: 1,
                    modestbranding: 1,
                    rel: 0,
                  },
                }}
              />
            </div>
            <div className="modal-details">
              <h2 className="modal-title">{selectedMovie.movie.title}</h2>
              {selectedMovie.movie.year && (
                <div className="modal-metadata">
                  <span className="metadata-item">{selectedMovie.movie.year}</span>
                  {selectedMovie.movie.rating && (
                    <>
                      <span className="metadata-separator">•</span>
                      <span className="metadata-item">{selectedMovie.movie.rating}</span>
                    </>
                  )}
                </div>
              )}
              <p className="modal-description">{selectedMovie.movie.description}</p>
            </div>
          </div>
        ) : null}
      </Modal>
    </>
  );
};

export default MovieCarousel;
