import { useNavigate } from 'react-router-dom';
import { useEffect, useState } from "react";
import NavigationBar from '../components/NavigationBar'

function MyList() {
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
            <>
            <div><NavigationBar/></div>
            <div className="bg-dark p-5 rounded-lg m-3 text-white font-face-ad">
                <h1 className="display-4">Here I put a list of saved movies</h1>
                <p className="lead">Still in construction</p>
            </div>
            </>
        );
    
}

export default MyList;