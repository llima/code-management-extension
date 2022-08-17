import React from 'react';
import * as DevOps from "azure-devops-extension-sdk";
import {
  IWorkItemFormService,
  WorkItemTrackingServiceIds
} from "azure-devops-extension-api/WorkItemTracking";
import { ZeroData, ZeroDataActionType } from "azure-devops-ui/ZeroData";
import { CreateFeatureBranchAsync, GetRepositoriesAsync } from './services/repository';
import { GitRepository } from 'azure-devops-extension-api/Git';


interface IAppState {
  page: string;
}

class App extends React.Component<{}, IAppState>  {

  repositories: GitRepository[] = [];

  workItemFormService = DevOps.getService<IWorkItemFormService>(
    WorkItemTrackingServiceIds.WorkItemFormService
  );

  constructor(props: {}) {
    super(props);
  }

  componentDidMount() {
    DevOps.init();    
  }

  async createBranch() {
    console.log('Create Repos');

    this.repositories = await GetRepositoriesAsync();
    console.log(this.repositories);

    await CreateFeatureBranchAsync('Eleven.Tools.K8S', 'develop', 'ft#5555');
  }

  render(): JSX.Element {
    return (
      <div>       
                
        <ZeroData
          primaryText="This is the primary text"
          secondaryText={
            <span>
              This secondary text contains a{" "}
              <a
                rel="nofollow noopener"
                target="_blank"
                href="https://bing.com"
                aria-label="link to bing.com"
              >
                link
              </a>{" "}
              to somewhere else. Lorem ipsum dolor sit amet, consectetur adipiscing
              elit.
            </span>
          }
          imageAltText="Bars"
          actionText="Create Branch"
          actionType={ZeroDataActionType.ctaButton}
          onActionClick={(event, item) => {
              this.createBranch();
              alert("Hey, you clicked the button for " + item!.primaryText)
            }
          }
        />
      </div>
    )
  }
}

export default App;

