import React, { useEffect, useRef, useState } from 'react';
import { Button, Modal, message } from 'antd';
import { PlusOutlined, CheckOutlined } from '@ant-design/icons';
import YouTube from 'react-youtube';
import MovieService from '../services/MovieService';

const USER_EMAIL = 'plainUser@gmail.com';

function BigVideo() {
  const playerRef = useRef(null);
  const intersectionObserverRef = useRef(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalPlayer, setModalPlayer] = useState(null);
  const [isInMyList, setIsInMyList] = useState(false);
  const [addingToList, setAddingToList] = useState(false);
  const [heroMovieDbId, setHeroMovieDbId] = useState(null);
  const threshold = 0.5;

  const movieDetails = {
    title: 'Godzilla x Kong: The New Empire',
    description: 'The epic battle continues! Legends collide as Godzilla and Kong, the two most powerful forces of nature, clash in a spectacular battle for the ages. The initial confrontation between the two titans—instigated by unseen forces—is only the beginning of the mystery that lies deep within the core of the planet.',
    videoId: 'lV1OOlGwExM',
    year: '2024',
    rating: 'PG-13'
  };

  useEffect(() => {
    // Load the YouTube Player API script
    const script = document.createElement('script');
    script.src = 'https://www.youtube.com/iframe_api';
    document.body.appendChild(script);

    // Create a player instance when the API script is loaded
    let player;
    window.onYouTubeIframeAPIReady = () => {
      player = new window.YT.Player('player', {
        videoId: movieDetails.videoId,
        playerVars: {
          autoplay: 1,
          controls: 0,
          modestbranding: 1,
          loop: 1,
          playlist: movieDetails.videoId,
          mute: 1,
          disablekb: 1,
          fs: 0,
          rel: 0,
          showinfo: 0,
          iv_load_policy: 3,
          cc_load_policy: 0,
          autohide: 1,
        },
        events: {
          onReady: () => {
            // Sizing is now handled purely by CSS using object-fit cover tricks
            if (playerRef.current && typeof playerRef.current.playVideo === 'function') {
              playerRef.current.playVideo();
            }
          },
          onStateChange: (event) => {
            if (event.data === window.YT.PlayerState.ENDED) {
              player.playVideo();
            }
          },
        },
      });

      playerRef.current = player;

      intersectionObserverRef.current = new IntersectionObserver(
        ([entry]) => {
          if (entry.isIntersecting) {
            if (playerRef.current && typeof playerRef.current.playVideo === 'function') {
              playerRef.current.playVideo();
            }
          } else {
            if (playerRef.current && typeof playerRef.current.pauseVideo === 'function') {
              playerRef.current.pauseVideo();
            }
          }
        },
        { threshold }
      );

      intersectionObserverRef.current.observe(player.getIframe().parentElement);
    };

    return () => {
      if (playerRef.current) {
        playerRef.current.destroy();
      }
      if (intersectionObserverRef.current) {
        intersectionObserverRef.current.disconnect();
      }
      document.body.removeChild(script);
    };
  }, []);

  // Look up the hero movie's DB id so we can add it to the list
  useEffect(() => {
    const lookupMovie = async () => {
      try {
        const res = await MovieService.searchMovies(movieDetails.title);
        const movies = res.data.data.searchMovies;
        if (movies && movies.length > 0) {
          setHeroMovieDbId(movies[0].id);
          const check = await MovieService.checkInMyList(USER_EMAIL, movies[0].id);
          setIsInMyList(check.data.data.findMyListItem !== null);
        }
      } catch (err) {
        console.error('Error looking up hero movie:', err);
      }
    };
    lookupMovie();
  }, []);

  const handleAddToList = async () => {
    if (!heroMovieDbId) {
      message.warning('Movie not found in database');
      return;
    }
    setAddingToList(true);
    try {
      await MovieService.addToMyList(USER_EMAIL, heroMovieDbId);
      setIsInMyList(true);
      message.success('Added to My List!');
    } catch (error) {
      if (error.response?.data?.errors?.[0]?.message?.includes('already in list')) {
        setIsInMyList(true);
        message.info('Already in your list');
      } else {
        message.error('Failed to add to list');
      }
    } finally {
      setAddingToList(false);
    }
  };

  const handleVideoClick = () => {
    setIsModalOpen(true);
  };

  const handleModalClose = () => {
    if (modalPlayer) {
      modalPlayer.seekTo(0);
      modalPlayer.pauseVideo();
    }
    setIsModalOpen(false);
  };

  const onModalPlayerReady = (event) => {
    setModalPlayer(event.target);
  };

  return (
    <>
      <div className="video-container" onClick={handleVideoClick}>
        <div className="video-overlay"></div>
        <div className="text-container">
          <h1 className="hero-title">{movieDetails.title}</h1>
          <div className="hero-info">
            <span className="hero-year">{movieDetails.year}</span>
            <span className="hero-rating">{movieDetails.rating}</span>
          </div>
        </div>
        <div id="player" />
      </div>

      <Modal
        visible={isModalOpen}
        onCancel={handleModalClose}
        footer={null}
        width={1100}
        className="movie-details-modal"
        centered
      >
        <div className="modal-content-wrapper">
          <div className="modal-video-container">
            <YouTube
              videoId={movieDetails.videoId}
              onReady={onModalPlayerReady}
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
            <h2 className="modal-title">{movieDetails.title}</h2>
            <div className="modal-metadata">
              <span className="metadata-item">{movieDetails.year}</span>
              <span className="metadata-separator">•</span>
              <span className="metadata-item">{movieDetails.rating}</span>
            </div>
            <p className="modal-description">{movieDetails.description}</p>
            <div style={{ marginTop: '20px' }}>
              <Button
                type="primary"
                size="large"
                icon={isInMyList ? <CheckOutlined /> : <PlusOutlined />}
                disabled={isInMyList || !heroMovieDbId}
                loading={addingToList}
                onClick={handleAddToList}
                style={{
                  backgroundColor: isInMyList ? '#333' : '#e50914',
                  borderColor: isInMyList ? '#333' : '#e50914',
                  fontWeight: 600,
                }}
              >
                {isInMyList ? 'In My List' : 'Add to My List'}
              </Button>
            </div>
          </div>
        </div>
      </Modal>
    </>
  );
}

export default BigVideo;
