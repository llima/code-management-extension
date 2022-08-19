import React from 'react';
import * as DevOps from "azure-devops-extension-sdk";
import {
  IWorkItemFormService,
  WorkItemTrackingServiceIds
} from "azure-devops-extension-api/WorkItemTracking";


import { GitRepository } from 'azure-devops-extension-api/Git';

import './app.scss';

import { Link } from '@fluentui/react/lib/Link';
import { Card } from "azure-devops-ui/Card";
import { Button } from "azure-devops-ui/Button";
import { Dialog } from "azure-devops-ui/Dialog";
import { Observer } from "azure-devops-ui/Observer";
import { ObservableValue } from "azure-devops-ui/Core/Observable";
import { Dropdown } from "azure-devops-ui/Dropdown";
import { dropdownItems } from "./services/data";
import { DropdownSelection } from "azure-devops-ui/Utilities/DropdownSelection";

import { CreateFeatureBranchAsync, GetRepositoriesAsync } from './services/repository';
import { IListBoxItem } from 'azure-devops-ui/ListBox';


interface IAppState {
  page: string;
}

class App extends React.Component<{}, IAppState>  {
  
  workItemFormService = DevOps.getService<IWorkItemFormService>(
    WorkItemTrackingServiceIds.WorkItemFormService
  );

  private repositories: Array<IListBoxItem<{}>> = [];
  private selection = new DropdownSelection();
  private isDialogOpen = new ObservableValue<boolean>(false);

  constructor(props: {}) {
    super(props);
    this.selection.select(0);

    GetRepositoriesAsync().then(items => {
      items.forEach(element => {
        this.repositories.push({id: element.name, text: element.name, iconProps: { iconName: "GitLogo", style: { color: "#f05133" } }})
      });
    });
  }

  componentDidMount() {
    DevOps.init();
  }

  async create() {
    console.log(this.selection)
    //await CreateFeatureBranchAsync('Eleven.Tools.K8S', 'develop', 'ft#5555');
    this.isDialogOpen.value = false;
  }

  render(): JSX.Element {

    const onDismiss = () => {
      this.isDialogOpen.value = false;
    };

    return (
      <div>
        <Button
          text="Create"
          subtle={true}
          onClick={() => this.isDialogOpen.value = true}
        />
        <Card className="flex-grow">
          <p>Não existe uma branch vinculada a esse item, You can also    </p> <Link
            className="scroll-hidden flex-row flex-baseline branch-link monospaced-text bolt-link subtle"
            excludeTabStop
            target="_blank"
          >
            develop
          </Link> <p>to get started.</p>
        </Card>

        <Observer isDialogOpen={this.isDialogOpen}>
          {(props: { isDialogOpen: boolean }) => {
            return props.isDialogOpen ? (
              <Observer isDialogOpen={this.isDialogOpen}>
                {(props: { isDialogOpen: boolean }) => {
                  return props.isDialogOpen ? (
                    <Dialog
                      titleProps={{ text: "Create a branch" }}
                      footerButtonProps={[
                        {
                          text: "Cancel",
                          onClick: onDismiss
                        },
                        {
                          text: "Create",
                          onClick: () => {this.create()},
                          primary: true
                        }
                      ]}
                      onDismiss={onDismiss} >

                      <div className="branch--content">
                        <div className="branch--group flex-column">
                          <label className="bolt-textfield-label" >Repository *</label>
                          <Dropdown
                            ariaLabel="Single select"
                            className="example-dropdown"
                            placeholder="Select an Option"
                            showPrefix={true}
                            items={this.repositories}
                            selection={this.selection}
                          />
                        </div>
                      </div>

                      You have modified this work item. You can save your changes, discard
                      your changes, or cancel to continue editing.
                    </Dialog>
                  ) : null;
                }}
              </Observer>
            ) : null;
          }}
        </Observer>

      </div>
    )
  }
}

export default App;

