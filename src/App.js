import logo from './logo.svg';
import './App.css';
import { changeColor } from './main';

function App() {
  useEffect(() => {
    changeColor();
  }, []);
  return (
    <div className="App">
      
    </div>
  );
}

export default App;
