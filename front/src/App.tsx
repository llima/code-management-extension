import React from 'react';
import * as DevOps from "azure-devops-extension-sdk";

import './app.scss';
import Feature from './components/feature/feature-field';

class App extends React.Component<{}, {}>  {

  private type: string = "";

  constructor(props: {}) {
    super(props);

    DevOps.init();
    
    this.type = (DevOps.getConfiguration().witInputs["TypeField"] ?? "feature").toLowerCase();
  }

  render() {

    switch (this.type) {
      case "feature":
        return (<Feature />);
      case "hotfix":
        return (<Feature />);
      case "release":
        return (<Feature />);
      default:
        return null;
    }
  }
}

export default App;

