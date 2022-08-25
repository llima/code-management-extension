import React from 'react';
import * as DevOps from "azure-devops-extension-sdk";

import './app.scss';
import Feature from './components/feature/feature-field';
import Hotfix from './components/hotfix/hotfix-field';
import Release from './components/release/release-field';

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
      case "hotfix":
        return (<Hotfix />);
      case "release":
        return (<Release />);
      default:
        return null;
    }
  }
}

export default App;

