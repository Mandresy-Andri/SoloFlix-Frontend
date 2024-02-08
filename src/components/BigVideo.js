import React, { useEffect, useRef } from 'react';

function BigVideo() {
  const playerRef = useRef(null);
  const intersectionObserverRef = useRef(null);
  const threshold = 0.5;

  useEffect(() => {
    // Load the YouTube Player API script
    const script = document.createElement('script');
    script.src = 'https://www.youtube.com/iframe_api';
    document.body.appendChild(script);

    // Create a player instance when the API script is loaded
    let player;
    window.onYouTubeIframeAPIReady = () => {
      player = new window.YT.Player('player', {
        videoId: 'lV1OOlGwExM', // Replace with your YouTube video ID
        playerVars: {
          autoplay: 1, // Play the video automatically
          controls: 0, // Hide the video controls
          modestbranding: 1, // Hide the YouTube logo
          loop: 1, // Loop the video
          playlist: 'lV1OOlGwExM', // Repeat the video
          mute: 0, // Mute the video
          disablekb: 1, // Disable keyboard controls
          enablejsapi: 0, // Disable interaction through JavaScript
        },
        events: {
          onReady: () => {
            // Resize the video player to cover the whole screen
            player.setSize(window.innerWidth-50, window.innerHeight-100);
            if (playerRef.current && typeof playerRef.current.playVideo === 'function') {
              playerRef.current.playVideo();
            }
          },
          onStateChange: (event) => {
            // Loop the video when it ends
            if (event.data === window.YT.PlayerState.ENDED) {
              player.playVideo();
            }
          },
        },
      });

      // Save the player instance to the ref
      playerRef.current = player;

      // Create an IntersectionObserver to monitor the video element
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

      // Start observing the video element
      intersectionObserverRef.current.observe(player.getIframe());
    };

    // Cleanup when the component is unmounted
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

  return (
    <div className="video-container">
      <div className="text-container">
        <h1>Godzilla x Kong<br></br><br></br>The New Empire</h1>
      </div>
      <div id="player" />
    </div>
  );
}

export default BigVideo;
