import * as React from "react";
import * as SDK from "azure-devops-extension-sdk";
import { FilterBar } from "azure-devops-ui/FilterBar";
import { KeywordFilterBarItem } from "azure-devops-ui/TextFilterBarItem";
import {
  Filter,
  FILTER_CHANGE_EVENT,
  FilterOperatorType,
  IFilterState,
} from "azure-devops-ui/Utilities/Filter";
import { DropdownMultiSelection } from "azure-devops-ui/Utilities/DropdownSelection";
import { DropdownFilterBarItem } from "azure-devops-ui/Dropdown";
import { ObservableArray } from "azure-devops-ui/Core/Observable";
import { TagItem, UsedProjectTags } from "../Components/ProjectTagPicker";
import {
  CommonServiceIds,
  IExtensionDataManager,
  IExtensionDataService,
  IGlobalMessagesService,
} from "azure-devops-extension-api";
import { IListBoxItem } from "azure-devops-ui/ListBox";
import { Button } from "azure-devops-ui/Button";

interface IProjectFilterProps {
  onFilterChanged(
    newState: IFilterState,
    userTags: TagItem[],
    orgTags: TagItem[],
  ): void;
}

export const PROJECT_FILTER_USERTAGS = "listUserTags";
export const PROJECT_FILTER_ORGTAGS = "listOrgTags";
export const PROJECT_FILTER_PROJECTNAME = "ProjectName";

export default class ProjectFilter extends React.Component<IProjectFilterProps> {
  private _dataManager?: IExtensionDataManager;
  private filter: Filter;
  private selectionUserTagsList = new DropdownMultiSelection();
  private selectionOrgTagsList = new DropdownMultiSelection();
  private userTagsForFilter = new ObservableArray<IListBoxItem<TagItem>>();
  private orgTagsForFilter = new ObservableArray<IListBoxItem<TagItem>>();
  private userTagsFromStorage: TagItem[] = [];
  private orgTagsFromStorage: TagItem[] = [];

  constructor(props: IProjectFilterProps) {
    super(props);
    this.state = {
      loading: true,
    };
    this.filter = new Filter();
    this.filter.setFilterItemState(PROJECT_FILTER_USERTAGS, {
      value: [],
      operator: FilterOperatorType.and,
    });
    this.filter.setFilterItemState(PROJECT_FILTER_ORGTAGS, {
      value: [],
      operator: FilterOperatorType.and,
    });
    this.filter.subscribe(() => {
      if (props.onFilterChanged)
        props.onFilterChanged(
          this.filter.getState(),
          this.userTagsFromStorage,
          this.orgTagsFromStorage,
        );
    }, FILTER_CHANGE_EVENT);
  }

  public async componentDidMount() {
    this.initializeState();
  }

  private async initializeState(): Promise<void> {
    await SDK.ready();
    const accessToken = await SDK.getAccessToken();
    const extDataService = await SDK.getService<IExtensionDataService>(
      CommonServiceIds.ExtensionDataService,
    );
    this._dataManager = await extDataService.getExtensionDataManager(
      SDK.getExtensionContext().id,
      accessToken,
    );

    try {
      const userTags: UsedProjectTags = await this._dataManager.getDocument(
        "ProjectTags",
        "Tags",
        {
          scopeType: "User",
        },
      );
      this.userTagsFromStorage = userTags.tags;
      this.userTagsForFilter.removeAll();
      for (let tag of userTags.tags) {
        this.userTagsForFilter.push({ id: tag.text, text: tag.text });
      }
    } catch (error) {}

    try {
      const orgTags: UsedProjectTags = await this._dataManager.getDocument(
        "ProjectTags",
        "Tags",
        {
          scopeType: "Default",
        },
      );
      this.orgTagsFromStorage = orgTags.tags;
      this.orgTagsForFilter.removeAll();
      for (let tag of orgTags.tags) {
        this.orgTagsForFilter.push({ id: tag.text, text: tag.text });
      }
    } catch (error) {}

    try {
      this._dataManager
        .getValue<string>("projectFilter", { scopeType: "User" })
        .then((f) => f && this.filter.setState(JSON.parse(f)));
    } catch (error) {}
  }

  private saveFilter = () => {
    this._dataManager
      ?.setValue(
        "projectFilter",
        JSON.stringify(this.filter.getState(), null, undefined),
        { scopeType: "User" },
      )
      .then((_) =>
        SDK.getService<IGlobalMessagesService>(
          CommonServiceIds.GlobalMessagesService,
        ).then((globalMessagesSvc) =>
          globalMessagesSvc.addToast({
            duration: 2000,
            message: "Filter saved",
          }),
        ),
      );
  };

  public render() {
    return (
      <div className="flex flex-row flex-grow">
        <div className="flex-grow">
          <FilterBar filter={this.filter}>
            <KeywordFilterBarItem
              filterItemKey={PROJECT_FILTER_PROJECTNAME}
              placeholder="Filter by project name"
            />

            <DropdownFilterBarItem
              filterItemKey={PROJECT_FILTER_USERTAGS}
              filter={this.filter}
              items={this.userTagsForFilter}
              selection={this.selectionUserTagsList}
              placeholder="Your Tags"
            />

            <DropdownFilterBarItem
              filterItemKey={PROJECT_FILTER_ORGTAGS}
              filter={this.filter}
              items={this.orgTagsForFilter}
              selection={this.selectionOrgTagsList}
              placeholder="Organization Tags"
            />
          </FilterBar>
        </div>
        <Button
          style={{ marginLeft: "10px", marginTop: "8px", marginBottom: "8px" }}
          text="Save filter"
          primary={true}
          onClick={() => this.saveFilter()}
        />
      </div>
    );
  }
}
