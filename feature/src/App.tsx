import React from 'react';
import * as DevOps from "azure-devops-extension-sdk";
import {
  IWorkItemFormService,
  WorkItemTrackingServiceIds
} from "azure-devops-extension-api/WorkItemTracking";

import './app.scss';

import { Card } from "azure-devops-ui/Card";
import { Button } from "azure-devops-ui/Button";
import { Observer } from "azure-devops-ui/Observer";
import { ObservableValue } from "azure-devops-ui/Core/Observable";
import { Dropdown } from "azure-devops-ui/Dropdown";
import { ButtonGroup } from "azure-devops-ui/ButtonGroup";
import { IListBoxItem } from 'azure-devops-ui/ListBox';
import { Icon } from 'azure-devops-ui/Icon';

import { CreateFeatureBranchAsync, GetRepositoriesAsync } from './services/repository';
import { CreateBuildDefinitionAsync, RunBuildAsync } from './services/pipeline';

interface IAppState {
  repository: string;
}

class App extends React.Component<{}, IAppState>  {

  workItemFormService = DevOps.getService<IWorkItemFormService>(
    WorkItemTrackingServiceIds.WorkItemFormService
  );

  private repositories: Array<IListBoxItem<{}>> = [];
  private isDialogOpen = new ObservableValue<boolean>(false);

  constructor(props: {}) {
    super(props);

    this.state = {
      repository: ""
    }

    this.workItemFormService.then(currentItem => {
      currentItem.getId().then(id => {
        console.log(id)
      });
      currentItem.getFields().then(fields => {
        console.log(fields)
      });
    });

    GetRepositoriesAsync().then(items => {
      items.forEach(element => {
        this.repositories.push({ id: element.name, text: element.name, iconProps: { iconName: "GitLogo", style: { color: "#f05133" } } })
      });
    });
  }

  componentDidMount() {
    DevOps.init();
  }

  isValid(): boolean {
    const { repository } = this.state;

    return (
      repository !== undefined && repository.trim() !== ""
    );
  }

  async create() {
    if (this.state.repository) {
      await CreateFeatureBranchAsync(this.state.repository, 'develop', 'ft#5555');

      var features = ["feature/ft#001", "feature/ft#002"];
      var user = DevOps.getUser();
      var PAT = DevOps.getConfiguration().witInputs["PATField"];

      var buildDef = await CreateBuildDefinitionAsync({
        repositoryId: this.state.repository,
        basedBranch: 'develop',
        releaseBranch: 'release/rc#2525',
        mergeBranches: features,
        user: user,
        PAT: PAT
      });
      await RunBuildAsync(buildDef.id);

      this.isDialogOpen.value = false;
    }
  }

  render(): JSX.Element {

    return (

      <Observer isDialogOpen={this.isDialogOpen}>
        {(props: { isDialogOpen: boolean }) => {
          return props.isDialogOpen ? (
            <div className="branch--content">
              <div className="branch--group">
                <label className="branch--group-label">
                  Repository *
                </label>
                <Dropdown
                  ariaLabel="Basic"
                  placeholder="Select a repository"
                  showPrefix={true}
                  items={this.repositories}
                  onSelect={(event, item) => {
                    console.log(item.id);
                    this.setState({ repository: item.id });
                  }}
                />
              </div>
              <div className="branch--group">
                <span className="fontSize font-size secondary-text flex-row flex-center text-ellipsis">
                  {Icon({
                    className: "icon-margin",
                    iconName: "OpenSource",
                    key: "branch-name",
                  })}
                  develop
                </span>
              </div>

              <div className="branch--add-button">
                <ButtonGroup>
                  <Button
                    text="Cancel"
                    onClick={() => this.isDialogOpen.value = false}
                  />
                  <Button
                    text="Create"
                    primary={true}
                    onClick={() => this.create()}
                    disabled={!this.isValid()}
                  />
                </ButtonGroup>
              </div>
            </div>
          ) : (
            <div>
              <Button
                text="Create"
                subtle={true}
                onClick={() => this.isDialogOpen.value = true}
              />
              <Card>
                There is no branch linked to this item. Click create to link.
              </Card>
            </div>
          );
        }}
      </Observer>











    )
  }
}

export default App;

