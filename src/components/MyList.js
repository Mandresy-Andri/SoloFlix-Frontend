import { useNavigate } from 'react-router-dom';
import { useEffect, useState, useCallback } from "react";
import NavigationBar from '../components/NavigationBar';
import MovieService from '../services/MovieService';
import { Modal, Select, Rate, Switch, Radio, Input, message, Spin, Empty } from 'antd';
import { EditOutlined, DeleteOutlined, CheckCircleFilled, EyeOutlined, EyeInvisibleOutlined, LikeFilled, DislikeFilled } from '@ant-design/icons';
import YouTube from 'react-youtube';

const { TextArea } = Input;
const { Option } = Select;

const USER_EMAIL = 'plainUser@gmail.com';

function MyList() {
    const navigate = useNavigate();
    const [authenticated, setAuthenticated] = useState(false);
    const [myListItems, setMyListItems] = useState([]);
    const [filteredItems, setFilteredItems] = useState([]);
    const [loading, setLoading] = useState(true);

    // Video modal
    const [selectedItem, setSelectedItem] = useState(null);
    const [isVideoModalOpen, setIsVideoModalOpen] = useState(false);
    const [videoPlayer, setVideoPlayer] = useState(null);

    // Edit modal
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [editNotes, setEditNotes] = useState('');
    const [editUserRating, setEditUserRating] = useState(0);
    const [editWatched, setEditWatched] = useState(false);
    const [editRecommended, setEditRecommended] = useState(null);

    // Filters / sort
    const [sortBy, setSortBy] = useState('dateAdded');
    const [filterWatched, setFilterWatched] = useState('all');
    const [filterRecommended, setFilterRecommended] = useState('all');

    const loadMyList = useCallback(async () => {
        setLoading(true);
        try {
            const response = await MovieService.getMyList(USER_EMAIL);
            const items = response.data.data.findMyListByUserEmail || [];
            setMyListItems(items);
        } catch (error) {
            console.error('Error loading MyList:', error);
            message.error('Failed to load your list');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        const accessToken = localStorage.getItem('access_token');
        if (!accessToken) {
            setAuthenticated(false);
            navigate('/login');
        } else {
            setAuthenticated(true);
            loadMyList();
        }
    }, [navigate, loadMyList]);

    // Apply filters and sorting
    useEffect(() => {
        let filtered = [...myListItems];

        if (filterWatched === 'watched') {
            filtered = filtered.filter(item => item.watched === true);
        } else if (filterWatched === 'unwatched') {
            filtered = filtered.filter(item => item.watched === false);
        }

        if (filterRecommended === 'recommended') {
            filtered = filtered.filter(item => item.recommended === true);
        } else if (filterRecommended === 'not-recommended') {
            filtered = filtered.filter(item => item.recommended === false);
        } else if (filterRecommended === 'no-opinion') {
            filtered = filtered.filter(item => item.recommended === null);
        }

        filtered.sort((a, b) => {
            switch (sortBy) {
                case 'title':
                    return (a.movie.title || '').localeCompare(b.movie.title || '');
                case 'tmdbRating':
                    return (b.movie.rating || 0) - (a.movie.rating || 0);
                case 'userRating':
                    return (b.userRating || 0) - (a.userRating || 0);
                case 'dateAdded':
                default:
                    return new Date(b.dateAdded) - new Date(a.dateAdded);
            }
        });

        setFilteredItems(filtered);
    }, [myListItems, sortBy, filterWatched, filterRecommended]);

    const handleMovieClick = (item) => {
        setSelectedItem(item);
        setIsVideoModalOpen(true);
    };

    const handleVideoModalClose = () => {
        if (videoPlayer) {
            videoPlayer.seekTo(0);
            videoPlayer.pauseVideo();
        }
        setIsVideoModalOpen(false);
    };

    const handleEditClick = (e, item) => {
        e.stopPropagation();
        setSelectedItem(item);
        setEditNotes(item.notes || '');
        setEditUserRating(item.userRating || 0);
        setEditWatched(item.watched);
        setEditRecommended(item.recommended);
        setIsEditModalOpen(true);
    };

    const handleSaveEdit = async () => {
        try {
            await MovieService.updateMyListItem(selectedItem.id, {
                notes: editNotes,
                userRating: editUserRating || 0,
                watched: editWatched,
                recommended: editRecommended
            });
            message.success('Updated successfully');
            setIsEditModalOpen(false);
            loadMyList();
        } catch (error) {
            console.error('Error updating item:', error);
            message.error('Failed to update');
        }
    };

    const handleDelete = async (e, id) => {
        e.stopPropagation();
        try {
            await MovieService.removeFromMyList(id);
            message.success('Removed from your list');
            loadMyList();
        } catch (error) {
            console.error('Error removing item:', error);
            message.error('Failed to remove');
        }
    };

    const handleToggleWatched = async (e, id) => {
        e.stopPropagation();
        try {
            await MovieService.toggleWatched(id);
            loadMyList();
        } catch (error) {
            console.error('Error toggling watched:', error);
        }
    };

    if (!authenticated) {
        return null;
    }

    return (
        <>
            <NavigationBar />
            <div className="mylist-page">
                <h1 className="mylist-heading">My List</h1>

                {/* Filter / Sort Controls */}
                <div className="mylist-controls">
                    <div className="control-group">
                        <label>Sort by</label>
                        <Select value={sortBy} onChange={setSortBy} style={{ width: 150 }}
                            dropdownStyle={{ backgroundColor: '#1a1a1a' }}>
                            <Option value="dateAdded">Date Added</Option>
                            <Option value="title">Title</Option>
                            <Option value="tmdbRating">TMDB Rating</Option>
                            <Option value="userRating">My Rating</Option>
                        </Select>
                    </div>
                    <div className="control-group">
                        <label>Watched</label>
                        <Select value={filterWatched} onChange={setFilterWatched} style={{ width: 130 }}
                            dropdownStyle={{ backgroundColor: '#1a1a1a' }}>
                            <Option value="all">All</Option>
                            <Option value="watched">Watched</Option>
                            <Option value="unwatched">Unwatched</Option>
                        </Select>
                    </div>
                    <div className="control-group">
                        <label>Recommended</label>
                        <Select value={filterRecommended} onChange={setFilterRecommended} style={{ width: 160 }}
                            dropdownStyle={{ backgroundColor: '#1a1a1a' }}>
                            <Option value="all">All</Option>
                            <Option value="recommended">Recommended</Option>
                            <Option value="not-recommended">Not Recommended</Option>
                            <Option value="no-opinion">No Opinion</Option>
                        </Select>
                    </div>
                </div>

                {/* Movie Grid */}
                {loading ? (
                    <div style={{ textAlign: 'center', padding: '80px 0' }}>
                        <Spin size="large" />
                    </div>
                ) : filteredItems.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '80px 0' }}>
                        <Empty description={<span style={{ color: '#888' }}>
                            {myListItems.length === 0 ? 'Your list is empty — add movies from the home page!' : 'No movies match your filters'}
                        </span>} />
                    </div>
                ) : (
                    <div className="mylist-grid">
                        {filteredItems.map(item => (
                            <div key={item.id} className="mylist-card">
                                <div className="mylist-card-poster" onClick={() => handleMovieClick(item)}>
                                    <img src={item.movie.image} alt={item.movie.title} />
                                    {item.watched && (
                                        <div className="watched-badge">
                                            <CheckCircleFilled />
                                        </div>
                                    )}
                                    {item.recommended === true && (
                                        <div className="recommend-badge recommend-yes"><LikeFilled /></div>
                                    )}
                                    {item.recommended === false && (
                                        <div className="recommend-badge recommend-no"><DislikeFilled /></div>
                                    )}
                                </div>
                                <div className="mylist-card-info">
                                    <h3 className="mylist-card-title">{item.movie.title}</h3>
                                    <div className="mylist-card-ratings">
                                        <span className="tmdb-rating">TMDB {item.movie.rating?.toFixed(1)}</span>
                                        {item.userRating > 0 && (
                                            <span className="user-rating">Mine {item.userRating}/10</span>
                                        )}
                                    </div>
                                    <div className="mylist-card-actions">
                                        <button className="action-btn" title={item.watched ? 'Mark unwatched' : 'Mark watched'}
                                            onClick={(e) => handleToggleWatched(e, item.id)}>
                                            {item.watched ? <EyeOutlined /> : <EyeInvisibleOutlined />}
                                        </button>
                                        <button className="action-btn" title="Edit" onClick={(e) => handleEditClick(e, item)}>
                                            <EditOutlined />
                                        </button>
                                        <button className="action-btn action-btn-danger" title="Remove" onClick={(e) => handleDelete(e, item.id)}>
                                            <DeleteOutlined />
                                        </button>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Video Modal */}
            <Modal
                visible={isVideoModalOpen}
                onCancel={handleVideoModalClose}
                footer={null}
                width={1100}
                className="movie-details-modal"
                centered
            >
                {selectedItem && selectedItem.movie ? (
                    <div className="modal-content-wrapper">
                        <div className="modal-video-container">
                            <YouTube
                                videoId={selectedItem.movie.video ? selectedItem.movie.video.split("=")[1] : ''}
                                onReady={(e) => setVideoPlayer(e.target)}
                                opts={{
                                    width: '100%',
                                    height: '600',
                                    playerVars: { autoplay: 1, controls: 1, modestbranding: 1, rel: 0 },
                                }}
                            />
                        </div>
                        <div className="modal-details">
                            <h2 className="modal-title">{selectedItem.movie.title}</h2>
                            <div className="modal-metadata">
                                <span className="metadata-item">{selectedItem.movie.date?.substring(0, 4)}</span>
                                <span className="metadata-separator">&bull;</span>
                                <span className="metadata-item">{selectedItem.movie.rating}/10</span>
                                {selectedItem.userRating > 0 && (
                                    <>
                                        <span className="metadata-separator">&bull;</span>
                                        <span className="metadata-item">My Rating: {selectedItem.userRating}/10</span>
                                    </>
                                )}
                            </div>
                            <p className="modal-description">{selectedItem.movie.description}</p>
                            {selectedItem.notes && (
                                <div style={{ marginTop: '20px', borderTop: '1px solid #333', paddingTop: '15px' }}>
                                    <h3 style={{ color: '#fff', fontSize: '1.1rem', marginBottom: '8px' }}>My Notes</h3>
                                    <p style={{ color: '#d1d1d1', whiteSpace: 'pre-wrap' }}>{selectedItem.notes}</p>
                                </div>
                            )}
                        </div>
                    </div>
                ) : null}
            </Modal>

            {/* Edit Modal */}
            <Modal
                visible={isEditModalOpen}
                title={<span style={{ color: '#fff' }}>Edit — {selectedItem?.movie?.title}</span>}
                onCancel={() => setIsEditModalOpen(false)}
                onOk={handleSaveEdit}
                okText="Save"
                className="movie-details-modal"
                width={600}
            >
                <div className="edit-modal-body">
                    <div className="edit-field">
                        <label>Notes</label>
                        <TextArea
                            rows={4}
                            value={editNotes}
                            onChange={(e) => setEditNotes(e.target.value)}
                            placeholder="Add your notes about this movie..."
                            style={{ backgroundColor: '#2a2a2a', color: '#fff', borderColor: '#444' }}
                        />
                    </div>

                    <div className="edit-field">
                        <label>My Rating</label>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                            <Rate
                                count={10}
                                value={editUserRating}
                                onChange={setEditUserRating}
                                style={{ fontSize: '20px' }}
                            />
                            <span style={{ color: '#fff', fontSize: '16px', fontWeight: 600 }}>{editUserRating}/10</span>
                        </div>
                    </div>

                    <div className="edit-field">
                        <label>Watched</label>
                        <Switch
                            checked={editWatched}
                            onChange={setEditWatched}
                            checkedChildren="Yes"
                            unCheckedChildren="No"
                        />
                    </div>

                    <div className="edit-field">
                        <label>Recommend?</label>
                        <Radio.Group
                            value={editRecommended}
                            onChange={(e) => setEditRecommended(e.target.value)}
                        >
                            <Radio value={true} style={{ color: '#fff' }}>Yes</Radio>
                            <Radio value={false} style={{ color: '#fff' }}>No</Radio>
                            <Radio value={null} style={{ color: '#fff' }}>No Opinion</Radio>
                        </Radio.Group>
                    </div>
                </div>
            </Modal>
        </>
    );
}

export default MyList;
