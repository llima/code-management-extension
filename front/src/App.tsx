import React from 'react';
import * as DevOps from "azure-devops-extension-sdk";

import './app.scss';
import Feature from './components/feature/feature-field';

interface IAppState {
  type: string;
}

class App extends React.Component<{}, IAppState>  {

  constructor(props: {}) {
    super(props);

    this.state = { type: "feature" }

    DevOps.init().then(() => {
      this.setState({ type: (DevOps.getConfiguration().witInputs["TypeField"] ?? "feature").toLowerCase() });
    });
  }

  render() {
    const { type } = this.state;
    switch (type) {
      case "feature":
        return (<Feature />);
      case "hotfix ->":
        return (<Feature />);
      case "release":
        return (<Feature />);
      default:
        return null;
    }
  }
}

export default App;

