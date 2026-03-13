import { useState, useEffect, useRef, useCallback } from 'react';
import Container from 'react-bootstrap/Container';
import Nav from 'react-bootstrap/Nav';
import Navbar from 'react-bootstrap/Navbar';
import SoloFlix from '../img/SoloFlix.png';
import userIcon from '../img/userIcon.png';
import NavDropdown from 'react-bootstrap/NavDropdown';
import Logout from '../components/Logout';
import { AutoComplete, Input, Modal, Button, Spin, Checkbox, message } from 'antd';
import { SearchOutlined, DatabaseOutlined, CloudOutlined, PlusOutlined, CheckOutlined } from '@ant-design/icons';
import MovieService from '../services/MovieService';
import YouTube from 'react-youtube';

function NavigationBar() {
  const [navbarBackground, setNavbarBackground] = useState('transparent');
  const [searchValue, setSearchValue] = useState('');
  const [searchOptions, setSearchOptions] = useState([]);
  const [selectedSearchMovie, setSelectedSearchMovie] = useState(null);
  const [isSearchModalOpen, setIsSearchModalOpen] = useState(false);
  const [searchPlayer, setSearchPlayer] = useState(null);
  const [searching, setSearching] = useState(false);
  const [lastSearchQuery, setLastSearchQuery] = useState('');
  const [showApiPrompt, setShowApiPrompt] = useState(false);
  const [searchSource, setSearchSource] = useState(null); // 'db' or 'api'
  const [tmdbResults, setTmdbResults] = useState([]);
  const [showSelectionModal, setShowSelectionModal] = useState(false);
  const [selectedMovies, setSelectedMovies] = useState([]);
  const [cachingMovies, setCachingMovies] = useState(false);
  const [isInMyList, setIsInMyList] = useState(false);
  const [addingToList, setAddingToList] = useState(false);
  const debounceTimer = useRef(null);

  const USER_EMAIL = 'plainUser@gmail.com';

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

  const formatOptions = (movies, source) => {
    return movies.slice(0, 8).map(movie => ({
      value: movie.title,
      label: (
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '4px 0' }}>
          <img
            src={movie.image}
            alt={movie.title}
            style={{ width: '35px', height: '52px', objectFit: 'cover', borderRadius: '3px' }}
          />
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 600, color: '#fff' }}>{movie.title}</div>
            <div style={{ fontSize: '12px', color: '#999' }}>
              {movie.date?.substring(0, 4)} &bull; {movie.rating?.toFixed(1)}/10
            </div>
          </div>
          {source && (
            <div style={{ fontSize: '11px', color: '#666', display: 'flex', alignItems: 'center', gap: '4px' }}>
              {source === 'db' ? <DatabaseOutlined /> : <CloudOutlined />}
              {source === 'db' ? 'Cache' : 'TMDB'}
            </div>
          )}
        </div>
      ),
      movie: movie,
    }));
  };

  const searchDatabase = async (value) => {
    try {
      const response = await MovieService.searchMoviesInDatabase(value);
      const movies = response.data.data.searchMoviesInDatabase || [];
      return movies;
    } catch (error) {
      console.error('Database search error:', error);
      return [];
    }
  };

  const searchTMDB = async (value) => {
    try {
      const response = await MovieService.searchMovies(value);
      // Check for GraphQL errors
      if (response.data.errors) {
        console.error('GraphQL errors:', response.data.errors);
      }
      const data = response.data.data;
      if (!data || !data.searchMovies) {
        console.error('No data in TMDB response:', response.data);
        return [];
      }
      // Filter out any null entries from the results
      return data.searchMovies.filter(movie => movie !== null);
    } catch (error) {
      console.error('TMDB search error:', error);
      return [];
    }
  };

  const doSearch = useCallback(async (value) => {
    if (value.length < 2) {
      setSearchOptions([]);
      setSearchSource(null);
      setSearching(false);
      return;
    }

    setSearching(true);
    setLastSearchQuery(value);
    setSearchSource(null);

    try {
      // First, search database
      const dbResults = await searchDatabase(value);

      if (dbResults.length > 0) {
        // Found in database
        setSearchOptions(formatOptions(dbResults, 'db'));
        setSearchSource('db');
      } else {
        // Not found in database - prompt user
        setSearchOptions([]);
        setShowApiPrompt(true);
      }
    } catch (error) {
      console.error('Search error:', error);
      setSearchOptions([]);
    } finally {
      setSearching(false);
    }
  }, []);

  const handleSearchTMDB = async () => {
    setShowApiPrompt(false);
    setSearching(true);

    try {
      const apiResults = await searchTMDB(lastSearchQuery);

      if (apiResults.length > 0) {
        setTmdbResults(apiResults);
        setShowSelectionModal(true);
      } else {
        Modal.info({
          title: <span style={{ color: '#fff' }}>No Results</span>,
          content: (
            <p style={{ color: '#d1d1d1', marginTop: '10px' }}>
              No results found for <strong style={{ color: '#fff' }}>"{lastSearchQuery}"</strong> on TMDB.
            </p>
          ),
          className: 'movie-details-modal',
          centered: true,
          okButtonProps: { style: { backgroundColor: '#e50914', borderColor: '#e50914' } },
        });
      }
    } catch (error) {
      console.error('TMDB search error:', error);
      message.error('Failed to search TMDB');
    } finally {
      setSearching(false);
    }
  };

  const handleCacheSelectedMovies = async () => {
    if (selectedMovies.length === 0) {
      message.warning('Please select at least one movie to cache');
      return;
    }

    setCachingMovies(true);
    try {
      const cachePromises = selectedMovies.map(movieId =>
        MovieService.cacheMovie(movieId)
          .then(res => res.data.data.cacheMovie)
          .catch(err => {
            console.error(`Failed to cache movie ${movieId}:`, err);
            return null;
          })
      );
      const results = await Promise.all(cachePromises);

      // Filter out null results
      const successCount = results.filter(movie => movie !== null).length;
      const failCount = results.length - successCount;

      if (successCount > 0) {
        message.success(`Successfully cached ${successCount} movie(s)${failCount > 0 ? ` (${failCount} failed)` : ''}`);
      } else {
        message.error('Failed to cache movies - they may not have trailers available');
      }

      setShowSelectionModal(false);
      setSelectedMovies([]);
      setTmdbResults([]);

      // Refresh search to show newly cached movies
      const dbResults = await searchDatabase(lastSearchQuery);
      if (dbResults.length > 0) {
        setSearchOptions(formatOptions(dbResults, 'db'));
        setSearchSource('db');
      }
    } catch (error) {
      console.error('Caching error:', error);
      message.error('Failed to cache movies');
    } finally {
      setCachingMovies(false);
    }
  };

  const handleSearch = (value) => {
    setSearchValue(value);
    if (debounceTimer.current) clearTimeout(debounceTimer.current);
    debounceTimer.current = setTimeout(() => doSearch(value), 300);
  };

  const handleSelect = async (value, option) => {
    setSelectedSearchMovie(option.movie);
    setIsSearchModalOpen(true);
    setSearchValue('');
    setSearchOptions([]);
    setShowApiPrompt(false);
    setSearchSource(null);
    setIsInMyList(false);

    // Check if movie is already in My List
    if (option.movie && option.movie.id) {
      try {
        const res = await MovieService.checkInMyList(USER_EMAIL, option.movie.id);
        setIsInMyList(res.data.data.findMyListItem !== null);
      } catch (err) {
        console.error('Error checking list:', err);
      }
    }
  };

  const handleAddToList = async () => {
    if (!selectedSearchMovie) return;
    setAddingToList(true);
    try {
      await MovieService.addToMyList(USER_EMAIL, selectedSearchMovie.id);
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

  const handleSearchModalClose = () => {
    if (searchPlayer) {
      searchPlayer.seekTo(0);
      searchPlayer.pauseVideo();
    }
    setIsSearchModalOpen(false);
    setSelectedSearchMovie(null);
  };

  const notFoundOptions = searching ? [] : [
    {
      value: 'no-results',
      label: (
        <div style={{ padding: '12px 0', textAlign: 'center', color: '#999' }}>
          {searching ? (
            <div><Spin size="small" /> Searching...</div>
          ) : (
            <div>No results found in database</div>
          )}
        </div>
      ),
      disabled: true,
    }
  ];

  return (
    <>
      <Navbar collapseOnSelect expand="lg" variant="dark" style={{ backgroundColor: navbarBackground, transition: 'background-color 0.3s ease' }} className="fixed-top">
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
              <Nav.Link href="/" style={{ color: '#fff', fontSize: '1.2rem', fontWeight: 'bold'}}>Home</Nav.Link>
              <Nav.Link href="/mylist" style={{ color: '#fff', fontSize: '1.2rem', fontWeight: 'bold'}}>My List</Nav.Link>
            </Nav>
            <Nav style={{ alignItems: 'center', gap: '15px' }}>
              <AutoComplete
                value={searchValue}
                options={searchOptions.length > 0 ? searchOptions : (searchValue.length >= 2 && !searching ? notFoundOptions : [])}
                onSearch={handleSearch}
                onSelect={handleSelect}
                style={{ width: 280 }}
                popupClassName="search-dropdown"
              >
                <Input
                  prefix={searching ? <Spin size="small" /> : <SearchOutlined style={{ color: '#999' }} />}
                  placeholder="Search movies..."
                  className="navbar-search-input"
                  allowClear
                />
              </AutoComplete>
              <NavDropdown
              title={<img src={userIcon} alt="User Icon"  width="50rem" height="50rem" className="align-top" style={{ marginTop: '-10px' }}/> }
              id="basic-nav-dropdown">
                <NavDropdown.Item>
                <Logout/>
                </NavDropdown.Item>
              </NavDropdown>
            </Nav>
          </Navbar.Collapse>
        </Container>
      </Navbar>

      {/* Search Result Modal */}
      <Modal
        visible={isSearchModalOpen}
        onCancel={handleSearchModalClose}
        footer={null}
        width={1100}
        className="movie-details-modal"
        centered
      >
        {selectedSearchMovie ? (
          <div className="modal-content-wrapper">
            <div className="modal-video-container">
              <YouTube
                videoId={selectedSearchMovie.video ? selectedSearchMovie.video.split("=")[1] : ''}
                onReady={(e) => setSearchPlayer(e.target)}
                opts={{
                  width: '100%',
                  height: '600',
                  playerVars: { autoplay: 1, controls: 1, modestbranding: 1, rel: 0 },
                }}
              />
            </div>
            <div className="modal-details">
              <h2 className="modal-title">{selectedSearchMovie.title}</h2>
              <div className="modal-metadata">
                <span className="metadata-item">{selectedSearchMovie.date?.substring(0, 4)}</span>
                <span className="metadata-separator">&bull;</span>
                <span className="metadata-item">{selectedSearchMovie.rating?.toFixed(1)}/10</span>
              </div>
              <p className="modal-description">{selectedSearchMovie.description}</p>
              <div style={{ marginTop: '20px' }}>
                <Button
                  type="primary"
                  size="large"
                  icon={isInMyList ? <CheckOutlined /> : <PlusOutlined />}
                  disabled={isInMyList}
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
        ) : null}
      </Modal>

      {/* API Search Prompt Modal */}
      <Modal
        visible={showApiPrompt}
        title={<span style={{ color: '#fff' }}>No Results Found</span>}
        onCancel={() => setShowApiPrompt(false)}
        className="movie-details-modal"
        centered
        footer={[
          <Button key="cancel" onClick={() => setShowApiPrompt(false)} style={{ backgroundColor: '#333', borderColor: '#555', color: '#fff' }}>
            Cancel
          </Button>,
          <Button
            key="search"
            type="primary"
            onClick={handleSearchTMDB}
            loading={searching}
            style={{ backgroundColor: '#e50914', borderColor: '#e50914' }}
            icon={<CloudOutlined />}
          >
            Search TMDB API
          </Button>,
        ]}
      >
        <div style={{ color: '#d1d1d1', padding: '20px 0' }}>
          <p style={{ fontSize: '16px', marginBottom: '16px' }}>
            No results found for <strong style={{ color: '#fff' }}>"{lastSearchQuery}"</strong> in the local database cache.
          </p>
          <p style={{ fontSize: '14px', color: '#999', marginBottom: 0 }}>
            Would you like to search the TMDB API? You'll be able to choose which movies to cache.
          </p>
        </div>
      </Modal>

      {/* TMDB Results Selection Modal */}
      <Modal
        visible={showSelectionModal}
        title={<span style={{ color: '#fff' }}>Select Movies to Cache</span>}
        onCancel={() => {
          setShowSelectionModal(false);
          setSelectedMovies([]);
          setTmdbResults([]);
        }}
        className="movie-details-modal"
        centered
        width={900}
        footer={[
          <Button
            key="cancel"
            onClick={() => {
              setShowSelectionModal(false);
              setSelectedMovies([]);
              setTmdbResults([]);
            }}
            style={{ backgroundColor: '#333', borderColor: '#555', color: '#fff' }}
          >
            Cancel
          </Button>,
          <Button
            key="cache"
            type="primary"
            onClick={handleCacheSelectedMovies}
            loading={cachingMovies}
            disabled={selectedMovies.length === 0}
            style={{ backgroundColor: '#e50914', borderColor: '#e50914' }}
            icon={<DatabaseOutlined />}
          >
            Cache Selected ({selectedMovies.length})
          </Button>,
        ]}
      >
        <div style={{ color: '#d1d1d1', padding: '20px 0', maxHeight: '500px', overflowY: 'auto' }}>
          <p style={{ fontSize: '14px', color: '#999', marginBottom: '20px' }}>
            Found {tmdbResults.length} result(s) from TMDB. Select which movies you want to save to your local database:
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {tmdbResults.map(movie => (
              <div
                key={movie.reference}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '15px',
                  padding: '12px',
                  background: '#2a2a2a',
                  borderRadius: '6px',
                  border: selectedMovies.includes(movie.reference) ? '2px solid #e50914' : '2px solid transparent',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                }}
                onClick={() => {
                  setSelectedMovies(prev =>
                    prev.includes(movie.reference)
                      ? prev.filter(ref => ref !== movie.reference)
                      : [...prev, movie.reference]
                  );
                }}
              >
                <Checkbox
                  checked={selectedMovies.includes(movie.reference)}
                  onChange={(e) => {
                    if (e.target.checked) {
                      setSelectedMovies(prev => [...prev, movie.reference]);
                    } else {
                      setSelectedMovies(prev => prev.filter(ref => ref !== movie.reference));
                    }
                  }}
                />
                <img
                  src={movie.image}
                  alt={movie.title}
                  style={{ width: '50px', height: '75px', objectFit: 'cover', borderRadius: '4px' }}
                />
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 600, color: '#fff', marginBottom: '4px' }}>
                    {movie.title}
                  </div>
                  <div style={{ fontSize: '12px', color: '#999' }}>
                    {movie.date?.substring(0, 4)} • {movie.rating?.toFixed(1)}/10
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </Modal>
    </>
  );
}

export default NavigationBar;
