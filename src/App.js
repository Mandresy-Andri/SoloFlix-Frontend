import './App.css';
import {BrowserRouter as Router, Routes, Route} from 'react-router-dom';
import MainPage from './components/MainPage'
import MyList from './components/MyList';
import Login from './components/Login';

function App() {
  return (
    <div style={{
      backgroundColor: 'black'}}>
    <Router>
    <Routes>
    <Route path='/login' exact element={<Login/>}/>
    <Route path='/' exact element={<MainPage/>}/>
    <Route path='/mylist' exact element={<MyList/>}/>
    </Routes>
  </Router>
  </div>
  );
}

export default App;
