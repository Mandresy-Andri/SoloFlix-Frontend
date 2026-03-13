import axios from 'axios';

const API_URL = 'http://localhost:8080/graphql';

const MovieService = {
  async getMovies() {
    const token = localStorage.getItem('access_token');
    const headers = {
      Authorization: `Bearer ${token}`,
    };
    const query = `
    {
        movies {
            title
            description
          director
          image
          video
        }
      }
    `;
    return axios.get(API_URL, { query }, { headers });
  },

  async getCarouselMovies(title) {
    const token = localStorage.getItem('access_token');
    const API_URL = `http://localhost:8080/graphql?query=%7B${title.title}%7Bmovie%20%7Bid%20title%20description%20video%20image%7D%7D%7D`;
    //const API_URL = `https://soloflix-resource.up.railway.app/graphql?query=%7B${title.title}%7Bmovie%20%7Bid%20title%20description%20video%20image%7D%7D%7D`;

    const headers = {
      Authorization: `Bearer ${token}`,
    };

    return axios.get(API_URL);
  },

  async getUser() {
    const token = localStorage.getItem('access_token');
    const headers = {
      Authorization: `Bearer ${token}`,
    };
    const query = `
      {
        users {
             email
             username
             password
        }
      }
    `;
    return axios.get(API_URL, { query });
  },

  async getMyList(email) {
    const query = `
      {
        findMyListByUserEmail(email: "${email}") {
          id
          movie {
            id
            title
            description
            date
            image
            video
            rating
          }
          notes
          userRating
          watched
          recommended
          dateAdded
        }
      }
    `;
    return axios.post(API_URL, { query });
  },

  async addToMyList(email, movieId) {
    const query = `
      mutation {
        addToMyList(userEmail: "${email}", movieId: "${movieId}") {
          id
          movie { id title image }
          watched
          dateAdded
        }
      }
    `;
    return axios.post(API_URL, { query });
  },

  async updateMyListItem(id, updates) {
    const parts = [];
    parts.push(`id: "${id}"`);
    if (updates.notes !== undefined) parts.push(`notes: "${updates.notes.replace(/"/g, '\\"').replace(/\n/g, '\\n')}"`);
    if (updates.userRating !== undefined) parts.push(`userRating: ${updates.userRating}`);
    if (updates.watched !== undefined) parts.push(`watched: ${updates.watched}`);
    if (updates.recommended !== undefined) parts.push(`recommended: ${updates.recommended}`);

    const query = `
      mutation {
        updateMyListItem(${parts.join(', ')}) {
          id
          notes
          userRating
          watched
          recommended
        }
      }
    `;
    return axios.post(API_URL, { query });
  },

  async removeFromMyList(id) {
    const query = `
      mutation {
        removeFromMyList(id: "${id}")
      }
    `;
    return axios.post(API_URL, { query });
  },

  async toggleWatched(id) {
    const query = `
      mutation {
        toggleWatched(id: "${id}") {
          id
          watched
        }
      }
    `;
    return axios.post(API_URL, { query });
  },

  async checkInMyList(email, movieId) {
    const query = `
      {
        findMyListItem(userId: "${email}", movieId: "${movieId}") {
          id
        }
      }
    `;
    return axios.post(API_URL, { query });
  },

  async searchMovies(searchQuery) {
    const query = `
      {
        searchMovies(query: "${searchQuery.replace(/"/g, '\\"')}") {
          id
          reference
          title
          description
          date
          image
          video
          rating
        }
      }
    `;
    return axios.post(API_URL, { query });
  },

  async searchMoviesInDatabase(searchQuery) {
    const query = `
      {
        searchMoviesInDatabase(query: "${searchQuery.replace(/"/g, '\\"')}") {
          id
          title
          description
          date
          image
          video
          rating
        }
      }
    `;
    return axios.post(API_URL, { query });
  },

  async cacheMovie(movieId) {
    const query = `
      mutation {
        cacheMovie(movieId: "${movieId}") {
          id
          title
          description
          date
          image
          video
          rating
        }
      }
    `;
    return axios.post(API_URL, { query });
  }
};

export default MovieService;
