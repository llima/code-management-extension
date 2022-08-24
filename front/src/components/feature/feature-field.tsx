import React from 'react';
import * as DevOps from "azure-devops-extension-sdk";
import {
  IWorkItemFormService,
  WorkItemTrackingServiceIds
} from "azure-devops-extension-api/WorkItemTracking";

import './feature-field.scss';

import { Card } from "azure-devops-ui/Card";
import { Button } from "azure-devops-ui/Button";
import { Observer } from "azure-devops-ui/Observer";
import { ObservableValue } from "azure-devops-ui/Core/Observable";
import { Dropdown } from "azure-devops-ui/Dropdown";
import { ButtonGroup } from "azure-devops-ui/ButtonGroup";
import { IListBoxItem } from 'azure-devops-ui/ListBox';
import { Icon } from 'azure-devops-ui/Icon';
import { CreateFeatureBranchAsync, GetRepositoriesAsync } from '../../services/repository';
import { Transform } from '../../services/string';
import { Services } from '../../services/services';
import { BranchServiceId, IBranchService } from '../../services/branch';



class Feature extends React.Component<{}, {}>  {

  workItemFormService = DevOps.getService<IWorkItemFormService>(WorkItemTrackingServiceIds.WorkItemFormService);
  branchService = Services.getService<IBranchService>(BranchServiceId);

  private repositories: Array<IListBoxItem<{}>> = [];
  private viewType = new ObservableValue<number>(0); // 0 - NODATA | 1 - CREATE | 2 - LOADED

  private branchName: string = "";
  private repository: string = "";

  constructor(props: {}) {
    super(props);

    this.state = {
      repository: ""
    }

    GetRepositoriesAsync().then(items => {
      items.forEach(element => {
        this.repositories.push({ id: element.name, text: element.name, iconProps: { iconName: "GitLogo", style: { color: "#f05133" } } })
      });
    });

    this.workItemFormService.then(currentItem => {
      currentItem.getFieldValues(["System.Title", "System.Id", "System.WorkItemType"]).then(value => {
        var name = Transform(value["System.Title"].toString());
        this.branchName = `ft#${value["System.Id"]}-${name}`;
      });
    });
  }

  async create() {
    await CreateFeatureBranchAsync(this.repository, 'develop', this.branchName);
    this.viewType.value = 2;
  }

  render(): JSX.Element {

    return (

      <Observer viewType={this.viewType}>
        {(props: { viewType: number }) => {

          switch (props.viewType) {
            case 1: // CREATE
              return (
                <div className="feature--content">
                  <div className="feature--group">
                    <label className="feature--group-label">
                      Repository *
                    </label>
                    <Dropdown
                      ariaLabel="Basic"
                      placeholder="Select a repository"
                      showPrefix={true}
                      items={this.repositories}
                      onSelect={(event, item) => {
                        this.repository = item.id;
                      }}
                    />
                  </div>
                  <div className="feature--group">
                    <span className="fontSize font-size secondary-text flex-row flex-center text-ellipsis">
                      {Icon({
                        className: "icon-margin",
                        iconName: "OpenSource",
                        key: "feature-name",
                      })}
                      featute/{this.branchName}
                    </span>
                  </div>

                  <div className="feature--add-button">
                    <ButtonGroup>
                      <Button
                        text="Cancel"
                        onClick={() => this.viewType.value = 0}
                      />
                      <Button
                        text="Create"
                        primary={true}
                        onClick={() => this.create()}
                        disabled={!(this.repository !== undefined && this.repository.trim() !== "")}
                      />
                    </ButtonGroup>
                  </div>
                </div>
              );
            case 2: // LOADED
              return (<div>
                asd
              </div>)
            default:
              return (<div>
                <Button
                  text="Create"
                  subtle={true}
                  onClick={() => this.viewType.value = 0}
                />
                <Card>
                  There is no branch linked to this item. Click create to link.
                </Card>
              </div>)
          }

        }
        }
      </Observer >

    )
  }
}

export default Feature;

