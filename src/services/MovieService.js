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
    const API_URL = `https://soloflix-resource.up.railway.app/graphql?query=%7B${title.title}%7Bmovie%20%7Bid%20title%20description%20video%20image%7D%7D%7D`;
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
  }
  
};

export default MovieService;
