import React, { useEffect, useRef, useState } from 'react';
import { Button, Modal } from 'antd';
import YouTube from 'react-youtube';

function BigVideo() {
  const playerRef = useRef(null);
  const intersectionObserverRef = useRef(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalPlayer, setModalPlayer] = useState(null);
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
            player.setSize(window.innerWidth-50, window.innerHeight-100);
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

      intersectionObserverRef.current.observe(player.getIframe());
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
          </div>
        </div>
      </Modal>
    </>
  );
}

export default BigVideo;
