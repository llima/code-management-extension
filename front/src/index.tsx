import ReactDOM from 'react-dom';
import App from './App';
import "./services/registration";

import { SurfaceBackground, SurfaceContext } from "azure-devops-ui/Surface";

ReactDOM.render(
  <SurfaceContext.Provider value={{ background: SurfaceBackground.neutral }}>
    <App />
  </SurfaceContext.Provider>, document.getElementById('root')
);
